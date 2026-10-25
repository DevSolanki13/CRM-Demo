import { useState } from 'react';

export function MergeCustomerDialog({ kind, records, initialTargetId, onClose, onMerge }) {
  const [targetId, setTargetId] = useState(initialTargetId);
  const [sourceId, setSourceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const target = records.find(record => record.id === targetId);
  const source = records.find(record => record.id === sourceId);

  async function submit(event) {
    event.preventDefault();
    if (!target || !source || target.id === source.id) return;
    setBusy(true);
    setError('');
    try { await onMerge(target.id, source.id); onClose(); }
    catch (err) { setError(err.message || 'Could not merge these records.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <form role="dialog" aria-modal="true" aria-labelledby="merge-title" onSubmit={submit}
      className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 text-[#12161C] shadow-[0_8px_24px_rgba(18,22,28,0.12)]">
      <div>
        <h2 id="merge-title" className="text-lg font-bold">Merge {kind.toLowerCase()} records</h2>
        <p className="mt-2 text-sm text-[#5B6472]">Choose the record to keep. Deals, tasks, notes, and activity links move to it. The merge is recorded in the audit history.</p>
      </div>
      <label className="block text-sm font-semibold">Keep this {kind.toLowerCase()}
        <select required value={targetId} onChange={event => setTargetId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-[#E3E6EA] bg-white p-3">
          {records.map(record => <option key={record.id} value={record.id}>{record.name}{record.email ? ` · ${record.email}` : ''}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Merge this record into it
        <select required value={sourceId} onChange={event => setSourceId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-[#E3E6EA] bg-white p-3">
          <option value="">Select a duplicate record</option>
          {records.filter(record => record.id !== targetId).map(record =>
            <option key={record.id} value={record.id}>{record.name}{record.email ? ` · ${record.email}` : ''}</option>)}
        </select>
      </label>
      {source && <p className="rounded-lg bg-[#EFF6F9] p-3 text-sm text-[#1D4E63]">
        “{source.name}” will be removed after its links move to “{target.name}”.
      </p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#E3E6EA] px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={busy || !source || !target || source.id === target.id}
          className="rounded-lg bg-[#1D4E63] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Merging…' : 'Merge records'}</button>
      </div>
    </form>
  </div>;
}
