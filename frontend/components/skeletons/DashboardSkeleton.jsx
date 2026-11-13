import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonStatus } from './primitives.jsx';
export function DashboardQueueSkeleton({ followups = false }) {
 return <SkeletonStatus label={followups ? 'follow-ups' : 'work queue'}>{!followups && <div className="dashboard-queue-labels"><SkeletonText /><SkeletonText className="w-16" /><SkeletonText className="w-10" /><SkeletonText className="w-12" /></div>}
 <div className={followups ? 'dashboard-task-list' : 'dashboard-queue-list'}>{[1,2,3,4].map(i=><div key={i} className={followups ? 'flex items-center gap-3 py-4 border-b border-[var(--border)]' : 'dashboard-queue-row'}><div className="space-y-2"><SkeletonText className="w-40" /><SkeletonText className="w-28" /></div>{!followups && <Skeleton className="h-6 w-20 rounded-full" />}<SkeletonAvatar /><SkeletonText className="w-16" /></div>)}</div></SkeletonStatus>;
}
export function DashboardActivitySkeleton() {
 return <SkeletonStatus label="recent activity"><ul className="dashboard-activity-list">{[1,2,3,4].map(i=><li key={i}><SkeletonAvatar /><div className="space-y-2 flex-1"><SkeletonText className="w-40" /><SkeletonText className="w-2/3" /></div><SkeletonText className="w-16" /></li>)}</ul></SkeletonStatus>;
}
export function DashboardSkeleton() {
 return <SkeletonStatus label="Dashboard" className="crm-dashboard"><div className="dashboard-welcome"><div className="space-y-3"><Skeleton className="h-8 w-64" /><SkeletonText className="w-72 max-w-full" /></div><div className="flex gap-3"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-28" /></div></div>
 <div className="dashboard-metrics">{[1,2,3,4].map(i=><div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3"><SkeletonText /><Skeleton className="h-9 w-24" /><SkeletonText className="w-32" /></div>)}</div>
 <div className="dashboard-grid"><div className="dashboard-work-queue rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"><div className="flex justify-between"><Skeleton className="h-5 w-36" /><SkeletonText className="w-16" /></div><Skeleton className="h-10 w-full" /><DashboardQueueSkeleton /></div>
 <div className="dashboard-pipeline rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-full" />{[75,50,90,35,60].map((width,i)=><div key={i} className="flex gap-3 items-center"><SkeletonText className="w-20" /><Skeleton className="h-3" style={{width:width+'%'}} /></div>)}</div>
 <div className="dashboard-tasks rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"><div className="flex justify-between"><Skeleton className="h-5 w-40" /><Skeleton className="h-5 w-16 rounded-full" /></div><DashboardQueueSkeleton followups /></div>
 <div className="dashboard-outreach rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5"><Skeleton className="h-5 w-40" />{[1,2,3,4].map(i=><div key={i} className="flex justify-between"><SkeletonText /><SkeletonText className="w-10" /></div>)}<Skeleton className="h-12 w-full" /></div></div></SkeletonStatus>;
}

