import { Skeleton, SkeletonText, SkeletonStatus } from './primitives.jsx';
export function TimelineSkeleton({ rows = 3 }) {
 return <SkeletonStatus label="activity timeline" className="relative pl-6 space-y-4">{Array.from({length:rows},(_,i)=><div key={i} className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"><Skeleton className="absolute -left-6 top-4 h-5 w-5 rounded-full" /><div className="flex justify-between gap-3"><Skeleton className="h-4 w-36" /><SkeletonText className="w-20" /></div><SkeletonText className="w-full" /><SkeletonText className="w-2/3" /><SkeletonText className="w-24" /></div>)}</SkeletonStatus>;
}

