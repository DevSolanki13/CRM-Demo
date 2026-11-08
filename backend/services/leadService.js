
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { validatedInput, leadSchema, updateLeadSchema } from '../middleware/validation.js';
import { prisma } from '../prisma.js';
import { getLocalDateString } from '../utils/dateUtils.js';
import { logAudit } from './activityNoteService.js';
import { triggerFollowUp } from './followUpEngine.js';
import { deleteUnlinkedCustomerRecord } from './deletionPolicy.js';

import {
  DEFAULT_LEAD_RECURRENCE_FREQUENCY,
  DEFAULT_LEAD_RECURRENCE_INTERVAL,
  getDefaultLeadRecurrenceDate,
  getNextLeadRecurrenceDate,
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

const recurringImportStartDate = '2026-12-01';
const recurringImportFrequency = 'monthly';
const recurringImportInterval = 1;
const maxRecurringLeadImportRows = 10000;

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

export const importRecurringLeads = async (rows, actor) => {
  if (actor?.role !== 'Admin') {
    throw Object.assign(new Error('Administrator permission required.'), { statusCode: 403 });
  }
  if (!Array.isArray(rows) || rows.length > maxRecurringLeadImportRows) {
    throw Object.assign(new Error(`Provide at most ${maxRecurringLeadImportRows} company rows.`), { statusCode: 400 });
  }
  const initialPreview = classifyRecurringLeadImport(rows);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const currentPreview = await getRecurringLeadImportPreview(rows, tx);
        const currentRowsToImport = currentPreview.rows.filter(row => row.status === 'ready');
        if (currentRowsToImport.length === 0) return currentPreview;

        const now = getLocalDateString();
        const ids = currentRowsToImport.map(() => `ld-${randomUUID()}`);
        const nextRecurrenceDate = getNextLeadRecurrenceDate(
          recurringImportStartDate,
          recurringImportFrequency,
          recurringImportInterval,
          recurringImportStartDate
        );
        try {
          await tx.lead.createMany({
            data: currentRowsToImport.map((row, index) => ({
              id: ids[index],
              title: row.companyName,
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
              nextRecurrenceDate,
              lastContactedDate: null,
              nextFollowUpDate: null,
              ownerId: null,
              ownerName: null,
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
              entityTitle: row.companyName,
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

// Only monthly recurrence is supported.
const validateRecurrence = (frequency, interval) => {
  if (frequency !== 'monthly') {
    throw Object.assign(
      new Error('Only monthly recurrence is supported.'),
      { statusCode: 400 }
    );
  }

  if (!Number.isInteger(interval) || interval < 1) {
    throw Object.assign(
      new Error('Monthly recurrence interval must be at least 1.'),
      { statusCode: 400 }
    );
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
    validateRecurrence(recurrenceFrequency, recurrenceInterval);
  }

  const newLead = {
    id: lead.id || `ld-${Date.now()}`,
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

    nextRecurrenceDate: isRecurring
      ? getNextLeadRecurrenceDate(
          recurrenceDate,
          recurrenceFrequency,
          recurrenceInterval,
          recurrenceDate
        )
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

  const existing = await prisma.lead.findUnique({
    where: { id },
  });

  if (!existing) return null;

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
      recurrenceInterval
    );

    const recurrenceChanged =
      !existing.isRecurring ||
      'recurrenceFrequency' in lead ||
      'recurrenceDate' in lead ||
      'recurrenceInterval' in lead;

    data.isRecurring = true;
    data.recurrenceFrequency = recurrenceFrequency;
    data.recurrenceDate = recurrenceDate;
    data.recurrenceInterval = recurrenceInterval;

    data.nextRecurrenceDate = recurrenceChanged
      ? getNextLeadRecurrenceDate(
          recurrenceDate,
          recurrenceFrequency,
          recurrenceInterval,
          recurrenceDate
        )
      : existing.nextRecurrenceDate;
  } else {
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

  const updated = await prisma.lead.update({
    where: { id },
    data,
  });

  if (existing.isRecurring || isRecurring) {
    await logAudit({
      actorId: updated.ownerId,
      actorName: updated.ownerName,

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
    });
  }

  return updated;
};

export const refreshRecurringLeadDates = async (
  actor,
  today = getLocalDateString()
) => {
  const leads = await prisma.lead.findMany({
    where: {
      isRecurring: true,

      ...(actor && !['Admin', 'Manager'].includes(actor.role)
        ? { ownerId: actor.id }
        : {}),

      OR: [
        { nextRecurrenceDate: null },
        { nextRecurrenceDate: { lt: today } },
      ],
    },

    select: {
      id: true,
      recurrenceDate: true,
      recurrenceFrequency: true,
      recurrenceInterval: true,
      nextRecurrenceDate: true,
    },
  });

  for (const lead of leads) {
    const frequency =
      lead.recurrenceFrequency ||
      DEFAULT_LEAD_RECURRENCE_FREQUENCY;

    const startDate =
      lead.recurrenceDate ||
      getDefaultLeadRecurrenceDate();

    const interval =
      lead.recurrenceInterval ??
      DEFAULT_LEAD_RECURRENCE_INTERVAL;

    let nextDate =
      lead.nextRecurrenceDate ||
      getNextLeadRecurrenceDate(
        startDate,
        frequency,
        interval,
        startDate
      );

    if (!nextDate) continue;

    while (nextDate < today) {
      const next = getNextLeadRecurrenceDate(
        startDate,
        frequency,
        interval,
        nextDate
      );

      if (!next || next <= nextDate) break;

      nextDate = next;
    }

    if (nextDate !== lead.nextRecurrenceDate) {
      await prisma.lead.updateMany({
        where: {
          id: lead.id,
          nextRecurrenceDate: lead.nextRecurrenceDate,
        },

        data: {
          nextRecurrenceDate: nextDate,
        },
      });
    }
  }
};

export const deleteLead = async (id) => {
  return prisma.$transaction(
    tx => deleteUnlinkedCustomerRecord(tx, 'Lead', id),
    {
      isolationLevel: 'Serializable',
    }
  );
};
