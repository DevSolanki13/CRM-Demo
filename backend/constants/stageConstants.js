export const STAGE_CODES_BY_ID = Object.freeze({
  'stg-1': 'NEW_LEAD',
  'stg-2': 'CONTACTED',
  'stg-3': 'SAMPLE_SENT',
  'stg-4': 'PROPOSAL_SENT',
  'stg-5': 'NEGOTIATION',
  'stg-6': 'CLOSED_WON',
  'stg-7': 'RENEWAL',
  'stg-8': 'CLOSED_LOST',
});

export const stageCode = (stage) => stage.code || STAGE_CODES_BY_ID[stage.id] || `CUSTOM_${stage.id}`;

export const ALLOWED_TRANSITION_IDS = Object.freeze({
  'stg-1': ['stg-2', 'stg-8'],
  'stg-2': ['stg-3', 'stg-4', 'stg-8'],
  'stg-3': ['stg-4', 'stg-8'],
  'stg-4': ['stg-5', 'stg-6', 'stg-8'],
  'stg-5': ['stg-6', 'stg-8'],
  'stg-6': [],
  'stg-7': ['stg-4', 'stg-5', 'stg-6', 'stg-8'],
  'stg-8': [],
});

export const isWonStage = stage => stage?.category === 'Won' || stage?.code === 'CLOSED_WON';
export const isLostStage = stage => stage?.category === 'Lost' || stage?.code === 'CLOSED_LOST';
export const isRenewalStage = stage => stage?.category === 'Buy Again' || stage?.code === 'RENEWAL';

export function allowedStageTargets(source, stages) {
  const samePipeline = stages.filter(stage => stage.pipelineId === source.pipelineId);
  if (source.pipelineId === 'pipeline-sales' && ALLOWED_TRANSITION_IDS[source.id]) {
    return samePipeline.filter(stage => ALLOWED_TRANSITION_IDS[source.id].includes(stage.id));
  }
  if (isWonStage(source) || isLostStage(source)) return [];
  const laterOpen = samePipeline.filter(stage => stage.order > source.order &&
    !isWonStage(stage) && !isLostStage(stage)).sort((a, b) => a.order - b.order);
  return samePipeline.filter(stage => stage.id === laterOpen[0]?.id || isLostStage(stage) ||
    (!laterOpen.length && isWonStage(stage)));
}

export const DEFAULT_STAGE_COLORS = {
  'New Lead': '#FFFFFF',
  'Contacted': '#A7F3D0',
  'Sample Sent': '#6EE7B7',
  'Proposal Sent': '#34D399',
  'Negotiation': '#10B981',
  'Closed Won': '#16A34A',
  'Buy Again (Renewal)': '#EAB308',
  'Closed Lost': '#DC2626',
};

export const OLD_HEX_MAP = {
  '#64748b': '#FFFFFF',
  '#0284c7': '#A7F3D0',
  '#8b5cf6': '#6EE7B7',
  '#eab308': '#34D399',
  '#f97316': '#10B981',
  '#10b981': '#16A34A',
  '#ec4899': '#EAB308',
  '#ef4444': '#DC2626',
  '#B9D4DE': '#FFFFFF',
  '#93BECC': '#A7F3D0',
  '#3E7C93': '#6EE7B7',
  '#2A6580': '#34D399',
  '#1D4E63': '#10B981',
  '#3F7A5C': '#16A34A',
  '#C6790A': '#EAB308',
  '#B5423A': '#DC2626',
};

export const normalizeStageColor = (color, stageName) => {
  if (OLD_HEX_MAP[color]) {
    return OLD_HEX_MAP[color];
  }
  if (DEFAULT_STAGE_COLORS[stageName] && OLD_HEX_MAP[color]) {
    return DEFAULT_STAGE_COLORS[stageName];
  }
  return color || DEFAULT_STAGE_COLORS[stageName] || '#FFFFFF';
};
