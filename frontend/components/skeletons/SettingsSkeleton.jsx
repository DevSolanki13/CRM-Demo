import { Skeleton, SkeletonText, SkeletonStatus } from './primitives.jsx';
export function SettingsRulesSkeleton() {
 return <SkeletonStatus label="follow-up rules" className="space-y-4">{[1,2,3].map(i=><div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"><div className="flex justify-between"><SkeletonText /><Skeleton className="h-6 w-10" /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-[var(--border)] pt-3">{[1,2,3].map(j=><Skeleton key={j} className="h-10 w-full" />)}</div></div>)}</SkeletonStatus>;
}
export function SettingsSkeleton() {
 return <SkeletonStatus label="Settings" className="p-6 md:p-8 space-y-6 bg-[var(--canvas)] min-h-screen"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-wrap justify-between gap-4"><div className="space-y-3"><Skeleton className="h-7 w-64 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div></div>
 <div className="flex gap-2 overflow-x-auto">{[1,2,3,4,5,6].map(i=><Skeleton key={i} className="h-10 w-28 shrink-0" />)}</div>
 <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6 max-w-2xl"><Skeleton className="h-6 w-48" /><div className="space-y-4">{[1,2].map(i=><div key={i} className="space-y-2"><SkeletonText /><Skeleton className="h-10 w-full" /></div>)}</div><div className="grid grid-cols-2 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div><Skeleton className="h-10 w-36" /></div></SkeletonStatus>;
}

