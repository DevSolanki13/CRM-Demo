export function Skeleton({ className = '', style }) {
  return <div aria-hidden="true" className={'crm-skeleton rounded-md ' + className} style={style} />;
}
export function SkeletonText({ className = 'w-32' }) { return <Skeleton className={'h-3 ' + className} />; }
export function SkeletonAvatar() { return <Skeleton className="h-9 w-9 shrink-0 rounded-full" />; }
export function SkeletonTableRow({ columns = 5 }) {
  return <tr aria-hidden="true">{Array.from({ length: columns }, (_, i) => <td key={i} className="px-4 py-4"><SkeletonText className={i === 0 ? 'w-36' : 'w-20'} /><Skeleton className="mt-2 h-2 w-16" /></td>)}</tr>;
}
export function SkeletonStatus({ label, children, className = '' }) {
  return <div role="status" aria-busy="true" aria-label={'Loading ' + label} className="crm-skeleton-status"><div className={'crm-skeleton-content ' + className}>{children}</div></div>;
}
