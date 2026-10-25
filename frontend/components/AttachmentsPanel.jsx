import React, { useEffect, useState } from 'react';
import { Download, FileText, Upload, Trash2 } from 'lucide-react';
import { deleteAttachment, getAttachmentDownload, listAttachments, uploadAttachment } from '../api/crmClient.js';

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSION_TYPES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  txt: 'text/plain', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const readableSize = size => size < 1024 * 1024
  ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function AttachmentsPanel({ recordType, recordId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listAttachments(recordType, recordId).then(rows => { if (active) setItems(rows); })
      .catch(problem => { if (active) setError(problem.message || 'Could not load files.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordType, recordId]);

  const addFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const contentType = EXTENSION_TYPES[extension];
    if (!contentType || !file.size || file.size > MAX_BYTES) {
      setError('Choose a PDF, image, text, CSV, Word, or Excel file up to 5 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await readBase64(file);
      const created = await uploadAttachment({ recordType, recordId, filename: file.name,
        contentType, size: file.size, data });
      setItems(previous => [created, ...previous]);
    } catch (problem) { setError(problem.message || 'Could not upload the file.'); }
    finally { setBusy(false); }
  };

  const download = async id => {
    setError('');
    try {
      const { url } = await getAttachmentDownload(id);
      window.location.assign(url);
    } catch (problem) { setError(problem.message || 'Could not open the file.'); }
  };

  const remove = async id => {
    setBusy(true);
    setError('');
    try {
      await deleteAttachment(id);
      setItems(previous => previous.filter(item => item.id !== id));
      setConfirmId(null);
    } catch (problem) { setError(problem.message || 'Could not remove the file.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-4 text-sm" aria-label="Record files">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#12161C]">Files</h3>
          <p className="mt-1 text-xs text-[#5B6472]">PDF, image, text, CSV, Word or Excel, up to 5 MB each.</p>
        </div>
        <label className={`inline-flex items-center gap-2 rounded-lg bg-[#1D4E63] px-3 py-2 text-xs font-bold text-white focus-within:outline-2 focus-within:outline-[#1D4E63] ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-[#153B4B]'}`}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Working…' : 'Add file'}
          <input type="file" className="sr-only" disabled={busy} onChange={addFile}
            accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx" aria-label="Choose attachment" />
        </label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-[#FDF2F1] p-3 text-[#922D27]">{error}</p>}
      {loading ? <p role="status" className="text-[#5B6472]">Loading files…</p>
        : !items.length ? <p className="rounded-lg bg-[#F6F7F8] p-4 text-[#5B6472]">No files attached yet.</p>
          : <ul className="divide-y divide-[#E3E6EA] rounded-xl border border-[#E3E6EA]">
              {items.map(item => <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                <FileText className="h-4 w-4 text-[#1D4E63]" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-all font-semibold text-[#12161C]">{item.filename}</span>
                <span className="text-xs text-[#5B6472]">{readableSize(item.size)}</span>
                <button onClick={() => download(item.id)} className="rounded-lg px-2 py-1.5 text-[#1D4E63] hover:bg-[#EFF6F9] focus-visible:outline-2 focus-visible:outline-[#1D4E63]" aria-label={`Download ${item.filename}`}>
                  <Download className="h-4 w-4" />
                </button>
                {confirmId === item.id ? <button disabled={busy} onClick={() => remove(item.id)}
                  className="rounded-lg bg-[#FDF2F1] px-2 py-1.5 text-xs font-bold text-[#922D27] disabled:opacity-50">Confirm remove</button>
                  : <button disabled={busy} onClick={() => setConfirmId(item.id)}
                    className="rounded-lg px-2 py-1.5 text-[#922D27] hover:bg-[#FDF2F1] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#922D27]" aria-label={`Remove ${item.filename}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>}
              </li>)}
            </ul>}
    </section>
  );
}
