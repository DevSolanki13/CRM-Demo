import { describe, expect, it, vi } from 'vitest';
import { addCalendarDays, nextRenewalDate } from '../backend/services/renewalService.js';
import { stageCode, ALLOWED_TRANSITION_IDS } from '../backend/constants/stageConstants.js';
import { STAGE_CRITERIA } from '../frontend/utils/crmHelpers.js';
import { validateBody, noteSchema, activitySchema, approvalRejectionSchema, approvalRequestSchema, contactImportSchema, closeLostSchema, rebuyRequestSchema, userSchema, leadSchema, dealSchema, updateTaskSchema } from '../backend/middleware/validation.js';

describe('renewal eligibility', () => {
  it('uses calendar days and waits for the actual recurrence date', () => {
    expect(addCalendarDays('2026-10-01', 60)).toBe('2026-11-30');
    expect(nextRenewalDate([{ actualCloseDate: '2026-10-01' }], 60)).toBe('2026-11-30');
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('starts the next cycle from the latest won order', () => {
    expect(nextRenewalDate([
      { actualCloseDate: '2026-08-01' },
      { actualCloseDate: '2026-11-15' }
    ], 60)).toBe('2027-01-14');
    expect(nextRenewalDate([{ actualCloseDate: null }], 60)).toBeNull();
  });
});

describe('stable stage rules', () => {
  it('keeps business identity and transition rules after a display rename', () => {
    expect(stageCode({ id: 'stg-3', name: 'Samples Delivered' })).toBe('SAMPLE_SENT');
    expect(ALLOWED_TRANSITION_IDS['stg-2']).toContain('stg-3');
    expect(STAGE_CRITERIA['CONTACTED->SAMPLE_SENT']).toHaveLength(4);
  });
});

describe('request validation', () => {
  const response = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  });

  it('returns a useful 400 for invalid note input without crashing', () => {
    const res = response();
    validateBody(noteSchema)({ body: { text: '   ' } }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].details[0].field).toBe('text');
  });

  it('rejects a decision without a reason and malformed contact imports', () => {
    expect(approvalRejectionSchema.safeParse({ reviewer: { id: 'u-1' }, reason: '' }).success).toBe(false);
    expect(contactImportSchema.safeParse({ items: [{ email: 'a@example.com' }] }).success).toBe(false);
  });

  it('accepts the activity notes alias used by the detail drawer', () => {
    expect(activitySchema.safeParse({ type: 'Call', notes: 'Spoke with customer' }).success).toBe(true);
    expect(activitySchema.safeParse({ type: 'Call' }).success).toBe(false);
  });

  it('rejects malformed workflow, staff, and custom-field input', () => {
    expect(closeLostSchema.safeParse({ lostReason: '  ' }).success).toBe(false);
    expect(rebuyRequestSchema.safeParse({ user: { id: 7 } }).success).toBe(false);
    expect(userSchema.safeParse({ name: 'Jane', email: 'invalid', role: 'Admin' }).success).toBe(false);
    expect(leadSchema.safeParse({ title: 'Lead', customFields: { budget: { nested: true } } }).success).toBe(false);
    expect(dealSchema.safeParse({ title: 'Deal', value: -1 }).success).toBe(false);
    expect(dealSchema.safeParse({ title: 'Deal', recurrenceDays: 0 }).success).toBe(false);
    expect(dealSchema.safeParse({ title: 'Deal', expectedCloseDate: '2026-02-31' }).success).toBe(false);
    expect(dealSchema.safeParse({ title: 'Deal', value: 0, customFields: { priority: 'high' } }).success).toBe(true);
    expect(approvalRequestSchema.safeParse({
      dealId: 'dl-1', fromStageId: 'stg-1', targetStageId: 'stg-2', answers: { need: 'yes' }
    }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: 'done' }).success).toBe(true);
    expect(activitySchema.safeParse({ type: 'Call', notes: 'Called', timestamp: 'yesterdayish' }).success).toBe(false);
  });
});
