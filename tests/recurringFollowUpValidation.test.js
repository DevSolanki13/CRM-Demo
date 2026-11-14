import { describe, expect, it } from 'vitest';
import { recurringFollowUpSubmissionSchema } from '../backend/middleware/validation.js';
import { validateRecurringFollowUpSubmission } from '../backend/services/recurringFollowUpService.js';

const today = '2026-11-14';

describe('recurring follow-up submission validation', () => {
  it('requires a valid deal value and a non-future completion date', () => {
    expect(() => validateRecurringFollowUpSubmission({
      outcome: 'completed', dealValue: 0, completionDate: '2026-11-15',
    }, today)).toThrow('Enter a valid completion date.');
    expect(() => validateRecurringFollowUpSubmission({
      outcome: 'completed', dealValue: -1, completionDate: today,
    }, today)).toThrow('Enter a valid deal value.');
    expect(validateRecurringFollowUpSubmission({
      outcome: 'completed', dealValue: 1250, completionDate: today,
    }, today).dealValue).toBe(1250);
  });

  it('requires an update, status, and a current or future date when not completed', () => {
    expect(() => validateRecurringFollowUpSubmission({ outcome: 'not_completed' }, today))
      .toThrow('Enter a reason or update.');
    expect(() => validateRecurringFollowUpSubmission({
      outcome: 'not_completed', updateText: 'Customer requested more time.',
      currentStatus: 'On Hold', nextFollowUpDate: '2026-11-13',
    }, today)).toThrow('Choose a follow-up date today or later.');
    expect(validateRecurringFollowUpSubmission({
      outcome: 'not_completed', updateText: 'Customer requested more time.',
      currentStatus: 'On Hold', nextFollowUpDate: '2026-11-15',
    }, today).currentStatus).toBe('On Hold');
  });

  it('requires a lost reason and rejects impossible ISO dates', () => {
    expect(() => validateRecurringFollowUpSubmission({
      outcome: 'not_completed', updateText: 'Customer selected another vendor.',
      currentStatus: 'Lost', nextFollowUpDate: today,
    }, today)).toThrow('Enter a lost reason.');
    expect(recurringFollowUpSubmissionSchema.safeParse({
      outcome: 'completed', dealValue: 500, completionDate: '2026-02-30',
    }).success).toBe(false);
  });
});
