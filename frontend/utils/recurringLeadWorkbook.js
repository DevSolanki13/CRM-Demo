const MAX_WORKBOOK_SIZE = 10 * 1024 * 1024;
const isEmptyCell = value => value == null || (typeof value === 'string' && !value.trim());

const normalizeHeader = value =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

function findColumn(headers, aliases) {
  const aliasSet = new Set(aliases);
  return headers.findIndex(header => aliasSet.has(normalizeHeader(header)));
}

function cellText(value) {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  return String(value);
}

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
    raw: false,
    defval: null,
    blankrows: true,
  });
  const header = rows[0];
  if (!Array.isArray(header)) {
    throw new Error('Sheet1 must contain a header row with a Name or Company Name column.');
  }

  const columns = {
    companyName: findColumn(header, ['name', 'companyname', 'businessname']),
    firstName: findColumn(header, ['firstname']),
    lastName: findColumn(header, ['lastname']),
    contactEmail: findColumn(header, ['email', 'emailaddress']),
    contactPhone: findColumn(header, ['phone', 'telephone']),
    alternatePhone: findColumn(header, ['mobilephone', 'mobile', 'cellphone', 'cell']),
  };
  if (columns.companyName === -1) {
    throw new Error('Could not find a Name or Company Name column in Sheet1.');
  }

  const dataRows = rows.slice(1);
  while (dataRows.length && dataRows.at(-1).every(isEmptyCell)) {
    dataRows.pop();
  }
  return dataRows.map(row => {
    const firstName = cellText(row[columns.firstName]);
    const lastName = cellText(row[columns.lastName]);
    const contactName = [firstName, lastName].filter(Boolean).join(' ') || null;

    return {
      companyName: cellText(row[columns.companyName]),
      contactName,
      contactEmail: cellText(row[columns.contactEmail]),
      contactPhone: cellText(row[columns.contactPhone]),
      alternatePhone: cellText(row[columns.alternatePhone]),
    };
  });
}
