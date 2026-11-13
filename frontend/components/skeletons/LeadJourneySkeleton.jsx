import { Skeleton, SkeletonText, SkeletonStatus } from './primitives.jsx';
import { TimelineSkeleton } from './TimelineSkeleton.jsx';
export function LeadJourneySkeleton() {
 return <SkeletonStatus label="Lead Journey" className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-[var(--canvas)] min-h-screen"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-wrap justify-between gap-4"><div className="space-y-3"><Skeleton className="h-7 w-64 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div><Skeleton className="h-9 w-28" /></div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i=><div key={i} className="rounded-xl border border-[var(--border)] p-3 space-y-2"><SkeletonText /><Skeleton className="h-6 w-16" /></div>)}</div>
 <div className="flex gap-1">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-12 flex-1" />)}</div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Skeleton className="h-5 w-40" />{[1,2,3,4].map(i=><Skeleton key={i} className="h-10 w-full" />)}</div><div className="lg:col-span-2 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Skeleton className="h-10 w-full" /><TimelineSkeleton /></div></div></SkeletonStatus>;
}

