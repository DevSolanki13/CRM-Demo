import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonTableRow, SkeletonStatus } from './primitives.jsx';
export function ContactsSkeleton({ detail = false }) {
 return <SkeletonStatus label="Contacts" className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-[var(--canvas)] min-h-screen"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-wrap justify-between gap-4"><div className="space-y-3"><Skeleton className="h-7 w-64 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div><Skeleton className="h-9 w-28" /></div>
 <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-wrap gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-48" /></div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className={(detail ? 'lg:col-span-2' : 'lg:col-span-3') + ' overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]'}><table className="w-full text-left"><thead><tr>{["Contact Name","Job Title & Company","Contact Info","Owner","Actions"].map(name=><th key={name} className="px-4 py-3.5 text-[10px] text-[var(--ink-muted)]">{name}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{[1,2,3,4,5,6].map(i=><SkeletonTableRow key={i} columns={5} />)}</tbody></table></div>
 {detail && <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5"><SkeletonAvatar /><Skeleton className="h-6 w-40" />{[1,2,3,4].map(i=><div key={i} className="space-y-3 border-t border-[var(--border)] pt-4"><SkeletonText /><Skeleton className="h-16 w-full" /></div>)}</div>}</div>
 </SkeletonStatus>;
}

