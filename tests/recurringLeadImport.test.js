import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as XLSX from '@e965/xlsx';
import { authorizeCRM } from '../backend/auth/permissions.js';
import {
  clearRecurringLeads,
  classifyRecurringLeadImport,
  getRecurringLeadTitle,
  importRecurringLeads,
  previewRecurringLeadImport,
} from '../backend/services/leadService.js';
import { clearRecurringLeadsSchema, validatedInput } from '../backend/middleware/validation.js';
import { prisma } from '../backend/prisma.js';
import { parseRecurringLeadWorkbook } from '../frontend/utils/recurringLeadWorkbook.js';

function workbookFile(extension, rows, sheetName = 'Sheet1', extraSheets = []) {
  const workbook = XLSX.utils.book_new();
  for (const [name, sheetRows] of extraSheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheetRows), name);
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  const data = XLSX.write(workbook, { type: 'array', bookType: extension === 'xls' ? 'biff8' : 'xlsx' });
  return {
    name: `companies.${extension}`,
    size: data.byteLength,
    arrayBuffer: async () => data,
  };
}

function clearRecurringLeadsDatabase(leads, linkedRecordCounts = {}) {
  const auditEntries = [];
  const transaction = {
    $queryRaw: async () => leads.filter(lead => lead.isRecurring).map(({ id, title }) => ({ id, title })),
    deal: { count: async () => linkedRecordCounts.deals || 0 },
    task: { count: async () => linkedRecordCounts.tasks || 0 },
    note: { count: async () => linkedRecordCounts.notes || 0 },
    activity: { count: async () => linkedRecordCounts.activities || 0 },
    attachment: { count: async () => linkedRecordCounts.attachments || 0 },
    auditLog: { createMany: async ({ data }) => auditEntries.push(...data) },
    lead: {
      deleteMany: async ({ where }) => {
        const toDelete = new Set(where.id.in);
        const retained = leads.filter(lead => !toDelete.has(lead.id) || !lead.isRecurring);
        const count = leads.length - retained.length;
        leads.splice(0, leads.length, ...retained);
        return { count };
      },
    },
  };
  return {
    auditEntries,
    database: { $transaction: operation => operation(transaction) },
  };
}

describe('recurring lead workbook import', () => {
  it('uses the contact person as the recurring lead name and falls back to the company', () => {
    expect(getRecurringLeadTitle({ companyName: 'Acme Ltd', contactName: 'Ada Lovelace' }))
      .toBe('Ada Lovelace');
    expect(getRecurringLeadTitle({ companyName: 'Acme Ltd', contactName: null }))
      .toBe('Acme Ltd');
  });

  it.each(['xlsx', 'xls'])('reads the Name column and empty rows from .%s workbooks', async extension => {
    const file = workbookFile(extension, [
      ['Company', ' NAME ', 'First Name', 'Last Name', 'Email', 'Phone', 'Mobile Phone'],
      ['source', ' Acme Ltd ', 'Ada', 'Lovelace', 'ada@example.com', '555-0101', '555-0102'],
      [null, null, null, null, null, null, null],
      ['source', 'Beta Ltd', 'Grace', 'Hopper', 'grace@example.com', '555-0111', '555-0112'],
    ]);

    await expect(parseRecurringLeadWorkbook(file)).resolves.toEqual([
      {
        companyName: ' Acme Ltd ',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '555-0101',
        alternatePhone: '555-0102',
      },
      {
        companyName: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        alternatePhone: null,
      },
      {
        companyName: 'Beta Ltd',
        contactName: 'Grace Hopper',
        contactEmail: 'grace@example.com',
        contactPhone: '555-0111',
        alternatePhone: '555-0112',
      },
    ]);
  });

  it('rejects unsupported files and workbooks without a company name column', async () => {
    await expect(parseRecurringLeadWorkbook({
      name: 'companies.csv',
      size: 10,
    })).rejects.toThrow('.xlsx or .xls');

    const missingCompanyName = workbookFile(
      'xlsx',
      [['First Name', 'Email'], ['Ada', 'ada@example.com']],
      'Contacts',
      [['Notes', [['Contact directory', 'Updated'], ['Example', 'Today']]]]
    );
    await expect(parseRecurringLeadWorkbook(missingCompanyName)).rejects.toThrow('in any worksheet');
  });

  it('finds the data worksheet even when it is not named Sheet1 or the first tab', async () => {
    const file = workbookFile(
      'xlsx',
      [['Company Name', 'Email'], ['Acme Ltd', 'ada@example.com']],
      'Customer List',
      [['Cover', [['Report'], ['Generated for review']]]]
    );

    await expect(parseRecurringLeadWorkbook(file)).resolves.toEqual([{
      companyName: 'Acme Ltd',
      contactName: null,
      contactEmail: 'ada@example.com',
      contactPhone: null,
      alternatePhone: null,
    }]);
  });

  it('recognizes common contact header variations', async () => {
    const file = workbookFile('xlsx', [
      ['Company Name', 'First Name', 'Last Name', 'Email Address', 'Telephone', 'Cell Phone'],
      ['Acme Ltd', 'Ada', 'Lovelace', 'ada@example.com', '555-0101', '555-0102'],
    ]);

    await expect(parseRecurringLeadWorkbook(file)).resolves.toEqual([{
      companyName: 'Acme Ltd',
      contactName: 'Ada Lovelace',
      contactEmail: 'ada@example.com',
      contactPhone: '555-0101',
      alternatePhone: '555-0102',
    }]);
  });

  it('trims names and classifies workbook and existing recurring duplicates case-insensitively', () => {
    const preview = classifyRecurringLeadImport(
      [
        { companyName: ' Acme Ltd ', contactEmail: 'ada@example.com' },
        { companyName: 'acme ltd' },
        { companyName: 'Known Company' },
        { companyName: '' },
        { companyName: null },
      ],
      [{ title: 'Known Opportunity', companyName: ' Known Company ' }]
    );

    expect(preview.rows.map(row => row.status)).toEqual([
      'ready',
      'duplicate-workbook',
      'already-exists',
      'invalid',
      'invalid',
    ]);
    expect(preview.stats).toMatchObject({
      totalRows: 5,
      readyToImport: 1,
      skippedDuplicates: 2,
      duplicateEntriesInWorkbook: 1,
      alreadyExisting: 1,
      invalidRows: 2,
    });
  });

  it('classifies names containing null bytes as invalid without querying them', async () => {
    const preview = await previewRecurringLeadImport([{ companyName: 'Invalid\u0000Name' }]);
    expect(preview.rows[0].status).toBe('invalid');
    expect(preview.stats.invalidRows).toBe(1);
  });

  it('rejects non-admin bulk imports', async () => {
    await expect(importRecurringLeads([], {
      id: 'rep-1',
      name: 'Sales Rep',
      role: 'Sales Rep',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each(['Sales Rep', 'Manager'])('blocks %s access to preview and import endpoints', async role => {
    const error = await new Promise(resolve => authorizeCRM({
      path: '/leads/recurring-import/preview',
      method: 'POST',
      user: { id: 'test-user', name: 'Test User', role },
      body: { rows: [] },
    }, {}, resolve));

    expect(error).toMatchObject({ statusCode: 403 });
  });

  it('allows admins through the bulk import permission gate', async () => {
    const next = await new Promise(resolve => authorizeCRM({
      path: '/leads/recurring-import/import',
      method: 'POST',
      user: { id: 'u-1', name: 'Admin', role: 'Admin' },
      body: { rows: [] },
    }, {}, resolve));

    expect(next).toBeUndefined();
  });

  it('requires an administrator and explicit confirmation to clear recurring leads', async () => {
    await expect(clearRecurringLeads({ role: 'Manager' }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(() => validatedInput(clearRecurringLeadsSchema, { confirmation: 'delete' }))
      .toThrow('Invalid input');

    const error = await new Promise(resolve => authorizeCRM({
      path: '/leads/recurring-import/clear',
      method: 'POST',
      user: { id: 'manager-1', name: 'Manager', role: 'Manager' },
      body: { confirmation: 'DELETE' },
    }, {}, resolve));
    expect(error).toMatchObject({ statusCode: 403 });
  });

  it('clears only unlinked recurring leads and retains their deletion audit records', async () => {
    const suffix = randomUUID();
    const recurringIds = [`ld-clear-one-${suffix}`, `ld-clear-two-${suffix}`];
    const regularId = `ld-keep-regular-${suffix}`;
    const leads = [
      { id: recurringIds[0], title: 'Clear One', isRecurring: true },
      { id: recurringIds[1], title: 'Clear Two', isRecurring: true },
      { id: regularId, title: 'Keep Regular', isRecurring: false },
    ];
    const actor = { id: 'u-1', name: 'Admin', role: 'Admin' };
    const blockedState = clearRecurringLeadsDatabase(leads, { notes: 1 });
    await expect(clearRecurringLeads(actor, blockedState.database)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('No leads were deleted'),
      });
    expect(leads).toHaveLength(3);
    expect(blockedState.auditEntries).toHaveLength(0);

    const clearState = clearRecurringLeadsDatabase(leads);
    await expect(clearRecurringLeads(actor, clearState.database)).resolves.toEqual({ deletedCount: 2 });
    expect(leads).toEqual([{ id: regularId, title: 'Keep Regular', isRecurring: false }]);
    expect(clearState.auditEntries).toHaveLength(2);
    expect(clearState.auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityId: recurringIds[0],
        action: 'RECORD_DELETED',
        metadata: { recordId: recurringIds[0], bulkAction: 'clear-recurring-leads' },
      }),
      expect.objectContaining({
        entityId: recurringIds[1],
        action: 'RECORD_DELETED',
        metadata: { recordId: recurringIds[1], bulkAction: 'clear-recurring-leads' },
      }),
    ]));
    await expect(clearRecurringLeads(actor, clearState.database)).resolves.toEqual({ deletedCount: 0 });
  });

  it('persists imported leads and rechecks duplicates when the same workbook is submitted again', async () => {
    const suffix = randomUUID();
    const importName = `Bulk Import ${suffix}`;
    const parallelName = `Concurrent Import ${suffix}`;
    const existingName = `Existing Import ${suffix}`;
    const existingId = `ld-existing-import-${suffix}`;
    const rows = [
      {
        companyName: importName,
        contactName: ' Ada Lovelace ',
        contactEmail: ' ada@example.com ',
        contactPhone: ' 555-0101 ',
        alternatePhone: ' 555-0102 ',
      },
      { companyName: ` ${importName.toLowerCase()} ` },
      { companyName: existingName },
      { companyName: null },
      { companyName: '  ' },
    ];
    try {
      await prisma.lead.create({
        data: {
          id: existingId,
          title: existingName,
          companyName: existingName,
          isRecurring: true,
        },
      });

      const before = await previewRecurringLeadImport(rows);
      expect(before.stats.readyToImport).toBe(1);

      const result = await importRecurringLeads(rows, { id: 'u-1', name: 'Admin', role: 'Admin' });
      expect(result.stats).toMatchObject({
        totalRows: 5,
        successfullyImported: 1,
        skippedDuplicates: 2,
        duplicateEntriesInWorkbook: 1,
        alreadyExisting: 1,
        invalidRows: 2,
        failedRecords: 0,
      });
      expect(result.rows.find(row => row.companyName === importName).status).toBe('imported');
      expect(result.rows.find(row => row.companyName === importName)).toMatchObject({
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '555-0101',
        alternatePhone: '555-0102',
      });

      const saved = await prisma.lead.findMany({ where: { companyName: importName } });
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        title: 'Ada Lovelace',
        companyName: importName,
        isRecurring: true,
        recurrenceFrequency: 'monthly',
        recurrenceDate: '2026-12-01',
        recurrenceInterval: 1,
        nextRecurrenceDate: '2027-01-01',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '555-0101',
        alternatePhone: '555-0102',
        category: null,
        location: null,
        notes: null,
        lastContactedDate: null,
        nextFollowUpDate: null,
        ownerId: null,
      });

      const existing = await prisma.lead.findUnique({ where: { id: existingId } });
      expect(existing).toMatchObject({
        title: existingName,
        companyName: existingName,
        isRecurring: true,
      });

      const retry = await importRecurringLeads(rows, {
        id: 'u-1',
        name: 'Admin',
        role: 'Admin',
      });
      expect(retry.stats.successfullyImported).toBe(0);
      expect(retry.stats.alreadyExisting).toBe(2);
      expect(await prisma.lead.count({ where: { companyName: importName } })).toBe(1);

      const simultaneous = await Promise.all([
        importRecurringLeads([{ companyName: parallelName }], { id: 'u-1', name: 'Admin', role: 'Admin' }),
        importRecurringLeads([{ companyName: parallelName }], { id: 'u-1', name: 'Admin', role: 'Admin' }),
      ]);
      expect(simultaneous.reduce((total, response) => total + response.stats.successfullyImported, 0)).toBe(1);
      expect(await prisma.lead.count({ where: { title: parallelName } })).toBe(1);
    } finally {
      const imported = await prisma.lead.findMany({
        where: {
          OR: [
            { title: { in: [importName, importName.toLowerCase(), parallelName] } },
            { companyName: { in: [importName, importName.toLowerCase(), parallelName] } },
          ],
        },
        select: { id: true },
      });
      const ids = [...imported.map(lead => lead.id), existingId];
      await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
      await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    }
  });
});
