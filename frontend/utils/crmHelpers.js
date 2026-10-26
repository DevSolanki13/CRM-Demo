export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = parseDateValue(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const d = parseDateValue(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function parseDateValue(dateString) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
}

export function getLocalDateInputValue(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateInputValueAfterDays(days, date = new Date()) {
  const value = date instanceof Date ? new Date(date) : new Date(date);
  value.setDate(value.getDate() + days);
  return getLocalDateInputValue(value);
}

export function getDaysDifference(dateString) {
  if (!dateString) return 0;
  const target = parseDateValue(dateString).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function canManageUsers(role) {
  return role === 'Admin';
}

export function canManageSettings(role) {
  return role === 'Admin';
}

export function canViewAllLeads(role) {
  return role === 'Admin' || role === 'Manager';
}

export function filterByRole(items, currentUser) {
  if (!items) return [];
  if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
    return items;
  }
  return items.filter(item => item.ownerId === currentUser.id);
}

export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header => {
        const val = row[header];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSVText(csvText) {
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    result.push(obj);
  }

  return result;
}

export function getStageColor(stage = {}) {
  if (typeof stage !== 'object' || !stage) return '#FFFFFF';
  const colors = { NEW_LEAD: '#FFFFFF', CONTACTED: '#A7F3D0', SAMPLE_SENT: '#6EE7B7',
    PROPOSAL_SENT: '#34D399', NEGOTIATION: '#10B981', CLOSED_WON: '#16A34A',
    RENEWAL: '#EAB308', CLOSED_LOST: '#DC2626' };
  return stage.color || colors[stageCode(stage)] ||
    ({ Won: '#16A34A', Lost: '#DC2626', 'Buy Again': '#EAB308' })[stage.category] || '#FFFFFF';
}

export function getStageBadgeStyle(stage = {}, stageColor = '') {
  const hex = (stageColor || getStageColor(stage)).toUpperCase();

  if (hex === '#FFFFFF' || hex === 'WHITE') {
    return {
      bg: 'bg-[#FFFFFF]',
      text: 'text-[#12161C]',
      border: 'border-[#E3E6EA]',
      badgeClass: 'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]',
      dotBorder: 'border-[#D1D5DB]'
    };
  }
  if (hex === '#A7F3D0') {
    return {
      bg: 'bg-[#ECFDF5]',
      text: 'text-[#065F46]',
      border: 'border-[#A7F3D0]',
      badgeClass: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
      dotBorder: 'border-[#6EE7B7]'
    };
  }
  if (hex === '#6EE7B7') {
    return {
      bg: 'bg-[#D1FAE5]',
      text: 'text-[#064E3B]',
      border: 'border-[#6EE7B7]',
      badgeClass: 'bg-[#D1FAE5] text-[#064E3B] border-[#6EE7B7]',
      dotBorder: 'border-[#34D399]'
    };
  }
  if (hex === '#34D399') {
    return {
      bg: 'bg-[#A7F3D0]',
      text: 'text-[#064E3B]',
      border: 'border-[#34D399]',
      badgeClass: 'bg-[#A7F3D0] text-[#064E3B] border-[#34D399]',
      dotBorder: 'border-[#10B981]'
    };
  }
  if (hex === '#10B981') {
    return {
      bg: 'bg-[#10B981]',
      text: 'text-white',
      border: 'border-transparent',
      badgeClass: 'bg-[#10B981] text-white border-transparent',
      dotBorder: 'border-[#059669]'
    };
  }
  if (hex === '#16A34A') {
    return {
      bg: 'bg-[#16A34A]',
      text: 'text-white',
      border: 'border-transparent',
      badgeClass: 'bg-[#16A34A] text-white border-transparent',
      dotBorder: 'border-[#15803D]'
    };
  }
  if (hex === '#EAB308') {
    return {
      bg: 'bg-[#FEFCE8]',
      text: 'text-[#A16207]',
      border: 'border-[#FEF08A]',
      badgeClass: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
      dotBorder: 'border-[#FDE047]'
    };
  }
  if (hex === '#DC2626') {
    return {
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]',
      badgeClass: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
      dotBorder: 'border-[#FCA5A5]'
    };
  }

  return {
    bg: 'bg-[#F6F7F8]',
    text: 'text-[#12161C]',
    border: 'border-[#E3E6EA]',
    badgeClass: 'bg-[#F6F7F8] text-[#12161C] border-[#E3E6EA]',
    dotBorder: 'border-[#E3E6EA]'
  };
}

export const stageTransitionKey = (source, target) => `${stageCode(source || {})}->${stageCode(target || {})}`;

const DEFAULT_STAGE_CRITERIA = {
  'NEW_LEAD->CONTACTED': [
    'Reached decision-maker or identified who they are',
    'Confirmed genuine need/use-case',
    'Rough budget range known',
    'Realistic timeline known'
  ],
  'CONTACTED->SAMPLE_SENT': [
    'Exact specs/quantity confirmed',
    'Internal evaluation process/timeline known',
    'Competitor also sampling',
    'Shipping/logistics confirmed'
  ],
  'CONTACTED->PROPOSAL_SENT': [
    'Confirmed physical sample not required for product/service',
    'Decision-maker and budget parameters validated',
    'Scope of proposal and delivery timeline agreed'
  ],
  'SAMPLE_SENT->PROPOSAL_SENT': [
    'Sample passed technical/quality requirements',
    'Decision-maker engaged',
    'Target price point known',
    'Defined next step with date'
  ],
  'PROPOSAL_SENT->NEGOTIATION': [
    'Specific feedback received',
    'Pricing is the main blocker vs other issue',
    'Internal approvers identified',
    'Competing vendor still in play'
  ],
  'NEGOTIATION->CLOSED_WON': [
    'Final pricing/terms agreed',
    'Signed PO or firm signing date',
    'Delivery/renewal terms locked'
  ],
  'RENEWAL->PROPOSAL_SENT': [
    'Repeat order specifications and quantity confirmed',
    'Pricing index or repeat discount agreed',
    'Fulfillment timeline verified'
  ]
};

export const STAGE_CRITERIA = DEFAULT_STAGE_CRITERIA;

const DEFAULT_ACTIVITY_STAGE_CRITERIA = {
  'Call': {
    'NEW_LEAD->CONTACTED': [
      'Reached decision-maker or key contact via phone call',
      'Confirmed genuine business requirement over call',
      'Discussed preliminary budget and timeline over call',
      'Agreed on next follow-up action over call'
    ],
    'CONTACTED->SAMPLE_SENT': [
      'Confirmed exact product specs & sample quantity on call',
      'Verified recipient shipping address & logistics contact',
      'Client agreed to evaluate sample upon arrival',
      'Confirmed competitor involvement over call'
    ],
    'SAMPLE_SENT->PROPOSAL_SENT': [
      'Reviewed sample test results with decision-maker over call',
      'Client confirmed sample passed quality requirements',
      'Discussed target price point and volume required over call',
      'Agreed on formal proposal delivery date over call'
    ],
    'PROPOSAL_SENT->NEGOTIATION': [
      'Discussed formal proposal feedback over phone call',
      'Identified specific pricing or commercial blockers',
      'Confirmed internal decision-makers & approvers on call',
      'Agreed on final negotiation schedule over call'
    ],
    'NEGOTIATION->CLOSED_WON': [
      'Final commercial terms & pricing verbally agreed on call',
      'Confirmed PO issue date & contract signing schedule',
      'Delivery, warranty & renewal terms locked over call'
    ]
  },
  'Meeting': {
    'NEW_LEAD->CONTACTED': [
      'Conducted discovery meeting/demo with key stakeholders',
      'Presented company capabilities & mapped client pain points',
      'Identified key decision-makers and approval workflow',
      'Agreed on next steps during meeting'
    ],
    'CONTACTED->SAMPLE_SENT': [
      'Presented product sample specs during meeting/demo',
      'Client requested physical sample testing for verification',
      'Defined testing parameters & sample evaluation criteria',
      'Confirmed sample shipment schedule in meeting'
    ],
    'SAMPLE_SENT->PROPOSAL_SENT': [
      'Held sample review meeting & presented test findings',
      'Technical team approved sample quality & specs',
      'Presented preliminary commercial pricing framework in meeting',
      'Agreed on formal proposal presentation meeting'
    ],
    'PROPOSAL_SENT->NEGOTIATION': [
      'Presented formal proposal to executive stakeholders in meeting',
      'Addressed technical, pricing & delivery questions in meeting',
      'Stakeholders agreed to move to contract negotiation stage',
      'Identified legal & commercial review team'
    ],
    'NEGOTIATION->CLOSED_WON': [
      'Completed final negotiation meeting with executive approvers',
      'All commercial, legal & delivery terms agreed in meeting',
      'PO or contract signed during/after meeting'
    ]
  },
  'Outbound Email': {
    'NEW_LEAD->CONTACTED': [
      'Received email response from decision-maker',
      'Client confirmed active inquiry/interest in writing',
      'Received initial project scope & spec requirements via email',
      'Email conversation established with primary contact'
    ],
    'CONTACTED->SAMPLE_SENT': [
      'Sample request details & specs confirmed via email',
      'Shipping address & recipient phone confirmed in writing',
      'Sample dispatch notice & tracking sent to client via email',
      'Evaluation timeline acknowledged by client via email'
    ],
    'SAMPLE_SENT->PROPOSAL_SENT': [
      'Written email confirmation received that sample passed testing',
      'Client requested formal quotation / proposal document via email',
      'Target order volume & delivery schedule confirmed in writing',
      'Email confirmation of budget approval received'
    ],
    'PROPOSAL_SENT->NEGOTIATION': [
      'Proposal sent and client acknowledged receipt with feedback',
      'Written feedback / counter-proposal received via email',
      'Specific commercial terms & payment schedule requested via email',
      'Key decision-makers copied on email correspondence'
    ],
    'NEGOTIATION->CLOSED_WON': [
      'Written PO or signed agreement received via email',
      'Final payment & delivery terms locked in writing',
      'Formal order execution confirmed via email exchange'
    ]
  },
  'Sample Follow-up': {
    'NEW_LEAD->CONTACTED': [
      'Client expressed interest in physical sample testing',
      'Product application & technical suitability pre-verified',
      'Confirmed sample availability in warehouse'
    ],
    'CONTACTED->SAMPLE_SENT': [
      'Physical sample dispatched with tracking & spec certificate',
      'Client notified of dispatch and tracking details',
      'Verified delivery receipt with client logistics contact'
    ],
    'SAMPLE_SENT->PROPOSAL_SENT': [
      'Client completed physical sample testing / lab evaluation',
      'Sample passed performance, quality & spec tests',
      'Sample approved for production & commercial supply',
      'Client requested bulk supply proposal based on sample'
    ],
    'PROPOSAL_SENT->NEGOTIATION': [
      'Sample performance matched commercial proposal specs',
      'Bulk packaging & batch size confirmed based on sample',
      'Sample quality baseline locked for commercial contract'
    ],
    'NEGOTIATION->CLOSED_WON': [
      'Golden sample / approved reference sample signed off',
      'Batch quality guarantee & delivery specs locked',
      'Ready for initial production dispatch'
    ]
  },
  'Note': {
    'NEW_LEAD->CONTACTED': [
      'Verified lead contact details & company background internally',
      'Confirmed lead matches Ideal Customer Profile (ICP)',
      'Assigned sales owner & logged initial outreach strategy'
    ],
    'CONTACTED->SAMPLE_SENT': [
      'Internal technical review approved sample dispatch',
      'Inventory check confirmed sample stock availability',
      'Shipping costs & logistics plan logged internally'
    ],
    'SAMPLE_SENT->PROPOSAL_SENT': [
      'Internal margin calculation & discount approval completed',
      'Formal proposal draft prepared & approved internally',
      'Commercial risk check passed'
    ],
    'PROPOSAL_SENT->NEGOTIATION': [
      'Commercial terms & credit limit checked by finance',
      'Special pricing / payment terms approved by management',
      'Competitor comparison & strategy note documented'
    ],
    'NEGOTIATION->CLOSED_WON': [
      'Legal, compliance & contract terms approved internally',
      'Credit limit & payment terms signed off by finance',
      'Order booking ready for ERP / fulfillment team'
    ]
  }
};

export const ACTIVITY_STAGE_CRITERIA = DEFAULT_ACTIVITY_STAGE_CRITERIA;

export function getActivityConnectionInfo(activityType = 'Call') {
  const type = String(activityType || '').toLowerCase();
  
  if (type.includes('meeting') || type.includes('demo')) {
    return {
      promptText: 'Was the Meeting / Demo Conducted?',
      yesLabel: 'YES (Attended & Held)',
      noLabel: 'NO (Cancelled / No-Show)',
      disconnectedNotice: 'Meeting was cancelled or no-show. Stage will remain unchanged. Status will flip to "Follow up" (Yellow) and schedule a reminder task.',
      failedNotice: 'Meeting feedback incomplete. Stage will remain unchanged. Status will flip to "Follow up" (Yellow).'
    };
  }
  
  if (type.includes('email')) {
    return {
      promptText: 'Was the Email Replied To / Engaged?',
      yesLabel: 'YES (Replied / Engaged)',
      noLabel: 'NO (No Reply Yet)',
      disconnectedNotice: 'Email not replied to yet. Stage will remain unchanged. Status will flip to "Follow up" (Yellow) and schedule a reminder task.',
      failedNotice: 'Email qualification criteria unfulfilled. Stage will remain unchanged. Status will flip to "Follow up" (Yellow).'
    };
  }
  
  if (type.includes('sample')) {
    return {
      promptText: 'Was the Physical Sample Received & Tested?',
      yesLabel: 'YES (Received & Tested)',
      noLabel: 'NO (Pending / Not Received)',
      disconnectedNotice: 'Physical sample testing pending. Stage will remain unchanged. Status will flip to "Follow up" (Yellow) and schedule a reminder task.',
      failedNotice: 'Sample qualification requirements incomplete. Stage will remain unchanged. Status will flip to "Follow up" (Yellow).'
    };
  }
  
  if (type.includes('note')) {
    return {
      promptText: 'Was Internal Qualification Completed?',
      yesLabel: 'YES (Completed)',
      noLabel: 'NO (Incomplete / Needs Review)',
      disconnectedNotice: 'Internal qualification incomplete. Stage will remain unchanged. Status will flip to "Follow up" (Yellow) and schedule a reminder task.',
      failedNotice: 'Internal criteria unfulfilled. Stage will remain unchanged. Status will flip to "Follow up" (Yellow).'
    };
  }

  // Default: Call
  return {
    promptText: 'Was the Phone Call Connected?',
    yesLabel: 'YES (Connected)',
    noLabel: 'NO (Disconnected / Busy)',
    disconnectedNotice: 'Call disconnected. Stage will remain unchanged. Status will flip to "Follow up" (Yellow) and schedule a reminder task.',
    failedNotice: 'Call criteria incomplete. Stage will remain unchanged. Status will flip to "Follow up" (Yellow).'
  };
}

export function getStatusBadgeStyle(status = '') {
  const s = String(status || '').trim().toLowerCase();

  // Converted lead status (Teal Accent)
  if (s === 'converted') {
    return {
      bg: 'bg-[#EFF6F9]',
      text: 'text-[#1D4E63]',
      border: 'border-[#AFD3E1]',
      badgeClass: 'bg-[#EFF6F9] text-[#1D4E63] border-[#AFD3E1]'
    };
  }

  // Working lead status (Soft Sky Blue)
  if (s === 'working') {
    return {
      bg: 'bg-[#F0F9FF]',
      text: 'text-[#0369A1]',
      border: 'border-[#BAE6FD]',
      badgeClass: 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]'
    };
  }

  // Green / Success statuses
  if (
    s === 'won' ||
    s === 'closed won' ||
    s === 'qualified' ||
    s === 'done' ||
    s === 'approved' ||
    s === 'approved_and_executed' ||
    s === 'advanced'
  ) {
    return {
      bg: 'bg-[#F0FDF4]',
      text: 'text-[#15803D]',
      border: 'border-[#BBF7D0]',
      badgeClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
    };
  }

  // Red / Failure statuses
  if (
    s === 'lost' ||
    s === 'closed lost' ||
    s === 'unqualified' ||
    s === 'rejected' ||
    s === 'demoted' ||
    s === 'overdue'
  ) {
    return {
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]',
      badgeClass: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
    };
  }

  // Yellow / Renewal / Follow up statuses
  if (
    s === 'buy again' ||
    s === 'renewal due' ||
    s === 'renewal' ||
    s === 'buy renewal' ||
    s === 'follow up' ||
    s === 'follow-up' ||
    s === 'followup' ||
    s.includes('renewal') ||
    s.includes('buy again') ||
    s.includes('follow')
  ) {
    return {
      bg: 'bg-[#FEFCE8]',
      text: 'text-[#A16207]',
      border: 'border-[#FEF08A]',
      badgeClass: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]'
    };
  }

  // Neutral / White statuses: New, Contacted, Active, Pending, Pending Review
  return {
    bg: 'bg-[#FFFFFF]',
    text: 'text-[#12161C]',
    border: 'border-[#E3E6EA]',
    badgeClass: 'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]'
  };
}

// Section 23: Stage Aging Calculator
export function getStageAgingStatus(daysInStage = 0) {
  const days = Number(daysInStage) || 0;
  if (days >= 15) {
    return {
      days,
      label: `${days}d in stage`,
      level: 'risk',
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B91C1C]',
      border: 'border-[#FECACA]'
    };
  }
  if (days >= 8) {
    return {
      days,
      label: `${days}d in stage`,
      level: 'attention',
      bg: 'bg-[#FEF8EC]',
      text: 'text-[#965700]',
      border: 'border-[#F5DDA9]'
    };
  }
  return {
    days,
    label: `${days}d in stage`,
    level: 'normal',
    bg: 'bg-[#F6F7F8]',
    text: 'text-[#5B6472]',
    border: 'border-[#E3E6EA]'
  };
}

// Section 24: Stale Deal Inactivity Detection (>= 10 days)
export function isDealStale(lastActivityDate) {
  if (!lastActivityDate) return false;
  const last = parseDateValue(lastActivityDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
  return diffDays >= 10;
}

// Section 25: Expected Close Date Overdue
export function isCloseDateOverdue(expectedCloseDate, status) {
  if (!expectedCloseDate || status === 'Won' || status === 'Lost') return false;
  const target = parseDateValue(expectedCloseDate).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return target < now;
}

// Section 8: Proposal Expiration Warning
export function isProposalExpiringSoon(expiryDateString) {
  if (!expiryDateString) return null;
  const target = parseDateValue(expiryDateString).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      expired: true,
      expiringSoon: false,
      diffDays,
      label: 'Proposal Expired',
      badgeClass: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
    };
  }
  if (diffDays <= 3) {
    return {
      expired: false,
      expiringSoon: true,
      diffDays,
      label: diffDays === 0 ? 'Expires today' : `Expires in ${diffDays}d`,
      badgeClass: 'bg-[#FEF8EC] text-[#965700] border-[#F5DDA9]'
    };
  }
  return null;
}
import { semanticStageCode as stageCode } from '../../backend/constants/stageConstants.js';

