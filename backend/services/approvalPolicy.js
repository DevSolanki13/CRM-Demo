export const DEFAULT_APPROVAL_POLICY = Object.freeze({
  alwaysRequireReview: true,
  largeDealThreshold: 50000,
  discountThresholdPercent: 15,
  requireIncompleteChecklist: true,
  requiredAnswersByStage: {},
});

export function requiresManagerApproval(deal, targetStageId, answers = {}, policy = {}) {
  const settings = { ...DEFAULT_APPROVAL_POLICY, ...policy };
  if (settings.alwaysRequireReview) return true;
  if (Number(deal.value) >= Number(settings.largeDealThreshold)) return true;
  if (Number(deal.customFields?.discountPercent || 0) >= Number(settings.discountThresholdPercent)) return true;
  const required = settings.requiredAnswersByStage?.[targetStageId] || [];
  return Boolean(settings.requireIncompleteChecklist && required.some(key => answers[key] !== true));
}
