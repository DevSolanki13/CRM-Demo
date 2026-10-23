import { prisma } from '../prisma.js';
import { createApprovalRequest, decideApproval } from './approvalExecutionService.js';

export const getStageGateChecks = async () => prisma.stageGateCheck.findMany({
  orderBy: { timestamp: 'desc' }
});

export const createStageGateCheck = createApprovalRequest;

export const approveStageGateCheck = (id, reviewer) =>
  decideApproval(id, reviewer, 'approved');

export const rejectStageGateCheck = (id, reviewer, reason) =>
  decideApproval(id, reviewer, 'rejected', reason);
