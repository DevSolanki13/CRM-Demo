import { describe, expect, it } from 'vitest';
import { requiresManagerApproval } from '../backend/services/approvalPolicy.js';

describe('approval exception policy', () => {
  const policy = { alwaysRequireReview: false, largeDealThreshold: 50000,
    discountThresholdPercent: 15, requireIncompleteChecklist: true,
    requiredAnswersByStage: { 'stg-4': ['budgetConfirmed'] } };

  it('keeps the existing review requirement until an admin changes the policy', () => {
    expect(requiresManagerApproval({ value: 100 }, 'stg-2')).toBe(true);
  });

  it('reviews large deals, discounts, and missing requirements', () => {
    expect(requiresManagerApproval({ value: 50000 }, 'stg-2', {}, policy)).toBe(true);
    expect(requiresManagerApproval({ value: 100, customFields: { discountPercent: 20 } }, 'stg-2', {}, policy)).toBe(true);
    expect(requiresManagerApproval({ value: 100 }, 'stg-4', {}, policy)).toBe(true);
    expect(requiresManagerApproval({ value: 100 }, 'stg-4', { budgetConfirmed: true }, policy)).toBe(false);
    expect(requiresManagerApproval({ value: 100 }, 'stg-2', {}, policy)).toBe(false);
  });
});
