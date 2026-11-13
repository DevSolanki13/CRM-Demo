import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonStatus } from './primitives.jsx';

export function TasksSkeleton({ approvals = false }) {
  return <SkeletonStatus label="Tasks" className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 bg-[var(--canvas)] min-h-screen">
    <div className="space-y-2"><SkeletonText className="w-24" /><Skeleton className="h-10 w-full" /></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-wrap justify-between gap-4">
      <div className="space-y-3 min-w-0"><Skeleton className="h-7 w-72 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div>
      <Skeleton className="h-9 w-28" />
    </div>
    <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="flex gap-2 min-w-0"><Skeleton className="h-10 w-36 max-w-full" /><Skeleton className="h-10 w-36 max-w-full" /></div>
      {!approvals && <div className="flex gap-2"><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-28" /></div>}
    </div>
    <div className="space-y-6">{(approvals ? [1] : [1, 2, 3]).map(group => <div key={group} className="space-y-3">
      <div className="flex justify-between"><SkeletonText className="w-44" /><SkeletonText className="w-24" /></div>
      {[1, 2].map(row => <div key={row} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Skeleton className="h-6 w-6 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2"><SkeletonText className="w-56 max-w-full" /><SkeletonText className="w-32" /><SkeletonText className="w-20" />
            {approvals && <Skeleton className="h-12 w-full" />}
          </div>
        </div>
        <div className="flex items-center gap-4"><SkeletonAvatar /><SkeletonText className="w-24" /><Skeleton className={approvals ? 'h-9 w-32' : 'h-7 w-7'} /></div>
      </div>)}
    </div>)}</div>
  </SkeletonStatus>;
}
