import React, { useState } from 'react';

export function Avatar({ name = 'Unassigned', src, size = 'normal' }) {
  const [failedSource, setFailedSource] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return <span className={'crm-avatar crm-avatar--' + size} title={name} aria-label={name}>
    {src && failedSource !== src ? <img src={src} alt="" onError={() => setFailedSource(src)} /> : <span aria-hidden="true">{initials}</span>}
  </span>;
}

export function StatusBadge({ children, tone = 'info' }) {
  return <span className={'dashboard-badge dashboard-badge--' + tone}>{children}</span>;
}

export function MetricCard({ label, value, context, icon: Icon, danger = false, onClick, title }) {
  const content = <><div className="dashboard-metric-copy"><span className="dashboard-metric-label">{label}</span>
    <strong className="dashboard-metric-value" title={title}>{value}</strong><span className="dashboard-metric-context">{context}</span></div>
    <span className="dashboard-metric-icon"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span></>;
  const className = 'dashboard-metric' + (danger ? ' dashboard-metric--danger' : '');
  return onClick ? <button type="button" className={className} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}

export function DashboardPanel({ title, description, action, children, className = '', id }) {
  return <section className={'dashboard-panel ' + className} id={id} aria-label={title}>
    <div className="dashboard-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}
  </section>;
}

export function DashboardEmptyState({ title, children, icon: Icon }) {
  return <div className="dashboard-empty">{Icon && <Icon size={24} strokeWidth={1.5} aria-hidden="true" />}<strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
