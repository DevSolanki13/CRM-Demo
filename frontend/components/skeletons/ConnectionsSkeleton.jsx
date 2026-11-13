import { Skeleton, SkeletonText, SkeletonStatus } from './primitives.jsx';
export function ConnectionsSkeleton({ cardOnly = false }) {
 return <SkeletonStatus label="Connections" className={cardOnly ? '' : 'mx-auto max-w-4xl space-y-6 p-4 sm:p-8'}>
 {!cardOnly && <div className="space-y-3"><Skeleton className="h-8 w-56" /><SkeletonText className="w-96 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div>}
 <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-5"><div className="flex justify-between gap-4"><div className="space-y-3"><Skeleton className="h-6 w-48" /><SkeletonText className="w-72 max-w-full" /></div><Skeleton className="h-11 w-32" /></div><div className="border-t border-[var(--border)] pt-5 space-y-3"><SkeletonText className="w-48" /><SkeletonText /><div className="flex gap-3"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div></div><SkeletonText className="w-72 max-w-full" /></div></SkeletonStatus>;
}

