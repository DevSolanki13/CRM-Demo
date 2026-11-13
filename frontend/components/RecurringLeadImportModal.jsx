import { Skeleton, SkeletonStatus } from './skeletons/primitives.jsx';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { previewRecurringLeadImport } from '../api/crmClient.js';
import { parseRecurringLeadWorkbook } from '../utils/recurringLeadWorkbook.js';
import { LeadScheduleFields } from './LeadScheduleFields.jsx';
import { getDefaultLeadRecurrenceDate } from '../../shared/leadRecurrence.js';

const previewLimit = 250;

const rowStatus = {
  ready: { label: 'Ready', className: 'bg-[#EFF6F9] text-[#1D4E63]' },
  imported: { label: 'Imported', className: 'bg-[#EDF7F0] text-[#255B40]' },
  'duplicate-workbook': { label: 'Duplicate in workbook', className: 'bg-[#FEF8EC] text-[#805500]' },
  'already-exists': { label: 'Already recurring', className: 'bg-[#FEF8EC] text-[#805500]' },
  invalid: { label: 'Empty or invalid', className: 'bg-[#F6F7F8] text-[#5B6472]' },
  failed: { label: 'Failed', className: 'bg-[#FDF2F1] text-[#922D27]' },
};

function Summary({ stats, completed }) {
  const values = completed
    ? [
        ['Total rows', stats.totalRows],
        ['Imported', stats.successfullyImported],
        ['Duplicate rows', stats.duplicateEntriesInWorkbook],
        ['Already recurring', stats.alreadyExisting],
        ['Invalid / empty', stats.invalidRows],
        ['Failed', stats.failedRecords],
      ]
    : [
        ['Total rows', stats.totalRows],
        ['Ready to import', stats.readyToImport],
        ['Duplicate rows', stats.duplicateEntriesInWorkbook],
        ['Already recurring', stats.alreadyExisting],
        ['Invalid / empty', stats.invalidRows],
      ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-xl bg-[#F6F7F8] p-4">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold text-[#5B6472]">{label}</dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-[#12161C]">
            {Number(value || 0).toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RecurringLeadImportModal({ isOpen, onClose, onImport, onImported, users = [] }) {
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const busyRef = useRef(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [schedule, setSchedule] = useState({ recurrenceDate: getDefaultLeadRecurrenceDate(), recurrenceFrequency: 'monthly', recurrenceInterval: 1, recurrenceDays: [] });
  const [ownerId, setOwnerId] = useState('');

  const busy = isReading || isImporting;
  busyRef.current = busy;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const focusable = () => [...(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || [])];
    focusable()[0]?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();
        elements.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === elements.at(-1)) {
        event.preventDefault();
        elements[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stats = result?.stats || preview?.stats;

  const reset = () => {
    setFileName('');
    setRows([]);
    setPreview(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setResult(null);
    setRows([]);
    setError('');
    setIsReading(true);
    try {
      const importedRows = await parseRecurringLeadWorkbook(file);
      setRows(importedRows);
      setPreview(await previewRecurringLeadImport(importedRows));
    } catch (readError) {
      setError(readError.message || 'Could not read this workbook.');
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length || !onImport) return;
    setError('');
    setIsImporting(true);
    try {
      if (!schedule.recurrenceDate || !Number.isInteger(Number(schedule.recurrenceInterval)) || Number(schedule.recurrenceInterval) < 1) throw new Error('Choose a start date and a positive repeat interval.');
      if (schedule.recurrenceFrequency === 'monthly_dates' && !schedule.recurrenceDays.length) throw new Error('Choose at least one day of the month.');
      const imported = await onImport(rows, { startDate: schedule.recurrenceDate, frequency: schedule.recurrenceFrequency,
        interval: Number(schedule.recurrenceInterval), days: schedule.recurrenceDays, ...(ownerId ? { ownerId } : {}) });
      setResult(imported);
      onImported?.(imported);
    } catch (importError) {
      if (importError.stats) {
        const rows = (preview?.rows || []).map(row => row.status === 'ready'
          ? { ...row, status: 'failed' }
          : row);
        setResult({ rows, stats: importError.stats });
      }
      setError(importError.message || 'Import failed. No lead changes were made.');
    } finally {
      setIsImporting(false);
    }
  };

  const displayedRows = (result?.rows || preview?.rows || []).slice(0, previewLimit);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-import-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E3E6EA] bg-[#FFFFFF] text-[#12161C] shadow-[0_8px_24px_rgba(18,22,28,0.16)]"
      >
        <header className="flex items-center justify-between border-b border-[#E3E6EA] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6F9] text-[#1D4E63]">
              <FileSpreadsheet size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 id="recurring-import-title" className="text-sm font-bold">Import companies</h2>
              <p className="mt-0.5 text-[11px] text-[#5B6472]">Add company names as recurring leads</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close import dialog"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-[#5B6472] hover:bg-[#F6F7F8] hover:text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63] disabled:opacity-40"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto p-5">
          {!result && <fieldset disabled={busy} className="space-y-3">
            <LeadScheduleFields value={schedule} onChange={setSchedule} />
            <label className="block text-sm font-semibold">Responsible rep
              <select className="mt-1 block w-full rounded-lg border border-[#E3E6EA] p-2.5" value={ownerId} onChange={event => setOwnerId(event.target.value)}>
                <option value="">Unassigned — assign before reps can act</option>{users.filter(user => user.active !== false).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          </fieldset>}
          <div className="flex flex-col gap-3 rounded-xl border border-[#E3E6EA] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold">Choose an Excel workbook</p>
              <p className="mt-1 text-[11px] text-[#5B6472]">
                A worksheet needs a Name or Company Name column. First/last name, email, phone, and mobile phone columns are mapped automatically.
              </p>
              {fileName && <p className="mt-1 truncate text-[11px] font-medium text-[#1D4E63]">{fileName}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                aria-label="Choose an Excel workbook"
                onChange={handleFile}
                disabled={busy}
                className="block min-w-0 max-w-full text-[11px] text-[#5B6472] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EFF6F9] file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-[#1D4E63] hover:file:bg-[#D8E8EF] focus-visible:outline-2 focus-visible:outline-[#1D4E63] disabled:opacity-50"
              />
              {isReading && <SkeletonStatus label="workbook"><Skeleton className="h-4 w-16" /></SkeletonStatus>}
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#F4C4C1] bg-[#FDF2F1] p-3 text-xs font-medium text-[#922D27]">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          {stats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold">{result ? 'Import results' : 'Preview'}</h3>
                {result && result.stats.successfullyImported > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#255B40]">
                    <CheckCircle2 size={14} aria-hidden="true" />Saved to recurring leads
                  </span>
                )}
              </div>
              <Summary stats={stats} completed={Boolean(result)} />
              {stats.skippedDuplicates > 0 && (
                <p className="text-[11px] text-[#5B6472]">
                  {stats.skippedDuplicates.toLocaleString()} duplicate row(s) will be skipped.
                </p>
              )}
              <div className="overflow-hidden rounded-xl border border-[#E3E6EA]">
                <div className="max-h-64 overflow-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="sticky top-0 bg-[#F6F7F8] text-[10px] uppercase tracking-wide text-[#5B6472]">
                      <tr>
                        <th scope="col" className="px-3 py-2.5">Row</th>
                        <th scope="col" className="px-3 py-2.5">Lead name</th>
                        <th scope="col" className="px-3 py-2.5">Company</th>
                        <th scope="col" className="px-3 py-2.5">Email</th>
                        <th scope="col" className="px-3 py-2.5">Phone</th>
                        <th scope="col" className="px-3 py-2.5">Mobile</th>
                        <th scope="col" className="px-3 py-2.5">Import status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E6EA]">
                      {displayedRows.map(row => {
                        const status = result && row.status === 'ready'
                          ? result.stats.failedRecords > 0 ? 'failed' : 'imported'
                          : row.status;
                        const appearance = rowStatus[status] || rowStatus.invalid;
                        return (
                          <tr key={`${row.rowNumber}-${row.companyName}`} className="bg-white">
                            <td className="px-3 py-2 text-[#5B6472] tabular-nums">{row.rowNumber}</td>
                            <td className="max-w-[240px] truncate px-3 py-2 font-medium text-[#12161C]">
                              {row.contactName || row.companyName || '—'}
                            </td>
                            <td className="max-w-[240px] truncate px-3 py-2 text-[#5B6472]">{row.companyName || '—'}</td>
                            <td className="max-w-[200px] truncate px-3 py-2 text-[#5B6472]">{row.contactEmail || '—'}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-[#5B6472]">{row.contactPhone || '—'}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-[#5B6472]">{row.alternatePhone || '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${appearance.className}`}>
                                {appearance.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedRows.length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-6 text-center text-[#5B6472]">No company rows found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {(result?.rows || preview?.rows || []).length > previewLimit && (
                  <p className="border-t border-[#E3E6EA] bg-[#F6F7F8] px-3 py-2 text-[10px] text-[#5B6472]">
                    Showing the first {previewLimit} rows; counts include every row in the workbook.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[#E3E6EA] bg-[#F6F7F8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-[#5B6472]">
            New entries recur monthly from December 1, 2026. Mapped contact details are saved with each lead.
          </p>
          <div className="flex shrink-0 justify-end gap-2">
            {result ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-xs font-semibold text-[#1D4E63] hover:bg-[#EFF6F9] focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
              >
                Import another workbook
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-[#E3E6EA] bg-white px-3 py-2 text-xs font-semibold text-[#5B6472] hover:bg-[#EEF0F3] focus-visible:outline-2 focus-visible:outline-[#1D4E63] disabled:opacity-40"
              >
                Cancel
              </button>
            )}
            {!result && (
              <button
                type="button"
                onClick={handleImport}
                disabled={busy || !preview?.stats.readyToImport || !onImport}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D4E63] px-3 py-2 text-xs font-bold text-white hover:bg-[#153B4B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting && <Skeleton className="h-3.5 w-3.5" />}
                Import {preview?.stats.readyToImport?.toLocaleString() || 0}
              </button>
            )}
            {result && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#1D4E63] px-3 py-2 text-xs font-bold text-white hover:bg-[#153B4B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63]"
              >
                Done
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
