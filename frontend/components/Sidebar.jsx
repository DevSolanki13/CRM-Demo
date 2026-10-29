import React, { useEffect, useRef } from 'react';
import { ArrowRight, BarChart3, Building2, CheckSquare, Contact, FileSpreadsheet, Kanban, LayoutDashboard, LogOut, Plug, RefreshCw, Settings, Users, Users2, X } from 'lucide-react';
import { Avatar } from './DashboardPrimitives.jsx';
import { canAccessPage } from '../../shared/accessPolicy.js';

const modules = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'contacts', label: 'Contacts', icon: Contact },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'employees', label: 'Team & workload', icon: Users2 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];
const tools = [
  { id: 'connections', label: 'Your connections', icon: Plug },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ activeTab, userRole, currentUser, branding, pendingTasksCount, renewalsDueCount, navigate, onOpenImportExport, onLogout, onClose }) {
  const renderItems = items => items.filter(item => canAccessPage(currentUser, item.id)).map(item => {
    const Icon = item.icon, active = activeTab === item.id;
    const count = item.id === 'tasks' ? pendingTasksCount : item.id === 'pipeline' ? renewalsDueCount : 0;
    return <button type="button" key={item.id} className={'crm-nav-item' + (active ? ' is-active' : '')}
      onClick={() => navigate(item.id)} aria-current={active ? 'page' : undefined} title={item.label}
      aria-label={item.label + (count > 0 ? ' (' + count + ')' : '')}>
      <Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span className="crm-nav-label">{item.label}</span>
      {count > 0 && <span className="crm-nav-count">{count.toLocaleString()}</span>}
    </button>;
  });
  return <div className="crm-sidebar-content">
    <div className="crm-sidebar-brand"><span className="crm-brand-mark" style={{ backgroundColor: branding?.primaryColor || 'var(--primary)' }}><Building2 size={20} aria-hidden="true" /></span>
      <div className="crm-nav-label"><strong>{branding?.appName || 'Sales CRM'}</strong><p>Your sales workspace</p></div>
      {onClose && <button type="button" className="dashboard-icon-button crm-sidebar-close" onClick={onClose} aria-label="Close navigation menu"><X size={18} aria-hidden="true" /></button>}
    </div>
    <div className="crm-workspace-label"><Building2 size={17} aria-hidden="true" /><span className="crm-nav-label">Sales workspace</span></div>
    <nav aria-label="Sales Operations Modules" className="crm-sidebar-navigation">
      <p className="crm-nav-group-label">Workspace</p>{renderItems(modules)}
      <div className="crm-sidebar-tools"><p className="crm-nav-group-label">Tools</p>{renderItems(tools)}</div>
    </nav>
    <div className="crm-sidebar-footer">
      {renewalsDueCount > 0 && <button type="button" className="crm-sidebar-renewal" onClick={() => navigate('pipeline')} title={renewalsDueCount + ' renewals due'} aria-label={'View ' + renewalsDueCount + ' recurring orders'}>
        <span><RefreshCw size={17} aria-hidden="true" /><strong className="crm-nav-label">{renewalsDueCount} renewals due</strong></span>
        <p className="crm-nav-label">Keep repeat orders on track.</p><span className="crm-nav-label">View pipeline <ArrowRight size={14} aria-hidden="true" /></span>
      </button>}
      <button type="button" className="crm-nav-item" onClick={onOpenImportExport} title="Export CSV data" aria-label="Export CRM data as CSV spreadsheet">
        <FileSpreadsheet size={18} aria-hidden="true" /><span className="crm-nav-label">Export CSV</span>
      </button>
      <div className="crm-sidebar-account"><Avatar name={currentUser?.name || userRole} src={currentUser?.avatarUrl} />
        <div className="crm-nav-label"><strong>{currentUser?.name || userRole}</strong><p>{userRole}</p></div>
        {onLogout && <button type="button" className="dashboard-icon-button" onClick={onLogout} aria-label="Sign out of CRM" title="Sign out"><LogOut size={17} aria-hidden="true" /></button>}
      </div>
    </div>
  </div>;
}

export const Sidebar = ({ activeTab, setActiveTab, userRole, currentUser, branding, pendingTasksCount = 0, renewalsDueCount = 0,
  onOpenImportExport, onLogout, isMobileOpen = false, onCloseMobile }) => {
  const mobileRef = useRef(null);
  useEffect(() => {
    if (!isMobileOpen) return;
    const previousFocus = document.activeElement;
    const node = mobileRef.current;
    const focusable = () => [...node.querySelectorAll('button:not([disabled])')];
    focusable()[0]?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onCloseMobile();
      if (event.key !== 'Tab') return;
      const buttons = focusable(), first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    node.addEventListener('keydown', keydown);
    return () => { node.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [isMobileOpen, onCloseMobile]);
  const navigate = tab => { setActiveTab(tab); if (isMobileOpen) onCloseMobile(); };
  const props = { activeTab, userRole, currentUser, branding, pendingTasksCount, renewalsDueCount, navigate, onOpenImportExport, onLogout };
  return <>
    <aside aria-label="Main Navigation" className="crm-sidebar-rail"><SidebarContent {...props} /></aside>
    {isMobileOpen && <div className="crm-mobile-sidebar">
      <button type="button" className="crm-sidebar-backdrop" onClick={onCloseMobile} aria-label="Dismiss navigation" tabIndex={-1} />
      <div role="dialog" aria-modal="true" aria-label="Navigation menu" ref={mobileRef} className="crm-sidebar-expanded"><SidebarContent {...props} onClose={onCloseMobile} /></div>
    </div>}
  </>;
};
