import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonStatus } from './primitives.jsx';
export function PipelineSkeleton({ stages = [] }) {
 return <SkeletonStatus label="Pipeline" className="p-3.5 sm:p-6 md:p-8 bg-[var(--canvas)] h-full min-h-screen flex flex-col gap-4 overflow-hidden">
 <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 flex flex-wrap justify-between gap-4"><div className="space-y-3"><Skeleton className="h-7 w-64 max-w-full" /><SkeletonText className="w-72 max-w-full" /></div><Skeleton className="h-9 w-28" /></div><div className="flex gap-2 overflow-hidden">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />)}</div>
 <div className="flex-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 items-stretch snap-x snap-mandatory">{(stages.length ? stages : [1,2,3,4,5]).map((stage,i)=><div key={stage.id || i} className="w-[85vw] sm:w-80 shrink-0 snap-start bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
 <div className="flex justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-6 rounded-full" /></div><div className="flex justify-between border-b border-[var(--border)] pb-2"><SkeletonText /><SkeletonText className="w-16" /></div>
 {[0,1,2].map(j=><div key={j} className="border border-[var(--border)] rounded-xl p-4 space-y-3" style={{ minHeight: 180 + ((i+j)%3)*24 }}><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-4 w-40" /><SkeletonText /><div className="flex justify-between border-t border-[var(--border)] pt-3"><Skeleton className="h-5 w-20" /><SkeletonAvatar /></div><SkeletonText className="w-24" /></div>)}</div>)}</div></SkeletonStatus>;
}

