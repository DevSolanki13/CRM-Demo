import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createLead, updateLead } from '../backend/services/leadService.js';

const leadIds = [];

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: { in: leadIds } } });
  await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
});

describe('recurring lead persistence', () => {
  it('creates a name-only lead, edits its details, and moves it without losing data', async () => {
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
    expect(created.nextRecurrenceDate).toBe('2027-01-01');

    const edited = await updateLead(id, {
      companyName: 'A one Associates',
      contactEmail: 'info@example.com',
      recurrenceDate: '2027-01-31',
      recurrenceFrequency: 'monthly',
      status: '',
      source: '',
      notes: 'Contact details confirmed',
      nextFollowUpDate: '2027-02-10',
    });
    expect(edited.companyName).toBe('A one Associates');
    expect(edited.nextRecurrenceDate).toBe('2027-02-28');
    expect(edited.notes).toBe('Contact details confirmed');
    expect(edited.status).toBeNull();
    expect(edited.source).toBeNull();

    const regular = await updateLead(id, { isRecurring: false });
    expect(regular.isRecurring).toBe(false);
    expect(regular.recurrenceDate).toBeNull();
    expect(regular.companyName).toBe('A one Associates');
    expect(regular.nextFollowUpDate).toBe('2027-02-10');
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
