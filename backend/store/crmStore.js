import {
  initialBranding,
  initialUsers,
  initialStages,
  initialCompanies,
  initialContacts,
  initialLeads,
  initialDeals,
  initialTasks,
  initialNotes,
  initialActivities,
  initialStageGateChecks,
  initialAuditLogs,
} from '../data/initialData.js';

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

const DEFAULT_STAGE_COLORS = {
  'New Lead': '#FFFFFF',
  'Contacted': '#A7F3D0',
  'Sample Sent': '#6EE7B7',
  'Proposal Sent': '#34D399',
  'Negotiation': '#10B981',
  'Closed Won': '#16A34A',
  'Buy Again (Renewal)': '#EAB308',
  'Closed Lost': '#DC2626',
};

const OLD_HEX_MAP = {
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

class CRMStore {
  constructor() {
    this.resetState();
  }

  resetState() {
    this.branding = JSON.parse(JSON.stringify(initialBranding));
    this.users = JSON.parse(JSON.stringify(initialUsers));
    this.stages = JSON.parse(JSON.stringify(initialStages));
    this.companies = JSON.parse(JSON.stringify(initialCompanies));
    this.contacts = JSON.parse(JSON.stringify(initialContacts));
    this.leads = JSON.parse(JSON.stringify(initialLeads));
    this.deals = JSON.parse(JSON.stringify(initialDeals));
    this.tasks = JSON.parse(JSON.stringify(initialTasks));
    this.notes = JSON.parse(JSON.stringify(initialNotes));
    this.activities = JSON.parse(JSON.stringify(initialActivities));
    this.stageGateChecks = JSON.parse(JSON.stringify(initialStageGateChecks));
    this.auditLogs = JSON.parse(JSON.stringify(initialAuditLogs || []));
    return this.getState();
  }

  getState() {
    if (this.stages) {
      this.stages = this.stages.map(stg => {
        if (OLD_HEX_MAP[stg.color]) {
          return { ...stg, color: OLD_HEX_MAP[stg.color] };
        }
        if (DEFAULT_STAGE_COLORS[stg.name] && OLD_HEX_MAP[stg.color]) {
          return { ...stg, color: DEFAULT_STAGE_COLORS[stg.name] };
        }
        return stg;
      });
    }
    return {
      branding: this.branding,
      users: this.users,
      stages: this.stages,
      companies: this.companies,
      contacts: this.contacts,
      leads: this.leads,
      deals: this.deals,
      tasks: this.tasks,
      notes: this.notes,
      activities: this.activities,
      stageGateChecks: this.stageGateChecks,
      auditLogs: this.auditLogs || [],
    };
  }

  // Branding & Settings
  updateBranding(partialBranding) {
    this.branding = { ...this.branding, ...partialBranding };
    return this.branding;
  }

  // Companies
  getCompanies() {
    return this.companies;
  }

  createCompany(company) {
    const newComp = {
      id: `c-${Date.now()}`,
      name: company.name || 'New Company',
      industry: company.industry || 'General',
      website: company.website || '',
      address: company.address || '',
      notes: company.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      ...company,
    };
    this.companies.unshift(newComp);
    return newComp;
  }

  updateCompany(id, company) {
    const idx = this.companies.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.companies[idx] = { ...this.companies[idx], ...company };
      return this.companies[idx];
    }
    return null;
  }

  deleteCompany(id) {
    const initialLen = this.companies.length;
    this.companies = this.companies.filter((c) => c.id !== id);
    return this.companies.length < initialLen;
  }

  // Contacts
  getContacts() {
    return this.contacts;
  }

  createContact(contact) {
    const newContact = {
      id: `cnt-${Date.now()}`,
      name: contact.name || 'New Contact',
      email: contact.email || '',
      phone: contact.phone || '',
      jobTitle: contact.jobTitle || 'Representative',
      companyId: contact.companyId || '',
      companyName: contact.companyName || 'Unassigned',
      ownerId: contact.ownerId || 'u-1',
      ownerName: contact.ownerName || 'Alex Vance',
      customFields: contact.customFields || {},
      createdAt: new Date().toISOString().split('T')[0],
      ...contact,
    };
    this.contacts.unshift(newContact);
    return newContact;
  }

  updateContact(id, contact) {
    const idx = this.contacts.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.contacts[idx] = { ...this.contacts[idx], ...contact };
      return this.contacts[idx];
    }
    return null;
  }

  deleteContact(id) {
    const initialLen = this.contacts.length;
    this.contacts = this.contacts.filter((c) => c.id !== id);
    return this.contacts.length < initialLen;
  }

  // Leads
  getLeads() {
    return this.leads;
  }

  createLead(lead) {
    let title = (lead.title || 'New Lead Inquiry').trim();
    if (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title)) {
      title = `Lead #${title}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newLead = {
      id: `ld-${Date.now()}`,
      contactName: lead.contactName || 'Unknown Prospect',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      companyName: lead.companyName || 'Unspecified Co',
      source: lead.source || 'Inbound Inquiry',
      isOutbound: lead.isOutbound ?? false,
      status: lead.status || 'New',
      ownerId: lead.ownerId || 'u-3',
      ownerName: lead.ownerName || 'Marcus Vance',
      createdAt: todayStr,
      lastActivityDate: todayStr,
      ...lead,
      title: title
    };
    this.leads.unshift(newLead);

    // Section 5 & 22: Automatically create first-contact task when a lead is created
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    this.createTask({
      title: `First contact outreach for ${newLead.contactName || newLead.title}`,
      dueDate: tomorrowStr,
      type: 'Call',
      linkedType: 'Lead',
      linkedId: newLead.id,
      linkedTitle: newLead.title,
      ownerId: newLead.ownerId,
      ownerName: newLead.ownerName,
      status: 'pending',
      note: `Inbound/outbound lead inquiry via ${newLead.source}. Initiate first contact.`
    });

    this.logAudit({
      actorId: newLead.ownerId,
      actorName: newLead.ownerName,
      action: 'LEAD_CREATED',
      entityType: 'Lead',
      entityId: newLead.id,
      entityTitle: newLead.title,
      reason: `Lead created from source "${newLead.source}"`,
      metadata: { source: newLead.source }
    });

    return newLead;
  }

  updateLead(id, lead) {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      let updatedLead = { ...this.leads[idx], ...lead, lastActivityDate: new Date().toISOString().split('T')[0] };
      if (updatedLead.title) {
        let title = updatedLead.title.trim();
        if (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title)) {
          title = `Lead #${title}`;
        }
        updatedLead.title = title;
      }
      this.leads[idx] = updatedLead;
      return this.leads[idx];
    }
    return null;
  }

  deleteLead(id) {
    const initialLen = this.leads.length;
    this.leads = this.leads.filter((l) => l.id !== id);
    return this.leads.length < initialLen;
  }

  // Stages
  getStages() {
    return this.stages.sort((a, b) => a.order - b.order);
  }

  createStage(stage) {
    const newStage = {
      id: `stg-${Date.now()}`,
      name: stage.name || 'New Pipeline Stage',
      order: stage.order || this.stages.length + 1,
      category: stage.category || 'Pipeline',
      color: stage.color || '#3b82f6',
      ...stage,
    };
    this.stages.push(newStage);
    return newStage;
  }

  updateStage(id, stage) {
    const idx = this.stages.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.stages[idx] = { ...this.stages[idx], ...stage };
      return this.stages[idx];
    }
    return null;
  }

  // Deals
  getDeals() {
    return this.deals;
  }

  createDeal(deal) {
    const todayStr = new Date().toISOString().split('T')[0];
    const initialStage = this.stages.find(s => s.id === deal.stageId) || this.stages[0] || { id: 'stg-1', name: 'New Lead' };

    const newDeal = {
      id: `dl-${Date.now()}`,
      leadId: deal.leadId || '',
      parentDealId: deal.parentDealId || null,
      title: deal.title || 'New Sales Deal',
      value: Number(deal.value) || 10000,
      currency: deal.currency || 'INR',
      stageId: initialStage.id,
      stageName: initialStage.name,
      expectedCloseDate: deal.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      proposalExpiryDate: deal.proposalExpiryDate || null,
      contactId: deal.contactId || '',
      contactName: deal.contactName || '',
      companyId: deal.companyId || '',
      companyName: deal.companyName || '',
      ownerId: deal.ownerId || 'u-3',
      ownerName: deal.ownerName || 'Marcus Vance',
      isRecurring: deal.isRecurring ?? false,
      isRebuy: deal.isRebuy ?? false,
      recurrenceDays: deal.recurrenceDays || this.branding.defaultRecurrenceDays || 60,
      status: deal.status || 'Active',
      createdAt: todayStr,
      updatedAt: todayStr,
      lastActivityDate: todayStr,
      daysInStage: 0,
      valueHistory: deal.valueHistory || [
        { date: todayStr, value: Number(deal.value) || 10000, stage: initialStage.name, reason: 'Initial deal creation' }
      ],
      ...deal,
    };

    this.deals.unshift(newDeal);

    // If deal is tied to a lead, update lead status to 'Converted'
    if (newDeal.leadId) {
      const leadIdx = this.leads.findIndex(l => l.id === newDeal.leadId);
      if (leadIdx !== -1) {
        this.leads[leadIdx].status = 'Converted';
        this.leads[leadIdx].lastActivityDate = todayStr;
      }
    }

    this.logAudit({
      actorId: newDeal.ownerId,
      actorName: newDeal.ownerName,
      action: 'DEAL_CREATED',
      entityType: 'Deal',
      entityId: newDeal.id,
      entityTitle: newDeal.title,
      reason: `New sales opportunity created for ${newDeal.companyName || 'Client'}`,
      metadata: { value: newDeal.value, stage: newDeal.stageName, leadId: newDeal.leadId }
    });

    return newDeal;
  }

  updateDeal(id, deal) {
    const idx = this.deals.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const existing = this.deals[idx];
      const todayStr = new Date().toISOString().split('T')[0];
      let valueHistory = existing.valueHistory ? [...existing.valueHistory] : [];

      if (deal.value !== undefined && Number(deal.value) !== Number(existing.value)) {
        valueHistory.push({
          date: todayStr,
          oldValue: existing.value,
          value: Number(deal.value),
          stage: deal.stageName || existing.stageName,
          reason: deal.valueChangeReason || 'Deal value adjusted'
        });

        this.logAudit({
          actorId: deal.updatedById || 'u-1',
          actorName: deal.updatedByName || 'User',
          action: 'DEAL_VALUE_CHANGED',
          entityType: 'Deal',
          entityId: existing.id,
          entityTitle: existing.title,
          reason: `Value adjusted from ₹${Number(existing.value).toLocaleString('en-IN')} to ₹${Number(deal.value).toLocaleString('en-IN')}`,
          metadata: { oldValue: existing.value, newValue: deal.value }
        });
      }

      this.deals[idx] = {
        ...this.deals[idx],
        ...deal,
        value: deal.value !== undefined ? Number(deal.value) : existing.value,
        valueHistory,
        updatedAt: todayStr,
      };
      return this.deals[idx];
    }
    return null;
  }

  deleteDeal(id) {
    const initialLen = this.deals.length;
    this.deals = this.deals.filter((d) => d.id !== id);
    return this.deals.length < initialLen;
  }

  // Section 11 & 28: Dedicated Rebuy Creation Engine
  createRebuyDeal(parentDealId, user) {
    const parentDeal = this.deals.find(d => d.id === parentDealId);
    if (!parentDeal) return null;

    // Check if an active (non-won, non-lost) rebuy deal already exists
    const existingActiveRebuy = this.deals.find(
      d => d.parentDealId === parentDealId && d.status !== 'Won' && d.status !== 'Lost'
    );
    if (existingActiveRebuy) {
      return existingActiveRebuy;
    }

    const renewalStage = this.stages.find((s) => s.category === 'Buy Again' || s.name.includes('Buy Again')) || this.stages[6] || { id: 'stg-7', name: 'Buy Again (Renewal)' };
    const todayStr = new Date().toISOString().split('T')[0];
    const expectedClose = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const newRebuyDeal = {
      id: `dl-rebuy-${Date.now()}`,
      parentDealId: parentDeal.id,
      leadId: parentDeal.leadId || '',
      title: `${parentDeal.companyName || parentDeal.title} (Renewal Rebuy)`,
      value: parentDeal.value,
      currency: parentDeal.currency || 'INR',
      stageId: renewalStage.id,
      stageName: renewalStage.name,
      expectedCloseDate: expectedClose,
      contactId: parentDeal.contactId,
      contactName: parentDeal.contactName,
      companyId: parentDeal.companyId,
      companyName: parentDeal.companyName,
      ownerId: parentDeal.ownerId,
      ownerName: parentDeal.ownerName,
      isRecurring: true,
      isRebuy: true,
      recurrenceDays: parentDeal.recurrenceDays || this.branding.defaultRecurrenceDays || 60,
      status: 'Renewal Due',
      createdAt: todayStr,
      updatedAt: todayStr,
      lastActivityDate: todayStr,
      daysInStage: 0,
      valueHistory: [
        { date: todayStr, value: parentDeal.value, stage: renewalStage.name, reason: 'Automated repeat purchase cycle created' }
      ]
    };

    this.deals.unshift(newRebuyDeal);

    // Section 22: Proactive automated task for rebuy outreach
    const threeDaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    this.createTask({
      title: `[Rebuy Outreach] Review renewal contract with ${parentDeal.contactName || parentDeal.companyName}`,
      dueDate: threeDaysStr,
      type: 'Renewal Check-in',
      linkedType: 'Deal',
      linkedId: newRebuyDeal.id,
      linkedTitle: newRebuyDeal.title,
      ownerId: parentDeal.ownerId,
      ownerName: parentDeal.ownerName,
      status: 'pending',
      note: `Recurring customer ${parentDeal.companyName} reached repeat order cycle. Initiate proposal review.`
    });

    // Log audit event
    this.logAudit({
      actorId: user?.id || 'u-1',
      actorName: user?.name || 'System Automation',
      action: 'REBUY_CREATED',
      entityType: 'Deal',
      entityId: newRebuyDeal.id,
      entityTitle: newRebuyDeal.title,
      fromStage: 'Closed Won',
      toStage: renewalStage.name,
      reason: `Automated ${parentDeal.recurrenceDays || 60}-day repeat purchase cycle triggered.`,
      metadata: { parentDealId: parentDeal.id }
    });

    return newRebuyDeal;
  }

  // Automated Renewal Scanning without mutating parent Closed Won deals
  triggerRenewalCheck() {
    let createdCount = 0;
    const now = new Date();

    this.deals.forEach((deal) => {
      if (deal.isRecurring && (deal.status === 'Won' || deal.stageName === 'Closed Won')) {
        const closeDateStr = deal.actualCloseDate || deal.updatedAt || deal.createdAt;
        if (closeDateStr) {
          const lastDate = new Date(closeDateStr);
          const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          const cycle = deal.recurrenceDays || this.branding.defaultRecurrenceDays || 60;

          // Check if active child rebuy deal already exists
          const hasExistingActive = this.deals.some(
            d => d.parentDealId === deal.id && d.status !== 'Won' && d.status !== 'Lost'
          );
          if (!hasExistingActive) {
            const hasAnyChild = this.deals.some(d => d.parentDealId === deal.id);
            if (diffDays >= cycle || !hasAnyChild || deal.recurrenceDays === 0) {
              this.createRebuyDeal(deal.id, { id: 'u-1', name: 'System Automation' });
              createdCount++;
            }
          }
        }
      }
    });

    return { flippedCount: createdCount, state: this.getState() };
  }

  // Section 14 & 31: Backend Stage Transition Validation Engine
  transitionDealStage(dealId, payload) {
    const { targetStageId, user, answers, overrideReason, demotionReason, note, lostReason } = payload;
    const dealIdx = this.deals.findIndex(d => d.id === dealId);
    if (dealIdx === -1) {
      throw new Error('Deal not found');
    }

    const deal = this.deals[dealIdx];
    const fromStage = this.stages.find(s => s.id === deal.stageId || s.name === deal.stageName) || this.stages[0];
    const targetStage = this.stages.find(s => s.id === targetStageId);
    if (!targetStage) {
      throw new Error('Target stage not found');
    }

    const fromName = fromStage.name;
    const targetName = targetStage.name;

    const isBackward = targetStage.order < fromStage.order;
    const isAllowedForward = (ALLOWED_TRANSITIONS[fromName] || []).includes(targetName);
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';

    // Validate forward jumps against transition matrix
    if (!isAllowedForward && !isBackward) {
      if (!isAdmin || !overrideReason) {
        const allowed = (ALLOWED_TRANSITIONS[fromName] || []).join(', ');
        throw new Error(`Invalid stage transition from "${fromName}" to "${targetName}". Allowed next stages: ${allowed || 'None'}`);
      }
    }

    // Require demotion reason for backward movements
    if (isBackward && !demotionReason && !overrideReason) {
      throw new Error('Backward stage demotion requires a mandatory demotion reason.');
    }

    // If Sales Rep advancing to a forward stage, submit for Manager Review
    if (!isAdmin && !isManager && !isBackward && targetName !== 'Closed Lost') {
      const newCheck = this.createStageGateCheck({
        dealId: deal.id,
        dealTitle: deal.title,
        fromStageId: fromStage.id,
        fromStageName: fromName,
        targetStageId: targetStage.id,
        targetStageName: targetName,
        submittedBy: user?.id || 'u-3',
        submittedByName: user?.name || 'Sales Rep',
        answers: answers || {},
        note: note || '',
        status: 'pending_review',
        outcome: 'advanced'
      });

      deal.status = 'Pending Review';
      deal.pendingGateCheck = newCheck;

      if (deal.leadId) {
        const leadIdx = this.leads.findIndex(l => l.id === deal.leadId);
        if (leadIdx !== -1) {
          this.leads[leadIdx].status = 'Pending Review';
          this.leads[leadIdx].pendingGateCheck = newCheck;
        }
      }

      this.logAudit({
        actorId: user?.id || 'u-3',
        actorName: user?.name || 'Sales Rep',
        action: 'APPROVAL_REQUESTED',
        entityType: 'Deal',
        entityId: deal.id,
        entityTitle: deal.title,
        fromStage: fromName,
        toStage: targetName,
        reason: `Submitted stage advancement request for Manager approval. Note: ${note || 'N/A'}`,
        metadata: { checkId: newCheck.id, answers }
      });

      return { deal, check: newCheck, requiresApproval: true };
    }

    // Execute stage transition immediately
    const todayStr = new Date().toISOString().split('T')[0];
    delete deal.pendingGateCheck;
    deal.stageId = targetStage.id;
    deal.stageName = targetStage.name;
    deal.daysInStage = 0;
    deal.updatedAt = todayStr;
    deal.lastActivityDate = todayStr;

    if (targetName === 'Closed Won') {
      deal.status = 'Won';
      deal.actualCloseDate = todayStr;
      // Section 22: Auto-create post-sale task
      const sevenDaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      this.createTask({
        title: `[Post-Sale Check-in] Fulfillment & Delivery check for ${deal.companyName || deal.title}`,
        dueDate: sevenDaysStr,
        type: 'Follow-up',
        linkedType: 'Deal',
        linkedId: deal.id,
        linkedTitle: deal.title,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        status: 'pending',
        note: 'Closed Won deal converted. Confirm order delivery and client satisfaction.'
      });
    } else if (targetName === 'Closed Lost') {
      deal.status = 'Lost';
      deal.lostReason = lostReason || overrideReason || 'Unspecified';
      deal.lostReasonNote = note || '';
    } else if (isBackward) {
      deal.backwardReason = demotionReason;
      deal.backwardNote = note || '';
    } else {
      deal.status = 'Active';
      // Event-driven tasks for pipeline steps
      if (targetName === 'Sample Sent') {
        const sampleDue = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];
        this.createTask({
          title: `[Sample Evaluation Feedback] Collect testing feedback for ${deal.title}`,
          dueDate: sampleDue,
          type: 'Sample Follow-up',
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          ownerId: deal.ownerId,
          ownerName: deal.ownerName,
          status: 'pending',
          note: 'Sample dispatched. Follow up with testing engineer on evaluation.'
        });
      } else if (targetName === 'Proposal Sent') {
        const propDue = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
        this.createTask({
          title: `[Proposal Review] Follow up on proposal terms with ${deal.contactName || deal.companyName}`,
          dueDate: propDue,
          type: 'Proposal Follow-up',
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          ownerId: deal.ownerId,
          ownerName: deal.ownerName,
          status: 'pending',
          note: 'Commercial quotation sent. Follow up with decision maker.'
        });
      }
    }

    // Synchronize linked lead status using strictly immutable ID
    if (deal.leadId) {
      const leadIdx = this.leads.findIndex(l => l.id === deal.leadId);
      if (leadIdx !== -1) {
        if (targetName === 'Closed Won') {
          this.leads[leadIdx].status = 'Converted';
        } else if (targetName === 'Closed Lost') {
          this.leads[leadIdx].status = 'Unqualified';
        } else {
          this.leads[leadIdx].status = 'Converted';
        }
        this.leads[leadIdx].lastActivityDate = todayStr;
      }
    }

    // Activity Log
    this.createActivity({
      type: isBackward ? 'Stage Demoted' : targetName === 'Closed Won' ? 'Deal Won' : targetName === 'Closed Lost' ? 'Deal Lost' : 'Stage Advanced',
      description: isBackward 
        ? `Stage demoted to "${targetName}". Reason: ${demotionReason || 'N/A'}. Note: ${note || 'N/A'}`
        : overrideReason
        ? `[Admin Override] Stage changed to "${targetName}". Reason: ${overrideReason}`
        : `Stage changed from "${fromName}" to "${targetName}". Note: ${note || 'N/A'}`,
      linkedType: 'Deal',
      linkedId: deal.id,
      linkedTitle: deal.title,
      authorId: user?.id || 'u-1',
      authorName: user?.name || 'System',
      isOutbound: false
    });

    // Permanent Audit Log
    this.logAudit({
      actorId: user?.id || 'u-1',
      actorName: user?.name || 'User',
      action: isBackward ? 'STAGE_DEMOTED' : overrideReason ? 'ADMIN_OVERRIDE' : targetName === 'Closed Won' ? 'DEAL_WON' : targetName === 'Closed Lost' ? 'DEAL_LOST' : 'STAGE_TRANSITION',
      entityType: 'Deal',
      entityId: deal.id,
      entityTitle: deal.title,
      fromStage: fromName,
      toStage: targetName,
      reason: overrideReason || demotionReason || lostReason || note || 'Stage transition executed.',
      metadata: { overrideReason, demotionReason, answers }
    });

    return { deal, requiresApproval: false };
  }

  // Section 12: Dedicated Close Lost Operation
  closeLostDeal(dealId, payload) {
    const { lostReason, note, user } = payload;
    if (!lostReason) {
      throw new Error('A mandatory Closed Lost reason is required.');
    }
    const lostStage = this.stages.find(s => s.category === 'Lost' || s.name === 'Closed Lost') || { id: 'stg-8', name: 'Closed Lost' };
    return this.transitionDealStage(dealId, {
      targetStageId: lostStage.id,
      user,
      lostReason,
      note,
      overrideReason: user?.role === 'Admin' ? 'Direct close lost by Admin' : undefined
    });
  }

  // Section 27: Audit Logging Ledger
  logAudit(event) {
    const logEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    if (!this.auditLogs) this.auditLogs = [];
    this.auditLogs.unshift(logEntry);
    return logEntry;
  }

  getAuditLogs() {
    return this.auditLogs || [];
  }

  // Tasks
  getTasks() {
    return this.tasks;
  }

  createTask(task) {
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: task.title || 'Follow up action item',
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      type: task.type || 'Call',
      linkedType: task.linkedType || 'Deal',
      linkedId: task.linkedId || '',
      linkedTitle: task.linkedTitle || 'General',
      ownerId: task.ownerId || 'u-1',
      ownerName: task.ownerName || 'Alex Vance',
      status: task.status || 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      ...task,
    };
    this.tasks.unshift(newTask);
    return newTask;
  }

  updateTask(id, task) {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tasks[idx] = { ...this.tasks[idx], ...task };
      return this.tasks[idx];
    }
    return null;
  }

  deleteTask(id) {
    const initialLen = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length < initialLen;
  }

  // Notes
  getNotes() {
    return this.notes;
  }

  createNote(note) {
    const newNote = {
      id: `nt-${Date.now()}`,
      text: note.text || '',
      timestamp: new Date().toISOString(),
      authorId: note.authorId || 'u-1',
      authorName: note.authorName || 'Alex Vance',
      linkedType: note.linkedType || 'Contact',
      linkedId: note.linkedId || '',
      ...note,
    };
    this.notes.unshift(newNote);
    return newNote;
  }

  // Activities
  getActivities() {
    return this.activities;
  }

  createActivity(activity) {
    const newActivity = {
      id: `act-${Date.now()}`,
      type: activity.type || 'Note',
      description: activity.description || 'Logged CRM activity',
      timestamp: new Date().toISOString(),
      linkedType: activity.linkedType || 'Contact',
      linkedId: activity.linkedId || '',
      linkedTitle: activity.linkedTitle || '',
      authorId: activity.authorId || 'u-1',
      authorName: activity.authorName || 'Alex Vance',
      isOutbound: activity.isOutbound ?? true,
      ...activity,
    };
    this.activities.unshift(newActivity);
    return newActivity;
  }

  // Users
  getUsers() {
    return this.users;
  }

  createUser(user) {
    const newUser = {
      id: `u-${Date.now()}`,
      name: user.name || 'New Staff Member',
      email: user.email || 'user@nexuscrm.io',
      role: user.role || 'Sales Rep',
      active: true,
      avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id, user) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...user };
      return this.users[idx];
    }
    return null;
  }

  // Stage Gate Checks
  getStageGateChecks() {
    return this.stageGateChecks;
  }

  createStageGateCheck(check) {
    const newCheck = {
      id: `sgc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: check.status || 'pending_review', // 'draft', 'pending_review', 'approved_and_executed', 'rejected'
      ...check,
    };
    this.stageGateChecks.unshift(newCheck);

    // If check status is approved_and_executed directly (e.g. submitted by Admin or auto-approved)
    if (newCheck.status === 'approved_and_executed') {
      this.executeGateCheckTransition(newCheck);
      return newCheck;
    }

    // Correlate deal and lead objects
    let deal = null;
    let dealIdx = -1;
    if (newCheck.dealId) {
      dealIdx = this.deals.findIndex(d => d.id === newCheck.dealId);
      if (dealIdx !== -1) deal = this.deals[dealIdx];
    } else if (newCheck.leadId) {
      dealIdx = this.deals.findIndex(d => d.leadId === newCheck.leadId);
      if (dealIdx !== -1) {
        deal = this.deals[dealIdx];
        newCheck.dealId = deal.id;
        newCheck.dealTitle = newCheck.dealTitle || deal.title;
      }
    }

    let lead = null;
    let leadIdx = -1;
    if (newCheck.leadId) {
      leadIdx = this.leads.findIndex(l => l.id === newCheck.leadId);
      if (leadIdx !== -1) lead = this.leads[leadIdx];
    } else if (deal?.leadId) {
      leadIdx = this.leads.findIndex(l => l.id === deal.leadId);
      if (leadIdx !== -1) {
        lead = this.leads[leadIdx];
        newCheck.leadId = lead.id;
        newCheck.leadTitle = newCheck.leadTitle || lead.title;
      }
    }

    // Save partial check or pending review state on deal
    if (deal) {
      deal.pendingGateCheck = newCheck;
      if (newCheck.partialState) {
        deal.partialGateState = newCheck.partialState;
      }
      if (newCheck.status === 'pending_review') {
        deal.status = 'Pending Review';
      }
    }

    // Save pending review state on lead
    if (lead) {
      lead.pendingGateCheck = newCheck;
      if (newCheck.status === 'pending_review') {
        lead.status = 'Pending Review';
      }
    }

    // If pending review, automatically generate approval task for Manager & Admin users
    if (newCheck.status === 'pending_review') {
      const reviewers = this.users.filter(u => u.active && (u.role === 'Manager' || u.role === 'Admin'));
      const todayStr = new Date().toISOString().split('T')[0];
      const entityTitle = newCheck.leadTitle || newCheck.dealTitle || deal?.title || lead?.title || 'Lead Opportunity';
      const entityId = deal?.id || lead?.id || newCheck.dealId || newCheck.leadId;
      const entityType = deal ? 'Deal' : 'Lead';

      reviewers.forEach(rev => {
        // Check if an approval task already exists for this check and reviewer
        const existingTask = this.tasks.find(t => 
          (t.stageGateCheckId === newCheck.id || (t.linkedId === entityId && t.type === 'Approval' && t.status === 'pending')) && 
          t.ownerId === rev.id
        );
        if (!existingTask) {
          this.tasks.unshift({
            id: `tsk-appr-${Date.now()}-${rev.id}`,
            title: `[Stage Approval Required] ${entityTitle}: ${newCheck.fromStageName || 'Current Stage'} ➔ ${newCheck.targetStageName || 'Target Stage'}`,
            dueDate: todayStr,
            type: 'Approval',
            linkedType: entityType,
            linkedId: entityId,
            linkedTitle: entityTitle,
            ownerId: rev.id,
            ownerName: rev.name,
            status: 'pending',
            stageGateCheckId: newCheck.id,
            answers: newCheck.answers || {},
            repObservations: newCheck.note || '',
            submittedBy: newCheck.submittedBy || 'u-3',
            submittedByName: newCheck.submittedByName || 'Sales Rep',
            fromStageName: newCheck.fromStageName || '',
            targetStageName: newCheck.targetStageName || '',
            createdAt: todayStr,
          });
        }
      });

      this.logAudit({
        actorId: newCheck.submittedBy || 'u-3',
        actorName: newCheck.submittedByName || 'Sales Rep',
        action: 'APPROVAL_REQUESTED',
        entityType: entityType,
        entityId: entityId,
        entityTitle: entityTitle,
        fromStage: newCheck.fromStageName || '',
        toStage: newCheck.targetStageName || '',
        reason: `Submitted stage advancement request for Manager approval. Note: ${newCheck.note || 'N/A'}`,
        metadata: { checkId: newCheck.id, answers: newCheck.answers }
      });
    }

    return newCheck;
  }

  approveStageGateCheck(id, reviewer) {
    const cleanId = String(id).replace('v-task-', '');
    let checkIdx = this.stageGateChecks.findIndex(c => c.id === cleanId || c.dealId === cleanId || c.leadId === cleanId);
    let check = null;

    if (checkIdx !== -1) {
      check = this.stageGateChecks[checkIdx];
    }

    const dealIdx = this.deals.findIndex(d => d.id === cleanId || d.leadId === cleanId || (check && d.id === check.dealId));
    let dealObj = dealIdx !== -1 ? this.deals[dealIdx] : null;

    const leadIdx = this.leads.findIndex(l => l.id === cleanId || (dealObj && l.id === dealObj.leadId) || (check && l.id === check.leadId));
    let leadObj = leadIdx !== -1 ? this.leads[leadIdx] : null;

    if (!check && (dealObj || leadObj)) {
      const targetStageId = dealObj?.pendingGateCheck?.targetStageId || leadObj?.pendingGateCheck?.targetStageId;
      const sortedStages = [...this.stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const curStageId = dealObj?.stageId || leadObj?.stageId;
      const curStageName = dealObj?.stageName || leadObj?.stageName;
      const curIdx = sortedStages.findIndex(s => s.id === curStageId || s.name === curStageName);
      const nextStg = targetStageId 
        ? sortedStages.find(s => s.id === targetStageId) 
        : (curIdx !== -1 && curIdx + 1 < sortedStages.length ? sortedStages[curIdx + 1] : sortedStages[0]);

      check = {
        id: `sgc-${Date.now()}`,
        dealId: dealObj?.id,
        leadId: leadObj?.id,
        dealTitle: dealObj?.title,
        leadTitle: leadObj?.title,
        fromStageName: curStageName || 'Current Stage',
        targetStageId: nextStg?.id,
        targetStageName: nextStg?.name,
        submittedBy: dealObj?.pendingGateCheck?.submittedById || leadObj?.pendingGateCheck?.submittedById || 'u-3',
        submittedByName: dealObj?.pendingGateCheck?.submittedByName || leadObj?.pendingGateCheck?.submittedByName || 'Sales Rep',
        outcome: 'advanced',
        status: 'pending_review'
      };
      this.stageGateChecks.unshift(check);
    }

    if (check) {
      check.status = 'approved_and_executed';
      check.reviewedBy = reviewer?.id || 'u-1';
      check.reviewedByName = reviewer?.name || 'Alex Vance';
      check.reviewedAt = new Date().toISOString();

      // Update associated approval tasks to completed
      this.tasks = this.tasks.map(t => {
        const matchesCheck = t.stageGateCheckId === check.id;
        const matchesEntity = (t.linkedId === check.dealId || t.linkedId === check.leadId || t.linkedId === cleanId) && t.type === 'Approval';
        if (matchesCheck || matchesEntity) {
          return {
            ...t,
            status: 'done',
            reviewedByName: reviewer?.name || 'Alex Vance',
            resolution: 'Approved'
          };
        }
        return t;
      });

      this.executeGateCheckTransition(check);

      this.logAudit({
        actorId: reviewer?.id || 'u-1',
        actorName: reviewer?.name || 'Alex Vance',
        action: 'APPROVAL_APPROVED',
        entityType: check.dealId ? 'Deal' : 'Lead',
        entityId: check.dealId || check.leadId || cleanId,
        entityTitle: check.dealTitle || check.leadTitle || 'Opportunity',
        fromStage: check.fromStageName,
        toStage: check.targetStageName,
        reason: `Stage Gate Check approved by ${reviewer?.name || 'Manager'}. Advanced to "${check.targetStageName}".`,
        metadata: { checkId: check.id }
      });

      return check;
    }

    if (dealObj) {
      delete dealObj.pendingGateCheck;
      dealObj.status = 'Active';
    }
    if (leadObj) {
      delete leadObj.pendingGateCheck;
      leadObj.status = 'Qualified';
    }

    return { success: true, id: cleanId };
  }

  rejectStageGateCheck(id, reviewer, reason) {
    const cleanId = String(id).replace('v-task-', '');
    let checkIdx = this.stageGateChecks.findIndex(c => c.id === cleanId || c.dealId === cleanId || c.leadId === cleanId);
    let check = null;

    if (checkIdx !== -1) {
      check = this.stageGateChecks[checkIdx];
    }

    // Clear pending status on deal
    const dealIdx = this.deals.findIndex(d => d.id === cleanId || d.leadId === cleanId || (check && d.id === check.dealId));
    if (dealIdx !== -1) {
      delete this.deals[dealIdx].pendingGateCheck;
      this.deals[dealIdx].status = 'Follow up';
      
      const targetLeadId = this.deals[dealIdx].leadId;
      if (targetLeadId) {
        const leadIdx = this.leads.findIndex(l => l.id === targetLeadId);
        if (leadIdx !== -1) {
          delete this.leads[leadIdx].pendingGateCheck;
          this.leads[leadIdx].status = 'Follow up';
        }
      }
    }

    const leadIdx = this.leads.findIndex(l => l.id === cleanId || (check && l.id === check.leadId));
    if (leadIdx !== -1) {
      delete this.leads[leadIdx].pendingGateCheck;
      this.leads[leadIdx].status = 'Follow up';
    }

    if (check) {
      check.status = 'rejected';
      check.reviewedBy = reviewer?.id || 'u-1';
      check.reviewedByName = reviewer?.name || 'Alex Vance';
      check.rejectionReason = reason || 'Requirements not met';
    }

    // Update associated approval tasks
    this.tasks = this.tasks.map(t => {
      const matchesCheck = check && t.stageGateCheckId === check.id;
      const matchesEntity = (t.linkedId === cleanId || (check && (t.linkedId === check.dealId || t.linkedId === check.leadId))) && t.type === 'Approval';
      if (matchesCheck || matchesEntity) {
        return {
          ...t,
          status: 'done',
          reviewedByName: reviewer?.name || 'Alex Vance',
          resolution: 'Rejected',
          rejectionReason: reason || 'Requirements not met'
        };
      }
      return t;
    });

    this.logAudit({
      actorId: reviewer?.id || 'u-1',
      actorName: reviewer?.name || 'Alex Vance',
      action: 'APPROVAL_REJECTED',
      entityType: (dealIdx !== -1 || check?.dealId) ? 'Deal' : 'Lead',
      entityId: this.deals[dealIdx]?.id || check?.dealId || this.leads[leadIdx]?.id || cleanId,
      entityTitle: this.deals[dealIdx]?.title || check?.dealTitle || this.leads[leadIdx]?.title || 'Opportunity',
      reason: `Stage Gate Check rejected: ${reason || 'Requirements not met'}`,
      metadata: { checkId: check?.id, rejectionReason: reason }
    });

    return check || { success: true, id: cleanId };
  }

  executeGateCheckTransition(check) {
    const todayStr = new Date().toISOString().split('T')[0];
    const dealIdx = check.dealId ? this.deals.findIndex(d => d.id === check.dealId) : -1;
    const leadIdx = check.leadId ? this.leads.findIndex(l => l.id === check.leadId) : (dealIdx !== -1 && this.deals[dealIdx].leadId ? this.leads.findIndex(l => l.id === this.deals[dealIdx].leadId) : -1);

    if (dealIdx !== -1) {
      const deal = this.deals[dealIdx];
      delete deal.pendingGateCheck;
      deal.daysInStage = 0;
      deal.updatedAt = todayStr;
      deal.lastActivityDate = todayStr;

      if (check.outcome === 'advanced') {
        deal.stageId = check.targetStageId;
        deal.stageName = check.targetStageName;
        deal.status = check.targetStageName === 'Closed Won' ? 'Won' : 'Active';

        if (check.targetStageName === 'Closed Won') {
          deal.actualCloseDate = todayStr;
          const sevenDaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
          this.createTask({
            title: `[Post-Sale Check-in] Fulfillment & Delivery check for ${deal.companyName || deal.title}`,
            dueDate: sevenDaysStr,
            type: 'Follow-up',
            linkedType: 'Deal',
            linkedId: deal.id,
            linkedTitle: deal.title,
            ownerId: deal.ownerId,
            ownerName: deal.ownerName,
            status: 'pending',
            note: 'Closed Won deal converted. Confirm order delivery and client satisfaction.'
          });
        }

        if (leadIdx !== -1) {
          this.leads[leadIdx].status = check.targetStageName === 'Closed Won' ? 'Converted' : 'Qualified';
          this.leads[leadIdx].lastActivityDate = todayStr;
          delete this.leads[leadIdx].pendingGateCheck;
        }

        this.createActivity({
          type: check.targetStageName === 'Closed Won' ? 'Deal Won' : 'Stage Advanced',
          description: `Stage Gate Check passed: Deal advanced to "${check.targetStageName}".`,
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          authorId: check.submittedBy || 'u-1',
          authorName: check.submittedByName || 'System',
          isOutbound: false,
        });
      } else if (check.outcome === 'lost') {
        const lostStage = this.stages.find(s => s.name === 'Closed Lost') || { id: 'stg-8', name: 'Closed Lost' };
        deal.stageId = lostStage.id;
        deal.stageName = lostStage.name;
        deal.status = 'Lost';
        deal.lostReason = check.lostReason || 'Unspecified';
        deal.lostReasonNote = check.note || '';

        if (leadIdx !== -1) {
          this.leads[leadIdx].status = 'Unqualified';
          this.leads[leadIdx].lastActivityDate = todayStr;
          delete this.leads[leadIdx].pendingGateCheck;
        }

        this.createActivity({
          type: 'Deal Lost',
          description: `Stage Gate Check failed: Deal moved to Closed Lost. Reason: ${check.lostReason}. Note: ${check.note || 'N/A'}`,
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          authorId: check.submittedBy || 'u-1',
          authorName: check.submittedByName || 'System',
          isOutbound: false,
        });
      } else if (check.outcome === 'demoted') {
        // Move backwards to target stage
        deal.stageId = check.targetStageId;
        deal.stageName = check.targetStageName;
        deal.backwardReason = check.backwardReason || 'Unspecified';
        deal.backwardNote = check.note || '';

        this.createActivity({
          type: 'Stage Demoted',
          description: `Deal moved backwards to "${check.targetStageName}". Reason: ${check.backwardReason}. Note: ${check.note || 'N/A'}`,
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          authorId: check.submittedBy || 'u-1',
          authorName: check.submittedByName || 'System',
          isOutbound: false,
        });
      }
    } else if (leadIdx !== -1) {
      // Direct lead transition without separate deal
      const lead = this.leads[leadIdx];
      delete lead.pendingGateCheck;
      lead.lastActivityDate = todayStr;

      if (check.outcome === 'advanced') {
        lead.stageId = check.targetStageId;
        lead.stageName = check.targetStageName;
        lead.status = check.targetStageName === 'Closed Won' ? 'Converted' : 'Qualified';

        this.createActivity({
          type: 'Stage Advanced',
          description: `Stage Gate Check passed: Lead advanced to "${check.targetStageName}".`,
          linkedType: 'Lead',
          linkedId: lead.id,
          linkedTitle: lead.title,
          authorId: check.submittedBy || 'u-1',
          authorName: check.submittedByName || 'System',
          isOutbound: false,
        });
      } else if (check.outcome === 'lost') {
        lead.status = 'Unqualified';
        lead.lostReason = check.lostReason || 'Unspecified';
        this.createActivity({
          type: 'Lead Lost',
          description: `Stage Gate Check failed: Lead marked Unqualified. Reason: ${check.lostReason}. Note: ${check.note || 'N/A'}`,
          linkedType: 'Lead',
          linkedId: lead.id,
          linkedTitle: lead.title,
          authorId: check.submittedBy || 'u-1',
          authorName: check.submittedByName || 'System',
          isOutbound: false,
        });
      }
    }
  }

  // Import
  importContacts(items) {
    const created = items.map((item, i) => ({
      id: `cnt-imp-${Date.now()}-${i}`,
      name: item.name || 'Imported Contact',
      email: item.email || '',
      phone: item.phone || '',
      jobTitle: item.jobTitle || 'Contact',
      companyId: item.companyId || '',
      companyName: item.companyName || 'Imported Co',
      ownerId: 'u-1',
      ownerName: 'Alex Vance',
      customFields: item.customFields || {},
      createdAt: new Date().toISOString().split('T')[0],
    }));
    this.contacts.unshift(...created);
    return created;
  }
}

export const crmStore = new CRMStore();
