export const ALLOWED_TRANSITIONS = {
  'New Lead': ['Contacted', 'Closed Lost'],
  'Contacted': ['Sample Sent', 'Proposal Sent', 'Closed Lost'],
  'Sample Sent': ['Proposal Sent', 'Closed Lost'],
  'Proposal Sent': ['Negotiation', 'Closed Won', 'Closed Lost'],
  'Negotiation': ['Closed Won', 'Closed Lost'],
  'Buy Again (Renewal)': ['Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'],
  'Closed Won': [], // Terminal; creates child rebuy deal
  'Closed Lost': [] // Terminal; requires new opportunity
};

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
