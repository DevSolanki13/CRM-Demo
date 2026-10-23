import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { createLead, updateLead } from '../backend/services/leadService.js';
import { createDeal, updateDeal } from '../backend/services/dealService.js';
import { ensureRebuyDeal } from '../backend/services/renewalService.js';

describe('database-backed custom fields', () => {
  it('persists lead and deal fields through updates and a repeat-order opportunity', async () => {
    const suffix = randomUUID();
    const leadId = `ld-fields-${suffix}`;
    const dealId = `dl-fields-${suffix}`;
    const ids = [leadId, dealId];
    try {
      const lead = await createLead({
        id: leadId, title: `Custom field lead ${suffix}`,
        customFields: { segment: 'Manufacturing', qualified: false }
      });
      expect(lead.customFields).toEqual({ segment: 'Manufacturing', qualified: false });
      await expect(updateLead(leadId, { unsupportedField: 'x' }))
        .rejects.toMatchObject({ statusCode: 400 });
      const editedLead = await updateLead(leadId, {
        customFields: { segment: 'Healthcare', qualified: true }
      });
      expect(editedLead.customFields).toEqual({ segment: 'Healthcare', qualified: true });

      const deal = await createDeal({
        id: dealId, leadId, title: `Custom field deal ${suffix}`, value: 0,
        customFields: { contractType: 'Annual', units: 0 }
      });
      expect(deal.value).toBe(0);
      expect(deal.customFields).toEqual({ contractType: 'Annual', units: 0 });
      await expect(updateDeal(dealId, { unsupportedField: 'x' }))
        .rejects.toMatchObject({ statusCode: 400 });
      const editedDeal = await updateDeal(dealId, {
        customFields: { contractType: 'Repeat', units: 12 }
      });
      expect(editedDeal.customFields).toEqual({ contractType: 'Repeat', units: 12 });
      expect((await prisma.deal.findUnique({ where: { id: dealId } })).customFields)
        .toEqual({ contractType: 'Repeat', units: 12 });

      await prisma.deal.update({ where: { id: dealId }, data: {
        stageId: 'stg-6', stageName: 'Closed Won', status: 'Won',
        isRecurring: true, recurrenceDays: 30, actualCloseDate: '2020-01-01'
      } });
      const rebuy = await ensureRebuyDeal(dealId);
      expect(rebuy.created).toBe(true);
      expect(rebuy.deal.customFields).toEqual({ contractType: 'Repeat', units: 12 });
      ids.push(rebuy.deal.id);
    } finally {
      const children = await prisma.deal.findMany({ where: { parentDealId: dealId }, select: { id: true } });
      const cleanupIds = [...new Set([...ids, ...children.map(child => child.id)])];
      await prisma.task.deleteMany({ where: { linkedId: { in: cleanupIds } } });
      await prisma.activity.deleteMany({ where: { linkedId: { in: cleanupIds } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupIds } } });
      await prisma.deal.deleteMany({ where: { id: { in: cleanupIds } } });
      await prisma.lead.deleteMany({ where: { id: leadId } });
    }
  }, 30000);
});
