const MAX_WORKBOOK_SIZE = 10 * 1024 * 1024;
const isEmptyCell = value => value == null || (typeof value === 'string' && !value.trim());

export async function parseRecurringLeadWorkbook(file) {
  if (!file) throw new Error('Choose an Excel workbook to upload.');
  if (!/\.(xlsx|xls)$/i.test(file.name || '')) {
    throw new Error('Choose an .xlsx or .xls workbook.');
  }
  if (file.size > MAX_WORKBOOK_SIZE) {
    throw new Error('The workbook must be 10 MB or smaller.');
  }

  const XLSX = await import('@e965/xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets.Sheet1;
  if (!sheet) throw new Error('The workbook must contain a Sheet1 worksheet.');

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
  const header = rows[0];
  if (!Array.isArray(header)) {
    throw new Error('Sheet1 must contain a header row with a Name column.');
  }

  const nameColumn = header.findIndex(
    value => typeof value === 'string' && value.trim().toLowerCase() === 'name'
  );
  if (nameColumn === -1) {
    throw new Error('Could not find a Name column in Sheet1.');
  }

  const dataRows = rows.slice(1);
  while (dataRows.length && dataRows.at(-1).every(isEmptyCell)) {
    dataRows.pop();
  }
  return dataRows.map(row => row[nameColumn] ?? null);
}
