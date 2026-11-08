const MAX_WORKBOOK_SIZE = 10 * 1024 * 1024;
const isEmptyCell = value => value == null || (typeof value === 'string' && !value.trim());

const normalizeHeader = value =>
  typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

function findColumn(headers, aliases) {
  const aliasSet = new Set(aliases);
  return headers.findIndex(header => aliasSet.has(normalizeHeader(header)));
}

function getColumns(headers) {
  if (!Array.isArray(headers)) return null;
  const columns = {
    companyName: findColumn(headers, ['name', 'companyname', 'businessname']),
    firstName: findColumn(headers, ['firstname']),
    lastName: findColumn(headers, ['lastname']),
    contactEmail: findColumn(headers, ['email', 'emailaddress']),
    contactPhone: findColumn(headers, ['phone', 'telephone']),
    alternatePhone: findColumn(headers, ['mobilephone', 'mobile', 'cellphone', 'cell']),
  };
  return columns.companyName === -1 ? null : columns;
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
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: null,
      blankrows: true,
    });
    const columns = getColumns(rows[0]);
    if (!columns) continue;

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

  throw new Error('Could not find a Name or Company Name header in any worksheet.');
}
