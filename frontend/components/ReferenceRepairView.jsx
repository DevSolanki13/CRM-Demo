import { RecordSelect } from './RecordSelect.jsx';
import { useEffect, useState } from 'react';
import { fetchUnresolvedLinks, resolveHistoricalLink } from '../api/crmClient.js';

const collections = { Deal: 'deals', Lead: 'leads', Contact: 'contacts', Company: 'companies',
  Task: 'tasks', Activity: 'activities' };

export function ReferenceRepairView({ records, onResolved }) {
  const [links, setLinks] = useState([]);
  const [choices, setChoices] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchUnresolvedLinks().then(items => { if (active) setLinks(items); })
      .catch(err => { if (active) setError(err.message || 'Could not load broken links.'); });
    return () => { active = false; };
  }, []);

  async function repair(link) {
    const targetId = choices[link.id];
    if (!targetId) return;
    setBusyId(link.id);
    setError('');
    try {
      await resolveHistoricalLink(link.id, targetId);
      setLinks(previous => previous.filter(item => item.id !== link.id));
      await onResolved();
    } catch (err) { setError(err.message || 'Could not repair this link.'); }
    finally { setBusyId(null); }
  }

  return <section className="max-w-4xl rounded-2xl border border-[#E3E6EA] bg-white p-6 space-y-5">
    <div>
      <h2 className="text-lg font-bold">Repair historical links</h2>
      <p className="mt-1 text-sm text-[#5B6472]">These records refer to a missing customer record. Compare their history before choosing a replacement. The original ID stays in the reconciliation log.</p>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {links.length === 0 ? <p className="rounded-lg bg-[#F0FDF4] p-4 text-sm text-[#255B40]">No unresolved links remain.</p> :
      <div className="space-y-3">{links.map(link => {
        const record = records[collections[link.recordType]]?.find(item => item.id === link.recordId);
        const options = records[collections[link.targetType]] || [];
        return <div key={link.id} className="rounded-xl border border-[#E3E6EA] p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">{link.recordType}: {record?.title || record?.name || record?.description || link.recordId}</p>
            <p className="mt-1 text-xs text-[#5B6472] break-all">Record ID: {link.recordId} · Missing {link.targetType} ID: {link.targetId}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold">Replacement {link.targetType.toLowerCase()}
              <RecordSelect resource={collections[link.targetType]} value={choices[link.id] || ''}
                label={link.targetType.toLowerCase()} excludeId={link.recordId}
                onChange={id => setChoices(previous => ({ ...previous, [link.id]: id }))} />
            </label>
            <button type="button" disabled={!choices[link.id] || busyId !== null} onClick={() => repair(link)}
              className="rounded-lg bg-[#1D4E63] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busyId === link.id ? 'Saving…' : 'Repair link'}
            </button>
          </div>
        </div>;
      })}</div>}
  </section>;
}
