import { useEffect, useState } from 'react';
import { Calendar, Mail, RefreshCw, Unplug } from 'lucide-react';
import { fetchIntegrationStatus, connectGoogleWorkspace, queueCommunicationSync, disconnectCommunication } from '../api/crmClient.js';
import { formatDateTime } from '../utils/crmHelpers.js';

export function ConnectionsView() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(() => {
    const result = new URLSearchParams(window.location.hash.split('?')[1] || '').get('connection');
    return result === 'connected' ? 'Google Workspace connected. Your first sync is queued.'
      : result === 'declined' ? 'Connection cancelled. You can connect again when ready.'
      : result === 'failed' ? 'The connection could not be completed. Try connecting again.' : '';
  });
  async function refresh() {
    try { setState(await fetchIntegrationStatus()); setError(''); }
    catch (err) { setError(err.message || 'Could not load your connections.'); }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);
  async function act(callback) {
    setBusy(true); setError(''); setNotice('');
    try { await callback(); await refresh(); }
    catch (err) { setError(err.message || 'Could not update this connection.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-4xl space-y-6 p-4 text-[var(--ink)] sm:p-8">
    <div>
      <h1 className="font-display text-2xl font-bold">Your connections</h1>
      <p className="mt-2 max-w-prose text-sm text-[var(--ink-muted)]">Bring customer email and meetings into CRM history. Only items matched to one of your contacts or leads are imported.</p>
    </div>
    {error && <div role="alert" className="rounded-xl bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger)]">
      {error} <button type="button" className="underline" onClick={refresh}>Try again</button>
    </div>}
    {notice && <p role="status" className="rounded-xl bg-[var(--primary-subtle)] p-4 text-sm text-[var(--primary)]">{notice}</p>}
    {!state && !error && <p role="status">Loading connections…</p>}
    {state && <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail size={20} aria-hidden="true" />Google Workspace<Calendar size={18} aria-hidden="true" /></h2>
          <p className="mt-2 max-w-prose text-sm text-[var(--ink-muted)]">Sync email subjects, participants, and calendar events, starting with the past 30 days. Each account requires your consent.</p>
        </div>
        <button type="button" disabled={busy || !state.configured || !state.canConnect}
          onClick={() => act(async () => { const { url } = await connectGoogleWorkspace(); window.location.assign(url); })}
          className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:opacity-50">
          {busy ? 'Working…' : state.connections.length ? 'Reconnect Google Workspace' : 'Connect Google Workspace'}
        </button>
      </div>
      {!state.configured && <p className="text-sm text-[var(--ink-muted)]">Google Workspace has not been enabled for this workspace. Ask your administrator to enable it.</p>}
      {!state.canConnect && <p className="text-sm text-[var(--ink-muted)]">Sign in with a personal CRM account before connecting email and calendar.</p>}
      {state.connections.map(connection => <div key={connection.id} className="space-y-3 border-t border-[var(--border)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="break-all text-sm font-semibold">{connection.accountEmail}</p>
          <span className="text-xs font-semibold text-[var(--primary)]">{connection.lockedUntil && new Date(connection.lockedUntil) > new Date() ? 'Syncing' : ({ connected: 'Connected', error: 'Retry scheduled', needs_reauth: 'Reconnect required' })[connection.status]}</span>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">{connection.lastSyncAt ? `Last synced ${formatDateTime(connection.lastSyncAt)}` : 'First sync queued'}</p>
        {connection.lastError && <p role="status" className="text-sm text-[var(--danger)]">{connection.lastError}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || connection.status === 'needs_reauth'}
            onClick={() => act(async () => { await queueCommunicationSync(connection.id); setNotice('Sync queued.'); })}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-50"><RefreshCw size={15} aria-hidden="true" />Queue sync</button>
          <button type="button" disabled={busy} onClick={() => act(async () => {
            const result = await disconnectCommunication(connection.id);
            setNotice(result.revoked ? 'Google Workspace disconnected.' : 'CRM sync disconnected. You can also remove CRM access in your Google account’s connected apps.');
          })} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] disabled:opacity-50"><Unplug size={15} aria-hidden="true" />Disconnect</button>
        </div>
      </div>)}
      <p className="text-xs text-[var(--ink-muted)]">Disconnecting stops future syncing. Imported CRM history stays available.</p>
    </div>}
  </section>;
}
