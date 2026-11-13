import { DashboardSkeleton } from './DashboardSkeleton.jsx';
import { LeadsSkeleton } from './LeadsSkeleton.jsx';
import { PipelineSkeleton } from './PipelineSkeleton.jsx';
import { ContactsSkeleton } from './ContactsSkeleton.jsx';
import { CompaniesSkeleton } from './CompaniesSkeleton.jsx';
import { TasksSkeleton } from './TasksSkeleton.jsx';
import { EmployeesSkeleton } from './EmployeesSkeleton.jsx';
import { ReportsSkeleton } from './ReportsSkeleton.jsx';
import { SettingsSkeleton } from './SettingsSkeleton.jsx';
import { ConnectionsSkeleton } from './ConnectionsSkeleton.jsx';
import { LeadJourneySkeleton } from './LeadJourneySkeleton.jsx';
export function PageSkeleton({ tab, journey = false, stages }) {
 const Component = journey ? LeadJourneySkeleton : ({ dashboard: DashboardSkeleton, leads: LeadsSkeleton,
 pipeline: PipelineSkeleton, contacts: ContactsSkeleton, companies: CompaniesSkeleton, tasks: TasksSkeleton,
 employees: EmployeesSkeleton, reports: ReportsSkeleton, settings: SettingsSkeleton, connections: ConnectionsSkeleton })[tab] || DashboardSkeleton;
 return <Component stages={stages} />;
}

