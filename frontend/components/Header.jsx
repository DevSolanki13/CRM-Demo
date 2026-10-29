import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Briefcase, Check, ChevronDown, Menu, Plus, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { Avatar } from './DashboardPrimitives.jsx';
import { useRecordsPage } from '../hooks/useRecordsPage.js';

const pageTitles = { dashboard: 'Dashboard', leads: 'Leads', pipeline: 'Pipeline', contacts: 'Contacts', companies: 'Companies',
  tasks: 'Tasks & follow-ups', employees: 'Team & workload', reports: 'Reports', connections: 'Your connections', settings: 'Settings' };

function HeaderSearch({ onSelectResult }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const q = query.trim();
  const enabled = open && q.length >= 2;
  const leads = useRecordsPage('leads', { q, limit: 4 }, 0, enabled);
  const deals = useRecordsPage('deals', { q, limit: 4 }, 0, enabled);
  const loading = leads.loading || deals.loading;
  const error = leads.error || deals.error;
  const results = [...deals.items.map(item => ({ item, type: 'deal' })), ...leads.items.map(item => ({ item, type: 'lead' }))];
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!searchRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div className="crm-header-search" ref={searchRef} onKeyDown={event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      searchRef.current?.querySelector('input')?.focus();
      setOpen(false);
    }
    if (event.key === 'ArrowDown' && event.target.tagName === 'INPUT') {
      event.preventDefault(); searchRef.current?.querySelector('.crm-search-results button')?.focus();
    }
  }}>
    <Search size={17} aria-hidden="true" />
    <input type="search" maxLength={256} value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)} placeholder="Search leads or deals…" aria-label="Search CRM"
      aria-expanded={open} aria-controls={open ? 'crm-search-results' : undefined} autoComplete="off" />
    <kbd>⌘ K</kbd>
    {open && <div id="crm-search-results" className="crm-search-results" role="region" aria-label="Search results">
      {!enabled ? <p>Type at least two characters to search leads and deals.</p>
        : loading ? <p role="status">Searching…</p>
        : error ? <div role="alert"><p>Could not load search results.</p><button type="button" onClick={() => { leads.retry(); deals.retry(); }}>Try again</button></div>
        : results.length ? <>{results.map(({ item, type }) => <button type="button" key={type + item.id} onClick={() => {
          onSelectResult(type, item); setOpen(false); setQuery('');
        }}><span><strong>{item.title}</strong><small>{type === 'deal' ? 'Deal' : 'Lead'} · {item.companyName || item.contactName || 'No company'}</small></span><ArrowUpRight size={16} aria-hidden="true" /></button>)}
          <p>Up to four matches per record type.</p></>
        : <p>No matching leads or deals. Try another name.</p>}
    </div>}
  </div>;
}

export const Header = ({
  currentUser, activeTab = 'dashboard', onLogout, onSelectSearchResult, onOpenQuickAction,
  accounts = [], onSwitchAccount, switchingAccountId = '', accountSwitchError = '',
  isMobileMenuOpen = false, onToggleMobileMenu,
}) => <header className="crm-header" onKeyDown={event => {
  if (event.key === 'Escape') {
    const details = event.target.closest('details');
    details?.querySelector('summary')?.focus();
    details?.removeAttribute('open');
  }
}}>
  <div className="crm-header-location">
    <button type="button" className="crm-mobile-menu dashboard-icon-button" onClick={onToggleMobileMenu}
      aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileMenuOpen}><Menu size={20} aria-hidden="true" /></button>
    <span className="crm-breadcrumb-parent">Workspace <span aria-hidden="true">/</span></span>
    <span className="crm-breadcrumb-current">{pageTitles[activeTab] || 'Workspace'}</span>
  </div>
  <div className="crm-header-actions">
    <HeaderSearch onSelectResult={onSelectSearchResult} />
    {activeTab !== 'dashboard' && <details className="crm-account-menu">
      <summary className="dashboard-icon-button" aria-label="Quick add new record menu"><Plus size={19} aria-hidden="true" /></summary>
      <div className="crm-account-dropdown">
        {[[UserPlus, 'New lead', 'lead'], [Briefcase, 'New deal', 'deal'], [UserCheck, 'New contact', 'contact']].map(([Icon, label, type]) =>
          <button type="button" key={type} onClick={event => { event.currentTarget.closest('details').removeAttribute('open'); onOpenQuickAction(type); }}><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>
    </details>}
    <details className="crm-account-menu">
      <summary aria-label={'Account: ' + currentUser.name}><Avatar name={currentUser.name} src={currentUser.avatarUrl} />
        <span className="crm-account-name">{currentUser.name?.split(' ')[0]}</span><ChevronDown size={16} aria-hidden="true" /></summary>
      <div className="crm-account-dropdown"><strong>{currentUser.name}</strong><p>{currentUser.email}</p><p>{currentUser.role}</p>
        {accounts.length > 0 && onSwitchAccount && <div className="crm-account-switcher">
          <h2>Switch account</h2>
          <div className="crm-account-options" role="group" aria-label="Workspace accounts" aria-busy={Boolean(switchingAccountId)}>
            {accounts.map(account => <button type="button" key={account.id}
              aria-label={'Switch to ' + account.name + ', ' + account.role}
              aria-pressed={account.id === currentUser.id} disabled={Boolean(switchingAccountId)}
              onClick={() => onSwitchAccount(account.id)}>
              <Avatar name={account.name} src={account.avatarUrl} />
              <span className="crm-account-option-copy"><strong>{account.name}</strong><small>{account.role}</small></span>
              {account.id === currentUser.id && <Check size={16} aria-label="Current account" />}
            </button>)}
          </div>
          {switchingAccountId && <p role="status">Switching account…</p>}
          {accountSwitchError && <p className="crm-account-error" role="alert">{accountSwitchError}</p>}
        </div>}
        {onLogout && <button type="button" onClick={onLogout}>Sign out</button>}
      </div>
    </details>
  </div>
</header>;
