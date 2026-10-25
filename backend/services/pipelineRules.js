import { stageCode } from '../constants/stageConstants.js';

const LABELS = { contactId: 'contact', companyId: 'company', expectedCloseDate: 'expected close date' };

export function requirePipelineQualification(deal, targetStage, pipeline) {
  const required = pipeline?.qualificationRules?.[stageCode(targetStage)] || [];
  const missing = required.filter(field => LABELS[field] && !deal[field]);
  if (missing.length) {
    throw Object.assign(new Error(`Complete ${missing.map(field => LABELS[field]).join(', ')} before moving to ${targetStage.name}.`),
      { statusCode: 409 });
  }
}
