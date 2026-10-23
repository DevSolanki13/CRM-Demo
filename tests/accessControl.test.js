import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createApp } from '../backend/app.js';
import { prisma } from '../backend/prisma.js';
import { hashPassword } from '../backend/auth/passwords.js';

// Real HTTP and PostgreSQL: exercise the mounted routes, not a mocked guard.
describe('Session authentication and CRM permissions', () => {
  const prefix = `access-${randomUUID()}`;
  const password = randomBytes(24).toString('hex');
  const userIds = ['admin', 'rep', 'other', 'manager'].map(role => `${prefix}-${role}`);
  const [adminId, repId, otherId, managerId] = userIds;
  const leadIds = [0, 1].map(n => `${prefix}-lead-${n}`);
  const companyId = `${prefix}-company`;
  const dealId = `${prefix}-deal`;
  const contactId = `${prefix}-contact`;
  let origin, server, repCookie, adminCookie;

  async function request(path, { cookie, body, method = 'GET', headers = {} } = {}) {
    const res = await fetch(`${origin}/api${path}`, {
      method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, data: res.status === 204 ? null : await res.json(), cookie: res.headers.get('set-cookie') };
  }
  const signIn = email => request('/auth/login', { method: 'POST', body: { email, password } });

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    for (const [i, role] of ['Admin', 'Sales Rep', 'Sales Rep', 'Manager'].entries()) {
      await prisma.user.create({ data: { id: userIds[i], email: `${userIds[i]}@example.test`, name: userIds[i], role, active: true, passwordHash } });
    }
    for (const [i, ownerId] of [repId, otherId].entries()) await prisma.lead.create({ data: { id: leadIds[i], title: 'Private opportunity', ownerId, ownerName: ownerId } });
    await prisma.company.create({ data: { id: companyId, name: 'Shared customer', ownerId: repId } });
    await prisma.contact.create({ data: { id: contactId, name: 'Other rep contact', companyId, ownerId: otherId } });
    await prisma.deal.create({ data: { id: dealId, title: 'Other rep deal', companyId, ownerId: otherId, stageId: 'stg-1', stageName: 'New Lead' } });
    await prisma.activity.create({ data: { id: `${prefix}-activity`, description: 'Private deal details', type: 'Call', linkedType: 'Deal', linkedId: dealId } });
    server = createApp().listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    repCookie = (await signIn(`${repId}@example.test`)).cookie.split(';')[0];
    adminCookie = (await signIn(`${adminId}@example.test`)).cookie.split(';')[0];
  });

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    const ownedEntities = [...await prisma.lead.findMany({ where: { ownerId: { in: userIds } }, select: { id: true } }), ...await prisma.deal.findMany({ where: { ownerId: { in: userIds } }, select: { id: true } })].map(row => row.id);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.task.deleteMany({ where: { OR: [{ ownerId: { in: userIds } }, { linkedId: { startsWith: prefix } }, { linkedId: { in: ownedEntities } }] } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { startsWith: prefix } }] } });
    await prisma.note.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.activity.deleteMany({ where: { OR: [{ id: { startsWith: prefix } }, { authorId: { in: userIds } }] } });
    await prisma.stageGateCheck.deleteMany({ where: { submittedBy: { in: userIds } } });
    await prisma.deal.deleteMany({ where: { OR: [{ id: dealId }, { ownerId: { in: userIds } }] } });
    await prisma.contact.deleteMany({ where: { OR: [{ id: contactId }, { ownerId: { in: userIds } }] } });
    await prisma.company.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.lead.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('rejects anonymous reads and writes throughout the CRM', async () => {
    for (const path of ['/state', '/leads', '/deals', '/companies', '/contacts', '/tasks', '/notes', '/activities', '/users', '/audit-logs', '/stage-gate-checks', '/timeline?entityType=Lead&entityId=anything', '/settings/automation-rules']) {
      expect((await request(path)).status, path).toBe(401);
    }
    expect((await request('/leads', { method: 'POST', body: { title: 'Anonymous' } })).status).toBe(401);
    expect((await request('/health')).status).toBe(200);
  });

  it('stores only session token hashes and sets an HttpOnly SameSite cookie', async () => {
    const login = await signIn(`${managerId}@example.test`);
    expect(login.cookie).toContain('HttpOnly');
    expect(login.cookie).toContain('SameSite=Strict');
    expect(login.cookie).toContain('Path=/api');
    expect(login.data.user).not.toHaveProperty('passwordHash');
    const token = login.cookie.split(';')[0].split('=')[1];
    const session = await prisma.session.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
    expect(session.userId).toBe(managerId);
    expect(await prisma.session.findUnique({ where: { tokenHash: token } })).toBeNull();
    const me = await request('/auth/me', { cookie: login.cookie });
    expect(me.data.user.role).toBe('Manager');
  });

  it('denies forged roles for users, settings, approvals, and renewal jobs', async () => {
    for (const [path, method] of [['/users', 'POST'], ['/branding', 'PUT'], ['/stages', 'POST'], ['/state/reset', 'POST'], ['/settings/automation-rules', 'PUT'], ['/deals/check-renewals', 'POST'], ['/stage-gate-checks/fake/approve', 'POST'], ['/stage-gate-checks/fake/reject', 'POST']]) {
      const result = await request(path, { method, cookie: repCookie, body: { user: { id: adminId, role: 'Admin' }, reviewer: { id: adminId, role: 'Admin' } } });
      expect(result.status, path).toBe(403);
    }
  });

  it('scopes state, list endpoints, foreign writes, and timelines to the signed-in rep', async () => {
    const result = await request('/state', { cookie: repCookie });
    expect(result.status).toBe(200);
    expect(result.data.leads.map(row => row.id)).toContain(leadIds[0]);
    expect(result.data.leads.map(row => row.id)).not.toContain(leadIds[1]);
    expect(result.data.deals.map(row => row.id)).not.toContain(dealId);
    expect(JSON.stringify(result.data)).not.toContain('passwordHash');
    const list = await request('/leads', { cookie: repCookie });
    expect(list.data.every(row => row.ownerId === repId)).toBe(true);
    expect((await request(`/leads/${leadIds[1]}`, { method: 'PUT', cookie: repCookie, body: { title: 'Stolen' } })).status).toBe(404);
    expect((await request(`/timeline?entityType=Lead&entityId=${leadIds[1]}`, { cookie: repCookie })).status).toBe(404);
    const timeline = await request(`/timeline?entityType=Company&entityId=${companyId}`, { cookie: repCookie });
    expect(timeline.status).toBe(200);
    expect(timeline.data.some(item => item.description === 'Private deal details')).toBe(false);
  });

  it('binds ownership and audit actor to the session and cannot overwrite a supplied ID', async () => {
    const created = await request('/leads', { method: 'POST', cookie: repCookie, body: { id: leadIds[1], title: 'Verified creator', ownerId: otherId, ownerName: 'Forged', actorId: adminId } });
    expect(created.status).toBe(201);
    expect(created.data.id).not.toBe(leadIds[1]);
    expect(created.data.ownerId).toBe(repId);
    expect(created.data.ownerName).toBe(repId);
    const audit = await prisma.auditLog.findFirst({ where: { entityId: created.data.id, action: 'LEAD_CREATED' } });
    expect(audit.actorId).toBe(repId);
    expect((await prisma.lead.findUnique({ where: { id: leadIds[1] } })).title).toBe('Private opportunity');
  });

  it('rejects cross-owner references and forged imported owner assignments', async () => {
    expect((await request('/activities', { method: 'POST', cookie: repCookie, body: { linkedType: 'Deal', linkedId: dealId, description: 'Forged event' } })).status).toBe(404);
    const result = await request('/import/contacts', { method: 'POST', cookie: repCookie, body: { items: [{ id: contactId, name: 'Imported', ownerId: otherId, companyId }] } });
    expect(result.status).toBe(201);
    expect(result.data.contacts[0].ownerId).toBe(repId);
    expect(result.data.contacts[0].id).not.toBe(contactId);
    expect((await prisma.contact.findUnique({ where: { id: contactId } })).name).toBe('Other rep contact');
  });

  it('returns structured validation errors and preserves zero-valued deals', async () => {
    const invalid = await request('/deals', { method: 'POST', cookie: repCookie, body: { value: -1 } });
    expect(invalid.status).toBe(400);
    expect(invalid.data.details.some(issue => issue.field === 'title')).toBe(true);
    expect(invalid.data.details.some(issue => issue.field === 'value')).toBe(true);
    const zero = await request('/deals', { method: 'POST', cookie: repCookie, body: { title: 'Zero value', value: 0 } });
    expect(zero.status).toBe(201);
    expect(zero.data.value).toBe(0);
    expect(zero.data.valueHistory[0].value).toBe(0);
  });

  it('rejects generic stage updates and uses session roles for canonical transitions', async () => {
    const created = await request('/deals', { method: 'POST', cookie: repCookie, body: { title: 'Controlled transition', value: 25 } });
    const id = created.data.id;
    const bypass = await request(`/deals/${id}`, { method: 'PUT', cookie: repCookie, body: { stageId: 'stg-6', stageName: 'Closed Won', status: 'Won' } });
    expect(bypass.status).toBe(409);
    expect((await prisma.deal.findUnique({ where: { id } })).stageId).toBe('stg-1');
    const edit = await request(`/deals/${id}`, { method: 'PUT', cookie: repCookie, body: { title: 'Changed title' } });
    expect(edit.status).toBe(200);
    expect(edit.data.value).toBe(25);
    expect(edit.data.ownerId).toBe(repId);
    const transition = await request(`/deals/${id}/stage-transition`, { method: 'POST', cookie: repCookie, body: { targetStageId: 'stg-2', user: { id: adminId, role: 'Admin' } } });
    expect(transition.status).toBe(200);
    expect(transition.data.requiresApproval).toBe(true);
    const deal = await prisma.deal.findUnique({ where: { id } });
    expect(deal.stageId).toBe('stg-1');
    expect(deal.pendingGateCheck.submittedBy).toBe(repId);
    const creationBypass = await request('/deals', { method: 'POST', cookie: repCookie, body: { title: 'Pre-won', stageId: 'stg-6', status: 'Won' } });
    expect(creationBypass.status).toBe(409);
  });

  it('normalizes legacy task completion status', async () => {
    const created = await request('/tasks', { method: 'POST', cookie: repCookie, body: { title: 'Completion consistency' } });
    expect(created.status).toBe(201);
    const updated = await request(`/tasks/${created.data.id}`, { method: 'PUT', cookie: repCookie, body: { status: 'done' } });
    expect(updated.status).toBe(200);
    expect(updated.data.status).toBe('completed');
    const list = await request('/tasks', { cookie: repCookie });
    expect(list.data.find(row => row.id === created.data.id).status).toBe('completed');
  });

  it('preserves failed-gate lost routing and mandatory backward-movement reasons', async () => {
    const created = await request('/deals', { method: 'POST', cookie: repCookie, body: { title: 'Failed qualification' } });
    const lost = await request('/stage-gate-checks', { method: 'POST', cookie: repCookie, body: { dealId: created.data.id, targetStageId: 'stg-2', answers: { budget: false }, outcome: 'lost', lostReason: 'Budget mismatch', note: 'Customer declined' } });
    expect(lost.status).toBe(201);
    expect(lost.data.deal.status).toBe('Lost');
    expect(lost.data.deal.lostReasonNote).toBe('Customer declined');
    const next = await request('/deals', { method: 'POST', cookie: repCookie, body: { title: 'Backward qualification' } });
    const forward = await request(`/deals/${next.data.id}/stage-transition`, { method: 'POST', cookie: adminCookie, body: { targetStageId: 'stg-2' } });
    expect(forward.status).toBe(200);
    const backward = await request('/stage-gate-checks', { method: 'POST', cookie: repCookie, body: { dealId: next.data.id, targetStageId: 'stg-1', outcome: 'demoted', backwardReason: 'Customer requested requalification' } });
    expect(backward.status).toBe(201);
    expect(backward.data.deal.stageId).toBe('stg-1');
  });

  it('requires same-origin JSON writes, including login', async () => {
    expect((await request('/auth/login', { method: 'POST', body: { email: 'x', password }, headers: { Origin: 'https://attacker.example' } })).status).toBe(403);
    expect((await request('/auth/logout', { method: 'POST', cookie: repCookie, body: {}, headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
    expect((await request('/leads', { method: 'POST', cookie: repCookie, body: { title: 'Cross-site' }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
  });

  it('revokes sessions on logout and rejects inactive users and expired sessions', async () => {
    let signed = await signIn(`${otherId}@example.test`);
    let cookie = signed.cookie.split(';')[0];
    expect((await request('/auth/logout', { method: 'POST', cookie, body: {} })).status).toBe(204);
    expect((await request('/auth/me', { cookie })).status).toBe(401);
    signed = await signIn(`${otherId}@example.test`);
    cookie = signed.cookie.split(';')[0];
    await prisma.session.updateMany({ where: { userId: otherId }, data: { expiresAt: new Date(0) } });
    expect((await request('/auth/me', { cookie })).status).toBe(401);
    signed = await signIn(`${otherId}@example.test`);
    cookie = signed.cookie.split(';')[0];
    await prisma.user.update({ where: { id: otherId }, data: { active: false } });
    expect((await request('/auth/me', { cookie })).status).toBe(401);
    expect((await signIn(`${otherId}@example.test`)).status).toBe(401);
    await prisma.user.update({ where: { id: otherId }, data: { active: true } });
  });

  it('allows only an admin to provision passwords and revokes sessions when passwords change', async () => {
    const updated = await request(`/users/${repId}`, { method: 'PUT', cookie: adminCookie, body: { password: randomBytes(24).toString('hex') } });
    expect(updated.status).toBe(200);
    expect(updated.data).not.toHaveProperty('passwordHash');
    expect(updated.data).not.toHaveProperty('password');
    expect((await request('/auth/me', { cookie: repCookie })).status).toBe(401);
    expect((await signIn(`${repId}@example.test`)).status).toBe(401);
  });
});
