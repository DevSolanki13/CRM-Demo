import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  initialUsers, 
  initialCompanies, 
  initialContacts, 
  initialLeads, 
  initialStages, 
  initialDeals, 
  initialTasks, 
  initialNotes, 
  initialActivities, 
  initialBranding 
} from "./src/data/initialData.js";
import { 
  User, 
  Company, 
  Contact, 
  Lead, 
  PipelineStage, 
  Deal, 
  Task, 
  Note, 
  ActivityLog, 
  CRMBrandingSettings 
} from "./src/types/crm.js";

interface CRMState {
  branding: CRMBrandingSettings;
  users: User[];
  companies: Company[];
  contacts: Contact[];
  leads: Lead[];
  stages: PipelineStage[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  activities: ActivityLog[];
}

// In-Memory CRM Store (persisted during container lifetime)
let crmState: CRMState = {
  branding: { ...initialBranding },
  users: [ ...initialUsers ],
  companies: [ ...initialCompanies ],
  contacts: [ ...initialContacts ],
  leads: [ ...initialLeads ],
  stages: [ ...initialStages ],
  deals: [ ...initialDeals ],
  tasks: [ ...initialTasks ],
  notes: [ ...initialNotes ],
  activities: [ ...initialActivities ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API ROUTES ---

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get complete CRM state
  app.get("/api/state", (_req, res) => {
    res.json(crmState);
  });

  // Reset demo state
  app.post("/api/state/reset", (_req, res) => {
    crmState = {
      branding: JSON.parse(JSON.stringify(initialBranding)),
      users: JSON.parse(JSON.stringify(initialUsers)),
      companies: JSON.parse(JSON.stringify(initialCompanies)),
      contacts: JSON.parse(JSON.stringify(initialContacts)),
      leads: JSON.parse(JSON.stringify(initialLeads)),
      stages: JSON.parse(JSON.stringify(initialStages)),
      deals: JSON.parse(JSON.stringify(initialDeals)),
      tasks: JSON.parse(JSON.stringify(initialTasks)),
      notes: JSON.parse(JSON.stringify(initialNotes)),
      activities: JSON.parse(JSON.stringify(initialActivities))
    };
    res.json({ success: true, state: crmState });
  });

  // Branding & Settings
  app.put("/api/branding", (req, res) => {
    crmState.branding = { ...crmState.branding, ...req.body };
    res.json(crmState.branding);
  });

  // Companies
  app.get("/api/companies", (_req, res) => {
    res.json(crmState.companies);
  });

  app.post("/api/companies", (req, res) => {
    const newCompany: Company = {
      id: `c-${Date.now()}`,
      name: req.body.name || 'New Company',
      industry: req.body.industry || 'General',
      website: req.body.website || '',
      address: req.body.address || '',
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    crmState.companies.unshift(newCompany);
    res.status(201).json(newCompany);
  });

  app.put("/api/companies/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.companies.findIndex(c => c.id === id);
    if (index !== -1) {
      crmState.companies[index] = { ...crmState.companies[index], ...req.body };
      res.json(crmState.companies[index]);
    } else {
      res.status(404).json({ error: "Company not found" });
    }
  });

  app.delete("/api/companies/:id", (req, res) => {
    const { id } = req.params;
    crmState.companies = crmState.companies.filter(c => c.id !== id);
    res.json({ success: true });
  });

  // Contacts
  app.get("/api/contacts", (_req, res) => {
    res.json(crmState.contacts);
  });

  app.post("/api/contacts", (req, res) => {
    const comp = crmState.companies.find(c => c.id === req.body.companyId);
    const owner = crmState.users.find(u => u.id === req.body.ownerId);

    const newContact: Contact = {
      id: `cnt-${Date.now()}`,
      name: req.body.name || 'New Contact',
      email: req.body.email || '',
      phone: req.body.phone || '',
      jobTitle: req.body.jobTitle || '',
      companyId: req.body.companyId || '',
      companyName: comp ? comp.name : (req.body.companyName || ''),
      ownerId: req.body.ownerId || (crmState.users[0]?.id || ''),
      ownerName: owner ? owner.name : 'Unassigned',
      customFields: req.body.customFields || {},
      createdAt: new Date().toISOString().split('T')[0]
    };
    crmState.contacts.unshift(newContact);
    res.status(201).json(newContact);
  });

  app.put("/api/contacts/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.contacts.findIndex(c => c.id === id);
    if (index !== -1) {
      const comp = crmState.companies.find(c => c.id === req.body.companyId);
      const owner = crmState.users.find(u => u.id === req.body.ownerId);

      crmState.contacts[index] = { 
        ...crmState.contacts[index], 
        ...req.body,
        companyName: comp ? comp.name : crmState.contacts[index].companyName,
        ownerName: owner ? owner.name : crmState.contacts[index].ownerName
      };
      res.json(crmState.contacts[index]);
    } else {
      res.status(404).json({ error: "Contact not found" });
    }
  });

  app.delete("/api/contacts/:id", (req, res) => {
    const { id } = req.params;
    crmState.contacts = crmState.contacts.filter(c => c.id !== id);
    res.json({ success: true });
  });

  // Leads
  app.get("/api/leads", (_req, res) => {
    res.json(crmState.leads);
  });

  app.post("/api/leads", (req, res) => {
    const owner = crmState.users.find(u => u.id === req.body.ownerId);

    const newLead: Lead = {
      id: `ld-${Date.now()}`,
      title: req.body.title || 'New Opportunity Lead',
      contactName: req.body.contactName || '',
      contactEmail: req.body.contactEmail || '',
      contactPhone: req.body.contactPhone || '',
      companyName: req.body.companyName || '',
      source: req.body.source || 'Website',
      isOutbound: req.body.isOutbound ?? (req.body.source === 'Cold Outbound' || req.body.source === 'LinkedIn'),
      status: req.body.status || 'New',
      ownerId: req.body.ownerId || crmState.users[0]?.id || '',
      ownerName: owner ? owner.name : 'Unassigned',
      customFields: req.body.customFields || {},
      notes: req.body.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      lastActivityDate: new Date().toISOString().split('T')[0]
    };
    crmState.leads.unshift(newLead);

    // Log Activity
    crmState.activities.unshift({
      id: `act-${Date.now()}`,
      type: newLead.isOutbound ? 'Outbound Call' : 'Inbound Email',
      description: `New ${newLead.isOutbound ? 'Outbound' : 'Inbound'} lead created: ${newLead.title}`,
      timestamp: new Date().toISOString(),
      linkedType: 'Lead',
      linkedId: newLead.id,
      linkedTitle: newLead.title,
      authorId: newLead.ownerId,
      authorName: newLead.ownerName || 'User',
      isOutbound: newLead.isOutbound
    });

    res.status(201).json(newLead);
  });

  app.put("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.leads.findIndex(l => l.id === id);
    if (index !== -1) {
      const owner = crmState.users.find(u => u.id === req.body.ownerId);
      crmState.leads[index] = { 
        ...crmState.leads[index], 
        ...req.body,
        ownerName: owner ? owner.name : crmState.leads[index].ownerName,
        lastActivityDate: new Date().toISOString().split('T')[0]
      };
      res.json(crmState.leads[index]);
    } else {
      res.status(404).json({ error: "Lead not found" });
    }
  });

  app.delete("/api/leads/:id", (req, res) => {
    const { id } = req.params;
    crmState.leads = crmState.leads.filter(l => l.id !== id);
    res.json({ success: true });
  });

  // Pipeline Stages
  app.get("/api/stages", (_req, res) => {
    res.json(crmState.stages.sort((a, b) => a.order - b.order));
  });

  app.post("/api/stages", (req, res) => {
    const newStage: PipelineStage = {
      id: `stg-${Date.now()}`,
      name: req.body.name || 'New Stage',
      order: crmState.stages.length + 1,
      category: req.body.category || 'New',
      color: req.body.color || '#3b82f6'
    };
    crmState.stages.push(newStage);
    res.status(201).json(newStage);
  });

  app.put("/api/stages/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.stages.findIndex(s => s.id === id);
    if (index !== -1) {
      crmState.stages[index] = { ...crmState.stages[index], ...req.body };
      res.json(crmState.stages[index]);
    } else {
      res.status(404).json({ error: "Stage not found" });
    }
  });

  // Deals
  app.get("/api/deals", (_req, res) => {
    res.json(crmState.deals);
  });

  app.post("/api/deals", (req, res) => {
    const stage = crmState.stages.find(s => s.id === req.body.stageId) || crmState.stages[0];
    const contact = crmState.contacts.find(c => c.id === req.body.contactId);
    const company = crmState.companies.find(c => c.id === req.body.companyId);
    const owner = crmState.users.find(u => u.id === req.body.ownerId);

    const nowStr = new Date().toISOString().split('T')[0];
    const newDeal: Deal = {
      id: `dl-${Date.now()}`,
      title: req.body.title || 'New Deal',
      value: Number(req.body.value) || 0,
      currency: req.body.currency || 'USD',
      stageId: stage.id,
      stageName: stage.name,
      expectedCloseDate: req.body.expectedCloseDate || nowStr,
      contactId: req.body.contactId || '',
      contactName: contact ? contact.name : '',
      companyId: req.body.companyId || '',
      companyName: company ? company.name : '',
      ownerId: req.body.ownerId || crmState.users[0]?.id || '',
      ownerName: owner ? owner.name : 'Unassigned',
      isRecurring: req.body.isRecurring ?? true,
      recurrenceDays: Number(req.body.recurrenceDays) || crmState.branding.defaultRecurrenceDays || 60,
      status: stage.category === 'Won' ? 'Won' : stage.category === 'Lost' ? 'Lost' : stage.category === 'Buy Again' ? 'Renewal Due' : 'Active',
      createdAt: nowStr,
      updatedAt: nowStr,
      daysInStage: 0
    };

    crmState.deals.unshift(newDeal);

    // Log Activity
    crmState.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'Status Changed',
      description: `Deal created in stage "${stage.name}" with value $${newDeal.value.toLocaleString()}`,
      timestamp: new Date().toISOString(),
      linkedType: 'Deal',
      linkedId: newDeal.id,
      linkedTitle: newDeal.title,
      authorId: newDeal.ownerId,
      authorName: newDeal.ownerName || 'User',
      isOutbound: true
    });

    res.status(201).json(newDeal);
  });

  app.put("/api/deals/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.deals.findIndex(d => d.id === id);
    if (index !== -1) {
      const oldDeal = crmState.deals[index];
      const stage = req.body.stageId ? crmState.stages.find(s => s.id === req.body.stageId) : undefined;
      const owner = req.body.ownerId ? crmState.users.find(u => u.id === req.body.ownerId) : undefined;

      const nowStr = new Date().toISOString().split('T')[0];
      
      let newStatus = oldDeal.status;
      let actualCloseDate = oldDeal.actualCloseDate;
      let nextRenewalDate = oldDeal.nextRenewalDate;

      if (stage) {
        if (stage.category === 'Won') {
          newStatus = 'Won';
          actualCloseDate = nowStr;
          if (oldDeal.isRecurring) {
            const days = oldDeal.recurrenceDays || crmState.branding.defaultRecurrenceDays || 60;
            const renDate = new Date();
            renDate.setDate(renDate.getDate() + days);
            nextRenewalDate = renDate.toISOString().split('T')[0];
          }
        } else if (stage.category === 'Lost') {
          newStatus = 'Lost';
        } else if (stage.category === 'Buy Again') {
          newStatus = 'Renewal Due';
        } else {
          newStatus = 'Active';
        }
      }

      const updatedDeal: Deal = {
        ...oldDeal,
        ...req.body,
        stageName: stage ? stage.name : (req.body.stageName || oldDeal.stageName),
        ownerName: owner ? owner.name : oldDeal.ownerName,
        status: newStatus,
        actualCloseDate,
        nextRenewalDate,
        updatedAt: nowStr,
        daysInStage: stage && stage.id !== oldDeal.stageId ? 0 : oldDeal.daysInStage
      };

      crmState.deals[index] = updatedDeal;

      // Log status change activity if stage changed
      if (stage && stage.id !== oldDeal.stageId) {
        crmState.activities.unshift({
          id: `act-${Date.now()}`,
          type: 'Status Changed',
          description: `Moved deal from "${oldDeal.stageName}" to "${stage.name}"`,
          timestamp: new Date().toISOString(),
          linkedType: 'Deal',
          linkedId: updatedDeal.id,
          linkedTitle: updatedDeal.title,
          authorId: updatedDeal.ownerId,
          authorName: updatedDeal.ownerName || 'User',
          isOutbound: true
        });
      }

      res.json(updatedDeal);
    } else {
      res.status(404).json({ error: "Deal not found" });
    }
  });

  app.delete("/api/deals/:id", (req, res) => {
    const { id } = req.params;
    crmState.deals = crmState.deals.filter(d => d.id !== id);
    res.json({ success: true });
  });

  // Automatic Repeat Order / Renewal Automation Check
  app.post("/api/deals/check-renewals", (_req, res) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const buyAgainStage = crmState.stages.find(s => s.category === 'Buy Again') || crmState.stages[crmState.stages.length - 1];

    let flippedCount = 0;

    crmState.deals = crmState.deals.map(deal => {
      // Check if deal was Won, is recurring, and its renewal date is past or today
      if (deal.status === 'Won' && deal.isRecurring && deal.nextRenewalDate && deal.nextRenewalDate <= todayStr) {
        flippedCount++;
        const updated: Deal = {
          ...deal,
          stageId: buyAgainStage.id,
          stageName: buyAgainStage.name,
          status: 'Renewal Due',
          daysInStage: 1,
          updatedAt: todayStr
        };

        // Create a Renewal Task
        crmState.tasks.unshift({
          id: `tsk-${Date.now()}-${flippedCount}`,
          title: `Follow up on repeat order for ${deal.title}`,
          dueDate: todayStr,
          type: 'Renewal Check-in',
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          ownerId: deal.ownerId,
          ownerName: deal.ownerName,
          status: 'pending',
          createdAt: todayStr
        });

        // Log Activity
        crmState.activities.unshift({
          id: `act-${Date.now()}-${flippedCount}`,
          type: 'Status Changed',
          description: `Recurring cycle (${deal.recurrenceDays || 60} days) reached! Status automatically flipped to Buy Again / Renewal Due.`,
          timestamp: new Date().toISOString(),
          linkedType: 'Deal',
          linkedId: deal.id,
          linkedTitle: deal.title,
          authorId: 'u-1',
          authorName: 'System Automation',
          isOutbound: false
        });

        return updated;
      }
      return deal;
    });

    res.json({ success: true, flippedCount, state: crmState });
  });

  // Tasks / Follow-ups
  app.get("/api/tasks", (_req, res) => {
    res.json(crmState.tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const owner = crmState.users.find(u => u.id === req.body.ownerId);
    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: req.body.title || 'Follow up item',
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      type: req.body.type || 'Call',
      linkedType: req.body.linkedType || 'Contact',
      linkedId: req.body.linkedId || '',
      linkedTitle: req.body.linkedTitle || 'General',
      ownerId: req.body.ownerId || crmState.users[0]?.id || '',
      ownerName: owner ? owner.name : 'Unassigned',
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    crmState.tasks.unshift(newTask);
    res.status(201).json(newTask);
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      crmState.tasks[index] = { ...crmState.tasks[index], ...req.body };
      res.json(crmState.tasks[index]);
    } else {
      res.status(404).json({ error: "Task not found" });
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    crmState.tasks = crmState.tasks.filter(t => t.id !== id);
    res.json({ success: true });
  });

  // Notes & Activity Logs
  app.get("/api/notes", (_req, res) => {
    res.json(crmState.notes);
  });

  app.post("/api/notes", (req, res) => {
    const newNote: Note = {
      id: `nt-${Date.now()}`,
      text: req.body.text || '',
      timestamp: new Date().toISOString(),
      authorId: req.body.authorId || 'u-1',
      authorName: req.body.authorName || 'Alex Vance',
      linkedType: req.body.linkedType || 'Contact',
      linkedId: req.body.linkedId || ''
    };
    crmState.notes.unshift(newNote);

    // Also record in Activity Log
    crmState.activities.unshift({
      id: `act-${Date.now()}`,
      type: 'Note Added',
      description: `Note: "${newNote.text.substring(0, 80)}${newNote.text.length > 80 ? '...' : ''}"`,
      timestamp: newNote.timestamp,
      linkedType: newNote.linkedType as any,
      linkedId: newNote.linkedId,
      authorId: newNote.authorId,
      authorName: newNote.authorName,
      isOutbound: true
    });

    res.status(201).json(newNote);
  });

  app.get("/api/activities", (_req, res) => {
    res.json(crmState.activities);
  });

  app.post("/api/activities", (req, res) => {
    const newActivity: ActivityLog = {
      id: `act-${Date.now()}`,
      type: req.body.type || 'Outbound Call',
      description: req.body.description || '',
      timestamp: new Date().toISOString(),
      linkedType: req.body.linkedType || 'Contact',
      linkedId: req.body.linkedId || '',
      linkedTitle: req.body.linkedTitle || '',
      authorId: req.body.authorId || 'u-1',
      authorName: req.body.authorName || 'User',
      isOutbound: req.body.isOutbound ?? true
    };
    crmState.activities.unshift(newActivity);
    res.status(201).json(newActivity);
  });

  // Users / Employees
  app.get("/api/users", (_req, res) => {
    res.json(crmState.users);
  });

  app.post("/api/users", (req, res) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: req.body.name || 'New Employee',
      email: req.body.email || 'employee@company.com',
      role: req.body.role || 'Sales Rep',
      active: req.body.active ?? true,
      avatarUrl: req.body.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    };
    crmState.users.push(newUser);
    res.status(201).json(newUser);
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = crmState.users.findIndex(u => u.id === id);
    if (index !== -1) {
      crmState.users[index] = { ...crmState.users[index], ...req.body };
      res.json(crmState.users[index]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Bulk CSV Import API
  app.post("/api/import/contacts", (req, res) => {
    const items = req.body.items || [];
    const addedContacts: Contact[] = [];

    items.forEach((item: any) => {
      const newContact: Contact = {
        id: `cnt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name || 'Imported Contact',
        email: item.email || '',
        phone: item.phone || '',
        jobTitle: item.jobTitle || 'Contact',
        companyId: item.companyId || crmState.companies[0]?.id || '',
        companyName: item.companyName || crmState.companies[0]?.name || 'General',
        ownerId: item.ownerId || crmState.users[0]?.id || 'u-1',
        ownerName: crmState.users.find(u => u.id === item.ownerId)?.name || 'Alex Vance',
        createdAt: new Date().toISOString().split('T')[0]
      };
      crmState.contacts.unshift(newContact);
      addedContacts.push(newContact);
    });

    res.status(201).json({ count: addedContacts.length, contacts: addedContacts });
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CRM Express server running on http://localhost:${PORT}`);
  });
}

startServer();
