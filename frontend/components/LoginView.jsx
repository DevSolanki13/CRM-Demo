import { useState } from 'react';

export function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--canvas)] p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">Sign in to Sales CRM</h1>
          <p className="mt-2 text-sm text-[#5B6472]">Use the account provided by your administrator.</p>
        </div>
        <label className="block text-sm font-semibold">Email
          <input autoComplete="username" type="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <label className="block text-sm font-semibold">Password
          <input autoComplete="current-password" type="password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-[#1D4E63] p-3 font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}

export function AcceptInvitationView({ onAccept }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setBusy(true);
    try { await onAccept(password); }
    catch (err) { setError(err.message || 'Could not set your password. Ask for a new link.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen flex items-center justify-center bg-[var(--canvas)] p-6">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Set your password</h1>
        <p className="mt-2 text-sm text-[#5B6472]">Use this one-time link to activate or recover your account.</p>
      </div>
      <label className="block text-sm font-semibold">New password
        <input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
      </label>
      <label className="block text-sm font-semibold">Confirm password
        <input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#1D4E63] p-3 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Set password'}</button>
    </form>
  </main>;
}
