import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { prisma } from '../backend/prisma.js';
import { listUnresolvedReferences, resolveReference } from '../backend/services/referenceReconciliationService.js';

describe('historical reference repair', () => {
  it('lists unresolved references currently in the ledger', async () => {
    const unresolved = await listUnresolvedReferences();
    expect(Array.isArray(unresolved)).toBe(true);
    expect(unresolved.length).toBeGreaterThanOrEqual(7);
    for (const ref of unresolved) {
      expect(ref.resolvedAt).toBeNull();
      expect(ref.resolvedTargetId).toBeNull();
      expect(['Deal', 'Task', 'Activity']).toContain(ref.recordType);
      expect(['Deal', 'Lead', 'Contact', 'Company']).toContain(ref.targetType);
    }
  });

  it('assigns a verified parent and retains the original missing ID', async () => {
    const suffix = randomUUID();
    const parentId = `dl-parent-${suffix}`;
    const childId = `dl-child-${suffix}`;
    const referenceId = `Deal:${childId}:parentDealId`;
    try {
      await prisma.deal.createMany({ data: [
        { id: parentId, title: 'Original order', stageId: 'stg-1', stageName: 'New Lead' },
        { id: childId, title: 'Repeat order', stageId: 'stg-1', stageName: 'New Lead', isRebuy: true },
      ] });
      await prisma.orphanReference.create({ data: { id: referenceId, recordType: 'Deal',
        recordId: childId, field: 'parentDealId', targetType: 'Deal', targetId: 'missing-parent' } });
      await expect(resolveReference(referenceId, childId, { id: 'test', name: 'Test' }))
        .rejects.toMatchObject({ statusCode: 400 });
      await resolveReference(referenceId, parentId, { id: 'test', name: 'Test' });
      expect((await prisma.deal.findUnique({ where: { id: childId } })).parentDealId).toBe(parentId);
      const reference = await prisma.orphanReference.findUnique({ where: { id: referenceId } });
      expect(reference.targetId).toBe('missing-parent');
      expect(reference.resolvedTargetId).toBe(parentId);
      expect(reference.resolvedAt).toBeTruthy();
      await expect(resolveReference(referenceId, parentId, { id: 'test', name: 'Test' }))
        .rejects.toMatchObject({ statusCode: 409 });
    } finally {
      await prisma.auditLog.deleteMany({ where: { entityId: childId, action: 'HISTORICAL_LINK_REPAIRED' } });
      await prisma.orphanReference.deleteMany({ where: { id: referenceId } });
      await prisma.deal.deleteMany({ where: { id: childId } });
      await prisma.deal.deleteMany({ where: { id: parentId } });
    }
  });

  it('repairs historical task links to a verified replacement customer record', async () => {
    const suffix = randomUUID();
    const leadId = `ld-valid-${suffix}`;
    const taskId = `tsk-hist-${suffix}`;
    const referenceId = `Task:${taskId}:linkedId`;
    try {
      await prisma.lead.create({
        data: { id: leadId, title: 'Valid Lead', status: 'New' },
      });
      // Create a task pointing to the valid lead first (to satisfy the trigger)
      await prisma.task.create({
        data: {
          id: taskId,
          title: 'Historical outreach task',
          dueDate: '2026-10-15',
          linkedType: 'Lead',
          linkedId: leadId,
        },
      });
      // Register an orphan reference for this task simulating a historical broken link
      await prisma.orphanReference.create({
        data: {
          id: referenceId,
          recordType: 'Task',
          recordId: taskId,
          field: 'linkedId',
          targetType: 'Lead',
          targetId: leadId,
        },
      });

      // Another valid target lead
      const replacementLeadId = `ld-replace-${suffix}`;
      await prisma.lead.create({
        data: { id: replacementLeadId, title: 'Replacement Lead', status: 'New' },
      });

      // Resolving with a non-existent lead must fail (400)
      await expect(resolveReference(referenceId, 'non-existent-lead-id', { id: 'test-admin', name: 'Admin' }))
        .rejects.toMatchObject({ statusCode: 400 });

      // Resolving with the replacement lead succeeds
      const result = await resolveReference(referenceId, replacementLeadId, { id: 'test-admin', name: 'Admin' });
      expect(result.success).toBe(true);

      const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
      expect(updatedTask.linkedId).toBe(replacementLeadId);

      const updatedRef = await prisma.orphanReference.findUnique({ where: { id: referenceId } });
      expect(updatedRef.resolvedTargetId).toBe(replacementLeadId);
      expect(updatedRef.resolvedAt).toBeTruthy();

      // Audit log is created
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: taskId, action: 'HISTORICAL_LINK_REPAIRED' },
      });
      expect(audit).toBeTruthy();
      expect(audit.actorName).toBe('Admin');
    } finally {
      await prisma.auditLog.deleteMany({ where: { entityId: taskId, action: 'HISTORICAL_LINK_REPAIRED' } });
      await prisma.orphanReference.deleteMany({ where: { id: referenceId } });
      await prisma.task.deleteMany({ where: { id: taskId } });
      await prisma.lead.deleteMany({ where: { id: { in: [leadId, `ld-replace-${suffix}`] } } });
    }
  });

  it('repairs historical activity links to a verified replacement customer record', async () => {
    const suffix = randomUUID();
    const leadId = `ld-valid-act-${suffix}`;
    const activityId = `act-hist-${suffix}`;
    const referenceId = `Activity:${activityId}:linkedId`;
    try {
      await prisma.lead.create({
        data: { id: leadId, title: 'Valid Lead for Act', status: 'New' },
      });
      await prisma.activity.create({
        data: {
          id: activityId,
          type: 'Call',
          description: 'Historical call with client',
          timestamp: new Date().toISOString(),
          linkedType: 'Lead',
          linkedId: leadId,
        },
      });
      await prisma.orphanReference.create({
        data: {
          id: referenceId,
          recordType: 'Activity',
          recordId: activityId,
          field: 'linkedId',
          targetType: 'Lead',
          targetId: leadId,
        },
      });

      const replacementLeadId = `ld-replace-act-${suffix}`;
      await prisma.lead.create({
        data: { id: replacementLeadId, title: 'Replacement Lead for Act', status: 'New' },
      });

      const result = await resolveReference(referenceId, replacementLeadId, { id: 'test-admin', name: 'Admin' });
      expect(result.success).toBe(true);

      const updatedActivity = await prisma.activity.findUnique({ where: { id: activityId } });
      expect(updatedActivity.linkedId).toBe(replacementLeadId);

      const updatedRef = await prisma.orphanReference.findUnique({ where: { id: referenceId } });
      expect(updatedRef.resolvedTargetId).toBe(replacementLeadId);
      expect(updatedRef.resolvedAt).toBeTruthy();
    } finally {
      await prisma.auditLog.deleteMany({ where: { entityId: activityId, action: 'HISTORICAL_LINK_REPAIRED' } });
      await prisma.orphanReference.deleteMany({ where: { id: referenceId } });
      await prisma.activity.deleteMany({ where: { id: activityId } });
      await prisma.lead.deleteMany({ where: { id: { in: [leadId, `ld-replace-act-${suffix}`] } } });
    }
  });
});

