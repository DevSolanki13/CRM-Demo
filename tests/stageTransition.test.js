import { describe, it, expect } from 'vitest';
import { ALLOWED_TRANSITIONS, normalizeStageColor, DEFAULT_STAGE_COLORS, OLD_HEX_MAP } from '../backend/constants/stageConstants.js';

describe('Stage Transition Matrix Governance', () => {
  it('allows valid forward stage transitions from New Lead', () => {
    const allowed = ALLOWED_TRANSITIONS['New Lead'];
    expect(allowed).toContain('Contacted');
    expect(allowed).toContain('Closed Lost');
    expect(allowed).not.toContain('Closed Won');
  });

  it('allows valid forward stage transitions from Proposal Sent', () => {
    const allowed = ALLOWED_TRANSITIONS['Proposal Sent'];
    expect(allowed).toContain('Negotiation');
    expect(allowed).toContain('Closed Won');
    expect(allowed).toContain('Closed Lost');
  });

  it('terminal stages have no forward progression', () => {
    expect(ALLOWED_TRANSITIONS['Closed Won']).toEqual([]);
    expect(ALLOWED_TRANSITIONS['Closed Lost']).toEqual([]);
  });

  it('correctly maps legacy hex colors through normalizeStageColor', () => {
    const legacyBlue = '#0284c7';
    expect(normalizeStageColor(legacyBlue, 'Contacted')).toBe(OLD_HEX_MAP[legacyBlue]);

    const legacyOrange = '#f97316';
    expect(normalizeStageColor(legacyOrange, 'Negotiation')).toBe(OLD_HEX_MAP[legacyOrange]);
  });

  it('preserves valid custom hex colors', () => {
    const customGreen = '#00FF00';
    expect(normalizeStageColor(customGreen, 'Custom Stage')).toBe('#00FF00');
  });

  it('falls back to default stage color when color is missing or empty', () => {
    expect(normalizeStageColor(null, 'Closed Won')).toBe(DEFAULT_STAGE_COLORS['Closed Won']);
    expect(normalizeStageColor('', 'New Lead')).toBe(DEFAULT_STAGE_COLORS['New Lead']);
  });
});
