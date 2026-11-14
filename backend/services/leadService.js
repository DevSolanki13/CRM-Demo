
import { randomUUID } from 'node:crypto';
import { actorContext } from '../auth/identity.js';
import { Prisma } from '@prisma/client';
import { validatedInput, leadSchema, updateLeadSchema } from '../middleware/validation.js';
import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { logAudit } from './activityNoteService.js';
import { triggerFollowUp } from './followUpEngine.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';
import { syncRecurringLead } from './leadRecurrenceService.js';
import { recordRecurringLeadReassignment, recordRecurringLeadStatusChange } from './recurringFollowUpService.js';

import {
  DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  DEFAULT_LEAD_RECURRENCE_INTERVAL,
  getDefaultLeadRecurrenceDate,
  getNextLeadRecurrenceDate,
  shiftDate,
  reminderOffsets,
} from '../../shared/leadRecurrence.js';

const LEAD_FIELDS = new Set([
  'id',
  'title',
  'contactName',
  'contactEmail',
  'contactPhone',
  'companyName',
  'alternatePhone',
  'category',
  'location',
  'notes',
  'source',
  'isOutbound',
  'status',
  'isRecurring',
  'recurrenceFrequency',
  'recurrenceDate',
  'recurrenceInterval',
  'recurrenceDays',
  'lastContactedDate',
  'nextFollowUpDate',
  'ownerId',
  'ownerName',
  'createdAt',
  'lastActivityDate',
  'pendingGateCheck',
  'customFields',
]);

const validateLeadFields = (lead) => {
  const unknown = Object.keys(lead).find(
    key => !LEAD_FIELDS.has(key)
  );

  if (unknown) {
    throw Object.assign(
      new Error(`Unknown lead field: ${unknown}`),
      { statusCode: 400 }
    );
  }
};

const optionalValue = value =>
  typeof value === 'string' && value.trim()
    ? value.trim()
    : null;

const maxRecurringLeadImportRows = 10000;
export const getRecurringLeadTitle = row => row.contactName || row.companyName;

export function classifyRecurringLeadImport(rows, existingLeads = []) {
  const existingNames = new Set();
  for (const lead of existingLeads) {
    for (const value of [lead.title, lead.companyName]) {
      if (typeof value === 'string' && value.trim()) {
        existingNames.add(value.trim().toLowerCase());
      }
    }
  }

  const seen = new Set();
  const classifiedRows = rows.map((value, index) => {
    const companyName = typeof value?.companyName === 'string' ? value.companyName.trim() : '';
    const contactName = optionalValue(value?.contactName);
    const contactEmail = optionalValue(value?.contactEmail);
    const contactPhone = optionalValue(value?.contactPhone);
    const alternatePhone = optionalValue(value?.alternatePhone);
    const row = {
      rowNumber: index + 2,
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      alternatePhone,
    };
    if (!companyName || companyName.length > 300 || companyName.includes('\0')) {
      return { ...row, status: 'invalid' };
    }

    const key = companyName.toLowerCase();
    if (seen.has(key)) {
      return { ...row, status: 'duplicate-workbook' };
    }
    seen.add(key);

    if (existingNames.has(key)) {
      return { ...row, status: 'already-exists' };
    }

    return { ...row, status: 'ready' };
  });

  const duplicateEntriesInWorkbook = classifiedRows.filter(row => row.status === 'duplicate-workbook').length;
  const alreadyExisting = classifiedRows.filter(row => row.status === 'already-exists').length;
  const invalidRows = classifiedRows.filter(row => row.status === 'invalid').length;
  const readyToImport = classifiedRows.filter(row => row.status === 'ready').length;

  return {
    rows: classifiedRows,
    stats: {
      totalRows: rows.length,
      readyToImport,
      successfullyImported: 0,
      skippedDuplicates: duplicateEntriesInWorkbook + alreadyExisting,
      duplicateEntriesInWorkbook,
      alreadyExisting,
      invalidRows,
      failedRecords: 0,
    },
  };
}

async function getRecurringLeadImportPreview(rows, database = prisma) {
  if (!Array.isArray(rows) || rows.length > maxRecurringLeadImportRows) {
    throw Object.assign(new Error(`Provide at most ${maxRecurringLeadImportRows} company rows.`), { statusCode: 400 });
  }
  const candidateNames = [...new Set(rows
    .map(value => value?.companyName)
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => value.length > 0 && value.length <= 300 && !value.includes('\0'))
    .map(value => value.toLowerCase()))];
  const existingLeads = candidateNames.length
    ? await database.$queryRaw(Prisma.sql`
        SELECT title, "companyName"
        FROM "Lead"
        WHERE "isRecurring" = TRUE
          AND (
            lower(btrim(COALESCE(title, ''))) = ANY(${candidateNames}::text[])
            OR lower(btrim(COALESCE("companyName", ''))) = ANY(${candidateNames}::text[])
          )
      `)
    : [];
  return classifyRecurringLeadImport(rows, existingLeads);
}

export const previewRecurringLeadImport = async rows =>
  getRecurringLeadImportPreview(rows);

export const importRecurringLeads = async (rows, actor, schedule) => {
  if (actor?.role !== 'Admin') {
    throw Object.assign(new Error('Administrator permission required.'), { statusCode: 403 });
  }
  if (!Array.isArray(rows) || rows.length > maxRecurringLeadImportRows) {
    throw Object.assign(new Error(`Provide at most ${maxRecurringLeadImportRows} company rows.`), { statusCode: 400 });
  }
  const initialPreview = classifyRecurringLeadImport(rows);
  const recurringImportStartDate = schedule?.startDate || getDefaultLeadRecurrenceDate();
  const recurringImportFrequency = schedule?.frequency || 'monthly';
  const recurringImportInterval = schedule?.interval || 1;
  const recurrenceDays = schedule?.days || [];
  validateRecurrence(recurringImportFrequency, recurringImportInterval, recurrenceDays);
  const owner = schedule?.ownerId ? await prisma.user.findFirst({ where: { id: schedule.ownerId, active: true }, select: { id: true, name: true } }) : null;
  if (schedule?.ownerId && !owner) throw Object.assign(new Error('Choose an active owner.'), { statusCode: 400 });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const currentPreview = await getRecurringLeadImportPreview(rows, tx);
        const currentRowsToImport = currentPreview.rows.filter(row => row.status === 'ready');
        if (currentRowsToImport.length === 0) return currentPreview;

        const now = getLocalDateString();
        const ids = currentRowsToImport.map(() => `ld-${randomUUID()}`);
        const nextRecurrenceDate = recurringImportFrequency === 'monthly_dates'
          ? getNextLeadRecurrenceDate(recurringImportStartDate, recurringImportFrequency, recurringImportInterval, shiftDate(recurringImportStartDate, -1), recurrenceDays)
          : recurringImportStartDate;
        try {
          await tx.lead.createMany({
            data: currentRowsToImport.map((row, index) => ({
              id: ids[index],
              title: getRecurringLeadTitle(row),
              companyName: row.companyName,
              contactName: row.contactName,
              contactEmail: row.contactEmail,
              contactPhone: row.contactPhone,
              alternatePhone: row.alternatePhone,
              category: null,
              location: null,
              notes: null,
              source: null,
              isOutbound: null,
              status: null,
              isRecurring: true,
              recurrenceFrequency: recurringImportFrequency,
              recurrenceDate: recurringImportStartDate,
              recurrenceInterval: recurringImportInterval,
              recurrenceDays,
              nextRecurrenceDate,
              lastContactedDate: null,
              nextFollowUpDate: shiftDate(nextRecurrenceDate, -reminderOffsets({ recurrenceFrequency: recurringImportFrequency, recurrenceInterval: recurringImportInterval, recurrenceDays })[0]),
              ownerId: owner?.id || null,
              ownerName: owner?.name || null,
              createdAt: now,
              lastActivityDate: null,
              pendingGateCheck: Prisma.DbNull,
              customFields: Prisma.DbNull,
            })),
          });
          await tx.auditLog.createMany({
            data: currentRowsToImport.map((row, index) => ({
              id: `aud-${randomUUID()}`,
              timestamp: new Date().toISOString(),
              actorId: actor.id,
              actorName: actor.name,
              action: 'LEAD_CREATED',
              entityType: 'Lead',
              entityId: ids[index],
              entityTitle: getRecurringLeadTitle(row),
              reason: 'Recurring lead imported from company workbook',
              metadata: {
                importSource: 'recurring-company-workbook',
                recurrenceDate: recurringImportStartDate,
                recurrenceFrequency: recurringImportFrequency,
              },
            })),
          });
        } catch (error) {
          throw Object.assign(new Error('Import failed; no leads were saved.'), {
            statusCode: 500,
            cause: error,
            importStats: {
              ...currentPreview.stats,
              readyToImport: currentRowsToImport.length,
              successfullyImported: 0,
              failedRecords: currentRowsToImport.length,
            },
          });
        }

        return {
          ...currentPreview,
          rows: currentPreview.rows.map(row => row.status === 'ready'
            ? { ...row, status: 'imported' }
            : row),
          stats: {
            ...currentPreview.stats,
            readyToImport: currentRowsToImport.length,
            successfullyImported: currentRowsToImport.length,
            failedRecords: 0,
          },
        };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if ((error.code === 'P2034' || error.cause?.code === 'P2034') && attempt < 2) continue;
      const currentStats = error.importStats || {
        ...initialPreview.stats,
        successfullyImported: 0,
        failedRecords: initialPreview.stats.readyToImport,
      };
      console.error('[Recurring lead import]', error.cause?.message || error.message);
      throw Object.assign(new Error('Import failed; no leads were saved.'), {
        statusCode: error.statusCode || 500,
        cause: error.cause || error,
        importStats: currentStats,
      });
    }
  }
};

export const clearRecurringLeads = async (actor, database = prisma) => {
  if (actor?.role !== 'Admin') {
    throw Object.assign(new Error('Administrator permission required.'), { statusCode: 403 });
  }

  return database.$transaction(async tx => {
    const leads = await tx.$queryRaw`
      SELECT id, title
      FROM "Lead"
      WHERE "isRecurring" = TRUE
      ORDER BY id
      FOR UPDATE
    `;
    if (!leads.length) return { deletedCount: 0 };

    const leadIds = leads.map(lead => lead.id);
    const [deals, tasks, notes, activities, attachments, cycles] = await Promise.all([
      tx.deal.count({ where: { leadId: { in: leadIds } } }),
      tx.task.count({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } }),
      tx.note.count({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } }),
      tx.activity.count({ where: { linkedType: 'Lead', linkedId: { in: leadIds } } }),
      tx.attachment.count({
        where: { recordType: 'Lead', recordId: { in: leadIds }, deletedAt: null },
      }),
      tx.leadRecurrenceCycle.count({ where: { leadId: { in: leadIds } } }),
    ]);
    const linkedRecordCounts = { deals, tasks, notes, activities, attachments, cycles };
    const linkedRecords = Object.entries(linkedRecordCounts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    if (linkedRecords) {
      throw Object.assign(
        new Error(`Recurring leads have linked records (${linkedRecords}). No leads were deleted. Move or remove the linked records, then try again.`),
        { statusCode: 409 }
      );
    }

    const timestamp = new Date().toISOString();
    await tx.auditLog.createMany({
      data: leads.map(lead => ({
        id: `aud-delete-${randomUUID()}`,
        timestamp,
        actorId: actor.id,
        actorName: actor.name,
        action: 'RECORD_DELETED',
        entityType: 'Lead',
        entityId: lead.id,
        entityTitle: lead.title,
        reason: 'Recurring leads cleared in bulk.',
        metadata: { recordId: lead.id, bulkAction: 'clear-recurring-leads' },
      })),
    });

    const result = await tx.lead.deleteMany({
      where: { id: { in: leadIds }, isRecurring: true },
    });
    if (result.count !== leads.length) {
      throw Object.assign(new Error('Recurring lead list changed while clearing. No leads were deleted.'), {
        statusCode: 409,
      });
    }
    return { deletedCount: result.count };
  }, { isolationLevel: 'Serializable' });
};

const validateRecurrence = (frequency, interval, days = []) => {
  if (!['monthly', 'weekly', 'custom', 'yearly', 'monthly_dates'].includes(frequency)) {
    throw Object.assign(
      new Error('Choose a supported recurrence frequency.'),
      { statusCode: 400 }
    );
  }

  if (!Number.isInteger(interval) || interval < 1) {
    throw Object.assign(
      new Error('Recurrence interval must be at least 1.'),
      { statusCode: 400 }
    );
  }
  if (['yearly', 'monthly_dates'].includes(frequency) && interval !== 1) {
    throw Object.assign(new Error('Yearly and selected-date schedules use an interval of 1.'), { statusCode: 400 });
  }
  if (frequency === 'monthly_dates' && (!days.length || days.some(day => !Number.isInteger(day) || day < 1 || day > 31))) {
    throw Object.assign(new Error('Choose at least one day of the month (1–31).'), { statusCode: 400 });
  }
};

export const getLeads = async () => {
  return await prisma.lead.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createLead = async (lead) => {
  validateLeadFields(lead);

  const hasLeadType = Object.hasOwn(lead, 'isOutbound');
  const hasStatus = Object.hasOwn(lead, 'status');

  lead = validatedInput(leadSchema, lead);

  const isRecurring = lead.isRecurring === true;

  let title = (lead.title || 'New Lead Inquiry').trim();

  if (!isRecurring && (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title))) {
    title = `Lead #${title}`;
  }

  const todayStr = getLocalDateString();

  const recurrenceFrequency = isRecurring
    ? lead.recurrenceFrequency || DEFAULT_LEAD_RECURRENCE_FREQUENCY
    : null;

  const recurrenceDate = isRecurring
    ? optionalValue(lead.recurrenceDate) || getDefaultLeadRecurrenceDate()
    : null;

  const recurrenceInterval = isRecurring
    ? lead.recurrenceInterval ?? DEFAULT_LEAD_RECURRENCE_INTERVAL
    : null;

  if (isRecurring) {
    if (recurrenceFrequency === 'custom' && lead.recurrenceInterval == null) {
      throw Object.assign(new Error('Enter the recurrence interval in days.'), { statusCode: 400 });
    }
    validateRecurrence(recurrenceFrequency, recurrenceInterval, lead.recurrenceDays);
  }

  const newLead = {
    id: lead.id || `ld-${randomUUID()}`,
    title,

    contactName: isRecurring
      ? optionalValue(lead.contactName)
      : lead.contactName || 'Unknown Prospect',

    contactEmail: isRecurring
      ? optionalValue(lead.contactEmail)
      : lead.contactEmail || '',

    contactPhone: isRecurring
      ? optionalValue(lead.contactPhone)
      : lead.contactPhone || '',

    alternatePhone: optionalValue(lead.alternatePhone),

    companyName: isRecurring
      ? optionalValue(lead.companyName)
      : lead.companyName || 'Unspecified Co',

    category: optionalValue(lead.category),
    location: optionalValue(lead.location),
    notes: optionalValue(lead.notes),

    source: isRecurring
      ? optionalValue(lead.source)
      : lead.source || 'Inbound Inquiry',

    isOutbound: isRecurring
      ? (hasLeadType ? lead.isOutbound ?? null : null)
      : lead.isOutbound ?? false,

    status: isRecurring
      ? (hasStatus ? optionalValue(lead.status) : null)
      : lead.status || 'New',

    isRecurring,
    recurrenceFrequency,
    recurrenceDate,
    recurrenceInterval,
    recurrenceDays: isRecurring ? lead.recurrenceDays || [] : [],

    nextRecurrenceDate: isRecurring
      ? recurrenceFrequency === 'monthly_dates'
        ? getNextLeadRecurrenceDate(recurrenceDate, recurrenceFrequency, recurrenceInterval, shiftDate(recurrenceDate, -1), lead.recurrenceDays)
        : recurrenceDate
      : null,

    lastContactedDate: optionalValue(lead.lastContactedDate),
    nextFollowUpDate: optionalValue(lead.nextFollowUpDate),

    ownerId: isRecurring
      ? lead.ownerId || null
      : lead.ownerId || 'u-3',

    ownerName: isRecurring
      ? lead.ownerName || null
      : lead.ownerName || 'Marcus Vance',

    pendingGateCheck: lead.pendingGateCheck || null,
    customFields: lead.customFields ?? {},

    createdAt: lead.createdAt || todayStr,

    lastActivityDate: isRecurring
      ? lead.lastActivityDate || null
      : lead.lastActivityDate || todayStr,
  };

  if (isRecurring) return prisma.$transaction(async tx => {
    const saved = await tx.lead.create({ data: newLead });
    await syncRecurringLead(tx, saved);
    await tx.auditLog.create({ data: {
      id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: actorContext.getStore()?.id || saved.ownerId || 'system',
      actorName: actorContext.getStore()?.name || saved.ownerName || 'System',
      action: 'LEAD_CREATED', entityType: 'Lead', entityId: saved.id, entityTitle: saved.title,
      reason: 'Recurring lead created with a purchase schedule.',
    } });
    return tx.lead.findUnique({ where: { id: saved.id } });
  }, { isolationLevel: 'Serializable', timeout: 15000 });

  const savedLead = await prisma.lead.upsert({
    where: {
      id: newLead.id,
    },
    update: newLead,
    create: newLead,
  });

  if (!isRecurring) {
    await triggerFollowUp('LEAD_CREATED', savedLead);
  }

  await logAudit({
    actorId: savedLead.ownerId,
    actorName: savedLead.ownerName,
    action: 'LEAD_CREATED',
    entityType: 'Lead',
    entityId: savedLead.id,
    entityTitle: savedLead.title,
    reason: `Lead created from source "${savedLead.source}"`,
    metadata: {
      source: savedLead.source,
    },
  });

  return savedLead;
};

export const updateLead = async (id, lead) => {
  validateLeadFields(lead);

  lead = validatedInput(updateLeadSchema, lead);

  return prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${id} FOR UPDATE`;
  const existing = await tx.lead.findUnique({
    where: { id },
  });

  if (!existing) return null;

  if (existing.isRecurring && 'nextFollowUpDate' in lead && optionalValue(lead.nextFollowUpDate) !== existing.nextFollowUpDate) {
    throw Object.assign(new Error('Use Update cycle to change a recurring follow-up date and record the reason.'), { statusCode: 409 });
  }

  let title = lead.title
    ? lead.title.trim()
    : existing.title;

  const isRecurring = lead.isRecurring ?? existing.isRecurring ?? false;

  if (!isRecurring && (/^\d+$/.test(title) || !/[a-zA-Z]/.test(title))) {
    title = `Lead #${title}`;
  }

  const data = {
    ...existing,
    ...lead,
    title,
    id,
    lastActivityDate: getLocalDateString(),
  };

  if (isRecurring) {
    const recurrenceFrequency =
      lead.recurrenceFrequency ||
      existing.recurrenceFrequency ||
      DEFAULT_LEAD_RECURRENCE_FREQUENCY;

    const recurrenceDate = (
      'recurrenceDate' in lead
        ? optionalValue(lead.recurrenceDate)
        : existing.recurrenceDate
    ) || getDefaultLeadRecurrenceDate();

    const recurrenceInterval =
      (
        'recurrenceInterval' in lead
          ? lead.recurrenceInterval
          : existing.recurrenceInterval
      ) ?? DEFAULT_LEAD_RECURRENCE_INTERVAL;

    validateRecurrence(
      recurrenceFrequency,
      recurrenceInterval,
      lead.recurrenceDays || existing.recurrenceDays || []
    );

    data.isRecurring = true;
    data.recurrenceFrequency = recurrenceFrequency;
    data.recurrenceDate = recurrenceDate;
    data.recurrenceInterval = recurrenceInterval;
    data.recurrenceDays = lead.recurrenceDays || existing.recurrenceDays || [];

    const currentCycle = await tx.leadRecurrenceCycle.findFirst({ where: { leadId: id, status: { notIn: ['purchased', 'not_buying'] } } });
    data.nextRecurrenceDate = currentCycle ? currentCycle.expectedDate
      : existing.isRecurring && existing.nextRecurrenceDate ? existing.nextRecurrenceDate
      : recurrenceFrequency === 'monthly_dates'
        ? getNextLeadRecurrenceDate(recurrenceDate, recurrenceFrequency, recurrenceInterval, shiftDate(recurrenceDate, -1), data.recurrenceDays)
        : recurrenceDate;
  } else {
    if (existing.isRecurring && await tx.leadRecurrenceCycle.count({ where: { leadId: id, status: { notIn: ['purchased', 'not_buying'] } } })) {
      throw Object.assign(new Error('This lead has an unresolved purchase cycle. Pause the schedule or record its outcome first.'), { statusCode: 409 });
    }
    data.isRecurring = false;
    data.recurrenceFrequency = null;
    data.recurrenceDate = null;
    data.recurrenceInterval = null;
    data.nextRecurrenceDate = null;
  }

  const optionalLeadFields = [
    'contactName',
    'contactEmail',
    'contactPhone',
    'alternatePhone',
    'companyName',
    'category',
    'location',
    'notes',
    'source',
    'status',
    'lastContactedDate',
    'nextFollowUpDate',
  ];

  for (const field of optionalLeadFields) {
    if (isRecurring && field in lead) {
      data[field] = optionalValue(lead[field]);
    }
  }

  const updated = await tx.lead.update({
    where: { id },
    data,
  });

  const actor = actorContext.getStore();
  await recordRecurringLeadStatusChange(tx, existing, updated, actor);
  await recordRecurringLeadReassignment(tx, existing, updated, actor);

  if (existing.isRecurring || isRecurring) {
    await tx.auditLog.create({ data: {
      id: `aud-${randomUUID()}`, timestamp: new Date().toISOString(),
      actorId: actorContext.getStore()?.id || updated.ownerId || 'system',
      actorName: actorContext.getStore()?.name || updated.ownerName || 'System',

      action:
        existing.isRecurring === isRecurring
          ? 'RECURRING_LEAD_UPDATED'
          : isRecurring
            ? 'LEAD_MOVED_TO_RECURRING'
            : 'LEAD_MOVED_TO_REGULAR',

      entityType: 'Lead',
      entityId: updated.id,
      entityTitle: updated.title,

      reason:
        existing.isRecurring === isRecurring
          ? 'Recurring lead details updated'
          : isRecurring
            ? 'Lead moved to recurring leads'
            : 'Recurring lead moved to regular leads',

      metadata: {
        changedFields: Object.keys(lead),
      },
    } });
  }

  if (isRecurring) {
    await syncRecurringLead(tx, updated);
    return tx.lead.findUnique({ where: { id } });
  }
  return updated;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
};

export const deleteLead = async (id) => {
  return prisma.$transaction(
    tx => deleteUnlinkedCustomerRecord(tx, 'Lead', id),
    {
      isolationLevel: 'Serializable',
    }
  );
};
