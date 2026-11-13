import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createLead, updateLead } from '../backend/services/leadService.js';

const leadIds = [];

afterAll(async () => {
  await prisma.leadRecurrenceCycle.deleteMany({ where: { leadId: { in: leadIds } } });
  await prisma.task.deleteMany({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: leadIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
});

describe('recurring lead persistence', () => {
  it('creates a name-only lead and preserves its open cycle and details during editing', async () => {
    const id = `ld-recurrence-${randomUUID()}`;
    leadIds.push(id);

    const created = await createLead({
      id,
      title: '101',
      isRecurring: true,
      recurrenceDate: '2026-12-01',
      recurrenceFrequency: 'monthly',
    });

    expect(created.title).toBe('101');
    expect(created.contactName).toBeNull();
    expect(created.companyName).toBeNull();
    expect(created.source).toBeNull();
    expect(created.isOutbound).toBeNull();
    expect(created.status).toBeNull();
    expect(created.ownerId).toBeNull();
    expect(created.nextRecurrenceDate).toBe('2026-12-01');

    const edited = await updateLead(id, {
      companyName: 'A one Associates',
      contactEmail: 'info@example.com',
      recurrenceFrequency: 'monthly',
      status: '',
      source: '',
      notes: 'Contact details confirmed',
    });
    expect(edited.companyName).toBe('A one Associates');
    expect(edited.nextRecurrenceDate).toBe('2026-12-01');
    expect(edited.notes).toBe('Contact details confirmed');
    expect(edited.status).toBeNull();
    expect(edited.source).toBeNull();

    await expect(updateLead(id, { isRecurring: false })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('requires an interval for custom recurrence without writing a record', async () => {
    await expect(createLead({
      id: `ld-invalid-recurrence-${randomUUID()}`,
      title: 'Custom recurrence',
      isRecurring: true,
      recurrenceFrequency: 'custom',
    })).rejects.toMatchObject({ statusCode: 400 });
  });
});
