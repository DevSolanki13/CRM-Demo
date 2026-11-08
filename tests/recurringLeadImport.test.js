import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as XLSX from '@e965/xlsx';
import { authorizeCRM } from '../backend/auth/permissions.js';
import {
  classifyRecurringLeadImport,
  importRecurringLeads,
  previewRecurringLeadImport,
} from '../backend/services/leadService.js';
import { prisma } from '../backend/prisma.js';
import { parseRecurringLeadWorkbook } from '../frontend/utils/recurringLeadWorkbook.js';

function workbookFile(extension, rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  const data = XLSX.write(workbook, { type: 'array', bookType: extension === 'xls' ? 'biff8' : 'xlsx' });
  return {
    name: `companies.${extension}`,
    size: data.byteLength,
    arrayBuffer: async () => data,
  };
}

describe('recurring lead workbook import', () => {
  it.each(['xlsx', 'xls'])('reads the Name column and empty rows from .%s workbooks', async extension => {
    const file = workbookFile(extension, [
      ['Company', ' NAME '],
      ['source', ' Acme Ltd '],
      [null, null],
      ['source', 'Beta Ltd'],
    ]);

    await expect(parseRecurringLeadWorkbook(file)).resolves.toEqual([
      ' Acme Ltd ',
      null,
      'Beta Ltd',
    ]);
  });

  it('rejects unsupported files and workbooks without the required sheet or column', async () => {
    await expect(parseRecurringLeadWorkbook({
      name: 'companies.csv',
      size: 10,
    })).rejects.toThrow('.xlsx or .xls');

    const missingSheet = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(missingSheet, XLSX.utils.aoa_to_sheet([['Name']]), 'Other');
    const missingSheetData = XLSX.write(missingSheet, { type: 'array', bookType: 'xlsx' });
    await expect(parseRecurringLeadWorkbook({
      name: 'missing-sheet.xlsx',
      size: missingSheetData.byteLength,
      arrayBuffer: async () => missingSheetData,
    })).rejects.toThrow('Sheet1');
  });

  it('trims names and classifies workbook and existing recurring duplicates case-insensitively', () => {
    const preview = classifyRecurringLeadImport(
      [' Acme Ltd ', 'acme ltd', 'Known Company', '', null],
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
    const preview = await previewRecurringLeadImport(['Invalid\u0000Name']);
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
      body: { names: [] },
    }, {}, resolve));

    expect(error).toMatchObject({ statusCode: 403 });
  });

  it('allows admins through the bulk import permission gate', async () => {
    const next = await new Promise(resolve => authorizeCRM({
      path: '/leads/recurring-import/import',
      method: 'POST',
      user: { id: 'u-1', name: 'Admin', role: 'Admin' },
      body: { names: [] },
    }, {}, resolve));

    expect(next).toBeUndefined();
  });

  it('persists imported leads and rechecks duplicates when the same workbook is submitted again', async () => {
    const suffix = randomUUID();
    const importName = `Bulk Import ${suffix}`;
    const parallelName = `Concurrent Import ${suffix}`;
    const existingName = `Existing Import ${suffix}`;
    const existingId = `ld-existing-import-${suffix}`;
    const names = [importName, ` ${importName.toLowerCase()} `, existingName, null, '  '];
    try {
      await prisma.lead.create({
        data: {
          id: existingId,
          title: existingName,
          companyName: existingName,
          isRecurring: true,
        },
      });

      const before = await previewRecurringLeadImport(names);
      expect(before.stats.readyToImport).toBe(1);

      const result = await importRecurringLeads(names, { id: 'u-1', name: 'Admin', role: 'Admin' });
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

      const saved = await prisma.lead.findMany({ where: { title: importName } });
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        title: importName,
        companyName: importName,
        isRecurring: true,
        recurrenceFrequency: 'monthly',
        recurrenceDate: '2026-12-01',
        recurrenceInterval: 1,
        nextRecurrenceDate: '2027-01-01',
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        alternatePhone: null,
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

      const retry = await importRecurringLeads(names, {
        id: 'u-1',
        name: 'Admin',
        role: 'Admin',
      });
      expect(retry.stats.successfullyImported).toBe(0);
      expect(retry.stats.alreadyExisting).toBe(2);
      expect(await prisma.lead.count({ where: { title: importName } })).toBe(1);

      const simultaneous = await Promise.all([
        importRecurringLeads([parallelName], { id: 'u-1', name: 'Admin', role: 'Admin' }),
        importRecurringLeads([parallelName], { id: 'u-1', name: 'Admin', role: 'Admin' }),
      ]);
      expect(simultaneous.reduce((total, response) => total + response.stats.successfullyImported, 0)).toBe(1);
      expect(await prisma.lead.count({ where: { title: parallelName } })).toBe(1);
    } finally {
      const imported = await prisma.lead.findMany({
        where: { title: { in: [importName, importName.toLowerCase(), parallelName] } },
        select: { id: true },
      });
      const ids = [...imported.map(lead => lead.id), existingId];
      await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
      await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    }
  });
});
