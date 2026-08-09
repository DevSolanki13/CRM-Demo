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
} from '../data/initialData.js';

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
    return this.getState();
  }

  getState() {
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
    const newLead = {
      id: `ld-${Date.now()}`,
      title: lead.title || 'New Lead Inquiry',
      contactName: lead.contactName || 'Unknown Prospect',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      companyName: lead.companyName || 'Unspecified Co',
      source: lead.source || 'Inbound Inquiry',
      isOutbound: lead.isOutbound ?? false,
      status: lead.status || 'New',
      ownerId: lead.ownerId || 'u-3',
      ownerName: lead.ownerName || 'Marcus Vance',
      createdAt: new Date().toISOString().split('T')[0],
      lastActivityDate: new Date().toISOString().split('T')[0],
      ...lead,
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  updateLead(id, lead) {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.leads[idx] = { ...this.leads[idx], ...lead, lastActivityDate: new Date().toISOString().split('T')[0] };
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
    const newDeal = {
      id: `dl-${Date.now()}`,
      leadId: deal.leadId || '',
      title: deal.title || 'New Sales Deal',
      value: deal.value || 10000,
      currency: deal.currency || 'USD',
      stageId: deal.stageId || 'stg-1',
      stageName: deal.stageName || 'New Lead',
      expectedCloseDate: deal.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      contactId: deal.contactId || '',
      contactName: deal.contactName || '',
      companyId: deal.companyId || '',
      companyName: deal.companyName || '',
      ownerId: deal.ownerId || 'u-3',
      ownerName: deal.ownerName || 'Marcus Vance',
      isRecurring: deal.isRecurring ?? false,
      recurrenceDays: deal.recurrenceDays || this.branding.defaultRecurrenceDays || 60,
      status: deal.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      daysInStage: 1,
      ...deal,
    };
    this.deals.unshift(newDeal);
    return newDeal;
  }

  updateDeal(id, deal) {
    const idx = this.deals.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.deals[idx] = {
        ...this.deals[idx],
        ...deal,
        updatedAt: new Date().toISOString().split('T')[0],
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

  triggerRenewalCheck() {
    let flippedCount = 0;
    const now = new Date();
    this.deals = this.deals.map((deal) => {
      if (deal.isRecurring && deal.status === 'Won' && deal.lastRenewalDate) {
        const lastDate = new Date(deal.lastRenewalDate);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        const cycle = deal.recurrenceDays || this.branding.defaultRecurrenceDays || 60;
        if (diffDays >= cycle) {
          flippedCount++;
          const renewalStage = this.stages.find((s) => s.category === 'Buy Again') || this.stages[6];
          return {
            ...deal,
            status: 'Renewal Due',
            stageId: renewalStage ? renewalStage.id : 'stg-7',
            stageName: renewalStage ? renewalStage.name : 'Buy Again (Renewal)',
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
      }
      return deal;
    });

    return { flippedCount, state: this.getState() };
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
