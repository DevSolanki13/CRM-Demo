import { describe, it, expect } from 'vitest';
import { DEFAULT_FOLLOW_UP_RULES } from '../backend/services/followUpEngine.js';

describe('Follow-Up Automation Engine', () => {
  it('contains valid default follow-up rules for key lifecycle events', () => {
    expect(DEFAULT_FOLLOW_UP_RULES).toBeInstanceOf(Array);
    expect(DEFAULT_FOLLOW_UP_RULES.length).toBeGreaterThanOrEqual(4);

    const triggerEvents = DEFAULT_FOLLOW_UP_RULES.map(r => r.triggerEvent);
    expect(triggerEvents).toContain('LEAD_CREATED');
    expect(triggerEvents).toContain('SAMPLE_SENT');
    expect(triggerEvents).toContain('PROPOSAL_SENT');
    expect(triggerEvents).toContain('RENEWAL_APPROACHING');
  });

  it('all default rules have valid schema fields', () => {
    DEFAULT_FOLLOW_UP_RULES.forEach(rule => {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('triggerEvent');
      expect(rule).toHaveProperty('offsetDays');
      expect(typeof rule.offsetDays).toBe('number');
      expect(rule.offsetDays).toBeGreaterThanOrEqual(1);
      expect(rule).toHaveProperty('taskType');
      expect(rule).toHaveProperty('priority');
      expect(rule).toHaveProperty('taskTitleTemplate');
      expect(rule).toHaveProperty('noteTemplate');
      expect(rule.isActive).toBe(true);
    });
  });

  it('New Lead Outreach rule is configured with 1-day offset and High priority', () => {
    const leadRule = DEFAULT_FOLLOW_UP_RULES.find(r => r.triggerEvent === 'LEAD_CREATED');
    expect(leadRule).toBeDefined();
    expect(leadRule.taskType).toBe('Call');
    expect(leadRule.offsetDays).toBe(1);
    expect(leadRule.priority).toBe('High');
    expect(leadRule.taskTitleTemplate).toContain('{{entityName}}');
  });

  it('Sample Sent follow-up rule is configured with 3-day offset', () => {
    const sampleRule = DEFAULT_FOLLOW_UP_RULES.find(r => r.triggerEvent === 'SAMPLE_SENT');
    expect(sampleRule).toBeDefined();
    expect(sampleRule.offsetDays).toBe(3);
    expect(sampleRule.taskTitleTemplate).toContain('{{contactName}}');
  });

  it('Proposal Sent follow-up rule is configured with Meeting task type', () => {
    const proposalRule = DEFAULT_FOLLOW_UP_RULES.find(r => r.triggerEvent === 'PROPOSAL_SENT');
    expect(proposalRule).toBeDefined();
    expect(proposalRule.taskType).toBe('Meeting');
    expect(proposalRule.offsetDays).toBe(3);
  });

  it('Renewal Approaching rule is configured with Urgent priority', () => {
    const renewalRule = DEFAULT_FOLLOW_UP_RULES.find(r => r.triggerEvent === 'RENEWAL_APPROACHING');
    expect(renewalRule).toBeDefined();
    expect(renewalRule.priority).toBe('Urgent');
    expect(renewalRule.offsetDays).toBe(7);
  });
});
