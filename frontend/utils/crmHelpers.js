export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDaysDifference(dateString) {
  if (!dateString) return 0;
  const target = new Date(dateString).getTime();
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

export function getStageColor(stageName = '', category = '') {
  const name = String(stageName || '');
  const cat = String(category || '');

  if (name.includes('Closed Won') || name.includes('Won') || cat === 'Won') {
    return '#16A34A'; // Rich Victory Green
  }
  if (name.includes('Negotiation') || cat === 'Negotiation') {
    return '#10B981'; // Vibrant Emerald Green
  }
  if (name.includes('Proposal') || cat === 'Proposal') {
    return '#34D399'; // Medium Emerald Green
  }
  if (name.includes('Sample Sent') || cat === 'Sample Sent') {
    return '#6EE7B7'; // Soft Sage Green
  }
  if (name.includes('Contacted') || cat === 'Contacted') {
    return '#A7F3D0'; // Light Mint Green
  }
  if (name.includes('Buy Again') || name.includes('Renewal') || cat === 'Buy Again') {
    return '#EAB308'; // Warm Golden Yellow
  }
  if (name.includes('Closed Lost') || name.includes('Lost') || cat === 'Lost') {
    return '#DC2626'; // Muted Crimson Red
  }
  // New Lead / Open top-of-funnel stage
  return '#FFFFFF'; // White
}

export function getStageBadgeStyle(stageName = '', stageColor = '') {
  const name = String(stageName || '');
  const hex = (stageColor || getStageColor(name)).toUpperCase();

  if (hex === '#FFFFFF' || hex === 'WHITE') {
    return {
      bg: 'bg-[#FFFFFF]',
      text: 'text-[#12161C]',
      border: 'border-[#E3E6EA]',
      badgeClass: 'bg-[#FFFFFF] text-[#12161C] border-[#E3E6EA]',
      dotBorder: 'border-[#D1D5DB]'
    };
  }
  if (hex === '#A7F3D0' || name.includes('Contacted')) {
    return {
      bg: 'bg-[#ECFDF5]',
      text: 'text-[#065F46]',
      border: 'border-[#A7F3D0]',
      badgeClass: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
      dotBorder: 'border-[#6EE7B7]'
    };
  }
  if (hex === '#6EE7B7' || name.includes('Sample Sent')) {
    return {
      bg: 'bg-[#D1FAE5]',
      text: 'text-[#064E3B]',
      border: 'border-[#6EE7B7]',
      badgeClass: 'bg-[#D1FAE5] text-[#064E3B] border-[#6EE7B7]',
      dotBorder: 'border-[#34D399]'
    };
  }
  if (hex === '#34D399' || name.includes('Proposal')) {
    return {
      bg: 'bg-[#A7F3D0]',
      text: 'text-[#064E3B]',
      border: 'border-[#34D399]',
      badgeClass: 'bg-[#A7F3D0] text-[#064E3B] border-[#34D399]',
      dotBorder: 'border-[#10B981]'
    };
  }
  if (hex === '#10B981' || name.includes('Negotiation')) {
    return {
      bg: 'bg-[#10B981]',
      text: 'text-white',
      border: 'border-transparent',
      badgeClass: 'bg-[#10B981] text-white border-transparent',
      dotBorder: 'border-[#059669]'
    };
  }
  if (hex === '#16A34A' || name.includes('Closed Won') || name.includes('Won')) {
    return {
      bg: 'bg-[#16A34A]',
      text: 'text-white',
      border: 'border-transparent',
      badgeClass: 'bg-[#16A34A] text-white border-transparent',
      dotBorder: 'border-[#15803D]'
    };
  }
  if (hex === '#EAB308' || name.includes('Buy Again') || name.includes('Renewal')) {
    return {
      bg: 'bg-[#FEFCE8]',
      text: 'text-[#A16207]',
      border: 'border-[#FEF08A]',
      badgeClass: 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]',
      dotBorder: 'border-[#FDE047]'
    };
  }
  if (hex === '#DC2626' || name.includes('Closed Lost') || name.includes('Lost')) {
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

export const STAGE_CRITERIA = {
  'New Lead->Contacted': [
    'Reached decision-maker or identified who they are',
    'Confirmed genuine need/use-case',
    'Rough budget range known',
    'Realistic timeline known'
  ],
  'Contacted->Sample Sent': [
    'Exact specs/quantity confirmed',
    'Internal evaluation process/timeline known',
    'Competitor also sampling',
    'Shipping/logistics confirmed'
  ],
  'Sample Sent->Proposal Sent': [
    'Sample passed technical/quality requirements',
    'Decision-maker engaged',
    'Target price point known',
    'Defined next step with date'
  ],
  'Proposal Sent->Negotiation': [
    'Specific feedback received',
    'Pricing is the main blocker vs other issue',
    'Internal approvers identified',
    'Competing vendor still in play'
  ],
  'Negotiation->Closed Won': [
    'Final pricing/terms agreed',
    'Signed PO or firm signing date',
    'Delivery/renewal terms locked'
  ]
};

export const ACTIVITY_STAGE_CRITERIA = {
  'Call': {
    'New Lead->Contacted': [
      'Reached decision-maker or key contact via phone call',
      'Confirmed genuine business requirement over call',
      'Discussed preliminary budget and timeline over call',
      'Agreed on next follow-up action over call'
    ],
    'Contacted->Sample Sent': [
      'Confirmed exact product specs & sample quantity on call',
      'Verified recipient shipping address & logistics contact',
      'Client agreed to evaluate sample upon arrival',
      'Confirmed competitor involvement over call'
    ],
    'Sample Sent->Proposal Sent': [
      'Reviewed sample test results with decision-maker over call',
      'Client confirmed sample passed quality requirements',
      'Discussed target price point and volume required over call',
      'Agreed on formal proposal delivery date over call'
    ],
    'Proposal Sent->Negotiation': [
      'Discussed formal proposal feedback over phone call',
      'Identified specific pricing or commercial blockers',
      'Confirmed internal decision-makers & approvers on call',
      'Agreed on final negotiation schedule over call'
    ],
    'Negotiation->Closed Won': [
      'Final commercial terms & pricing verbally agreed on call',
      'Confirmed PO issue date & contract signing schedule',
      'Delivery, warranty & renewal terms locked over call'
    ]
  },
  'Meeting': {
    'New Lead->Contacted': [
      'Conducted discovery meeting/demo with key stakeholders',
      'Presented company capabilities & mapped client pain points',
      'Identified key decision-makers and approval workflow',
      'Agreed on next steps during meeting'
    ],
    'Contacted->Sample Sent': [
      'Presented product sample specs during meeting/demo',
      'Client requested physical sample testing for verification',
      'Defined testing parameters & sample evaluation criteria',
      'Confirmed sample shipment schedule in meeting'
    ],
    'Sample Sent->Proposal Sent': [
      'Held sample review meeting & presented test findings',
      'Technical team approved sample quality & specs',
      'Presented preliminary commercial pricing framework in meeting',
      'Agreed on formal proposal presentation meeting'
    ],
    'Proposal Sent->Negotiation': [
      'Presented formal proposal to executive stakeholders in meeting',
      'Addressed technical, pricing & delivery questions in meeting',
      'Stakeholders agreed to move to contract negotiation stage',
      'Identified legal & commercial review team'
    ],
    'Negotiation->Closed Won': [
      'Completed final negotiation meeting with executive approvers',
      'All commercial, legal & delivery terms agreed in meeting',
      'PO or contract signed during/after meeting'
    ]
  },
  'Outbound Email': {
    'New Lead->Contacted': [
      'Received email response from decision-maker',
      'Client confirmed active inquiry/interest in writing',
      'Received initial project scope & spec requirements via email',
      'Email conversation established with primary contact'
    ],
    'Contacted->Sample Sent': [
      'Sample request details & specs confirmed via email',
      'Shipping address & recipient phone confirmed in writing',
      'Sample dispatch notice & tracking sent to client via email',
      'Evaluation timeline acknowledged by client via email'
    ],
    'Sample Sent->Proposal Sent': [
      'Written email confirmation received that sample passed testing',
      'Client requested formal quotation / proposal document via email',
      'Target order volume & delivery schedule confirmed in writing',
      'Email confirmation of budget approval received'
    ],
    'Proposal Sent->Negotiation': [
      'Proposal sent and client acknowledged receipt with feedback',
      'Written feedback / counter-proposal received via email',
      'Specific commercial terms & payment schedule requested via email',
      'Key decision-makers copied on email correspondence'
    ],
    'Negotiation->Closed Won': [
      'Written PO or signed agreement received via email',
      'Final payment & delivery terms locked in writing',
      'Formal order execution confirmed via email exchange'
    ]
  },
  'Sample Follow-up': {
    'New Lead->Contacted': [
      'Client expressed interest in physical sample testing',
      'Product application & technical suitability pre-verified',
      'Confirmed sample availability in warehouse'
    ],
    'Contacted->Sample Sent': [
      'Physical sample dispatched with tracking & spec certificate',
      'Client notified of dispatch and tracking details',
      'Verified delivery receipt with client logistics contact'
    ],
    'Sample Sent->Proposal Sent': [
      'Client completed physical sample testing / lab evaluation',
      'Sample passed performance, quality & spec tests',
      'Sample approved for production & commercial supply',
      'Client requested bulk supply proposal based on sample'
    ],
    'Proposal Sent->Negotiation': [
      'Sample performance matched commercial proposal specs',
      'Bulk packaging & batch size confirmed based on sample',
      'Sample quality baseline locked for commercial contract'
    ],
    'Negotiation->Closed Won': [
      'Golden sample / approved reference sample signed off',
      'Batch quality guarantee & delivery specs locked',
      'Ready for initial production dispatch'
    ]
  },
  'Note': {
    'New Lead->Contacted': [
      'Verified lead contact details & company background internally',
      'Confirmed lead matches Ideal Customer Profile (ICP)',
      'Assigned sales owner & logged initial outreach strategy'
    ],
    'Contacted->Sample Sent': [
      'Internal technical review approved sample dispatch',
      'Inventory check confirmed sample stock availability',
      'Shipping costs & logistics plan logged internally'
    ],
    'Sample Sent->Proposal Sent': [
      'Internal margin calculation & discount approval completed',
      'Formal proposal draft prepared & approved internally',
      'Commercial risk check passed'
    ],
    'Proposal Sent->Negotiation': [
      'Commercial terms & credit limit checked by finance',
      'Special pricing / payment terms approved by management',
      'Competitor comparison & strategy note documented'
    ],
    'Negotiation->Closed Won': [
      'Legal, compliance & contract terms approved internally',
      'Credit limit & payment terms signed off by finance',
      'Order booking ready for ERP / fulfillment team'
    ]
  }
};

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
