import { describe, it, expect } from 'vitest';
import {
  companySchema,
  contactSchema,
  leadSchema,
  dealSchema,
  dealTransitionSchema,
  taskSchema,
} from '../backend/middleware/validation.js';

describe('Zod Request Body Validation', () => {
  describe('companySchema', () => {
    it('accepts valid company payload and applies defaults', () => {
      const parsed = companySchema.safeParse({ name: 'Acme Logistics' });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Acme Logistics');
        expect(parsed.data.industry).toBe('General');
      }
    });

    it('rejects company with empty or missing name', () => {
      const parsed = companySchema.safeParse({ industry: 'Manufacturing' });
      expect(parsed.success).toBe(false);
    });
  });

  describe('contactSchema', () => {
    it('accepts valid contact payload', () => {
      const parsed = contactSchema.safeParse({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 555-0100',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects contact with missing name', () => {
      const parsed = contactSchema.safeParse({ email: 'test@example.com' });
      expect(parsed.success).toBe(false);
    });
  });

  describe('leadSchema', () => {
    it('accepts valid lead payload and defaults status to New', () => {
      const parsed = leadSchema.safeParse({
        title: 'Packaging Procurement Inquiry',
        companyName: 'Northern Retail',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.status).toBe('New');
      }
    });

    it('rejects lead with empty title', () => {
      const parsed = leadSchema.safeParse({ title: '' });
      expect(parsed.success).toBe(false);
    });
  });

  describe('dealSchema', () => {
    it('accepts valid deal payload with number conversion', () => {
      const parsed = dealSchema.safeParse({
        title: 'Annual Packaging Contract',
        value: 75000,
        companyName: 'Acme Corp',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.value).toBe(75000);
      }
    });

    it('rejects deal without a title', () => {
      const parsed = dealSchema.safeParse({ value: 10000 });
      expect(parsed.success).toBe(false);
    });
  });

  describe('dealTransitionSchema', () => {
    it('accepts valid stage transition with targetStageId', () => {
      const parsed = dealTransitionSchema.safeParse({
        targetStageId: 'stg-2',
        user: { id: 'u-1', name: 'Admin', role: 'Admin' },
        overrideReason: 'Fast-track pilot',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects transition missing targetStageId', () => {
      const parsed = dealTransitionSchema.safeParse({
        overrideReason: 'Fast-track pilot',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('taskSchema', () => {
    it('accepts valid task with defaults', () => {
      const parsed = taskSchema.safeParse({
        title: 'Follow-up Call',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.priority).toBe('Medium');
        expect(parsed.data.completed).toBe(false);
      }
    });

    it('rejects task with empty title', () => {
      const parsed = taskSchema.safeParse({ title: '' });
      expect(parsed.success).toBe(false);
    });
  });
});
