import { describe, expect, it } from 'vitest';
import { leadSchema } from '../backend/middleware/validation.js';
import {
  getDefaultLeadRecurrenceDate,
  getNextLeadRecurrenceDate,
} from '../shared/leadRecurrence.js';

describe('recurring lead configuration', () => {
  it('uses today as the configurable first-purchase default', () => {
    expect(getDefaultLeadRecurrenceDate(new Date(2026, 10, 8))).toBe('2026-11-08');
    expect(getDefaultLeadRecurrenceDate(new Date(2026, 11, 2))).toBe('2026-12-02');
  });

  it('handles monthly and annual year boundaries', () => {
    expect(getNextLeadRecurrenceDate('2026-12-01', 'monthly', null)).toBe('2027-01-01');
    expect(getNextLeadRecurrenceDate('2026-12-01', 'yearly', null)).toBe('2027-12-01');
  });

  it('clamps short months and calculates custom intervals from the start date', () => {
    expect(getNextLeadRecurrenceDate('2027-01-31', 'monthly', null)).toBe('2027-02-28');
    expect(getNextLeadRecurrenceDate('2026-12-01', 'custom', 14)).toBe('2026-12-15');
  });

  it('accepts a recurring lead with only its name', () => {
    expect(leadSchema.safeParse({ title: 'A one Associates', isRecurring: true }).success).toBe(true);
    expect(leadSchema.safeParse({
      title: 'A one Associates',
      isRecurring: true,
      isOutbound: null,
      status: null,
    }).success).toBe(true);
    expect(leadSchema.safeParse({ title: '', isRecurring: true }).success).toBe(false);
  });
});
