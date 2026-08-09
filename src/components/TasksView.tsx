import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  PhoneCall, 
  Mail, 
  Users, 
  RefreshCw, 
  Sparkles, 
  Trash2, 
  X,
  FileText
} from 'lucide-react';
import { Task, TaskType, User } from '../types/crm';
import { formatDate, filterByRole } from '../utils/crmHelpers';

interface TasksViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onCreateTask: (task: Partial<Task>) => Promise<void>;
  onUpdateTask: (id: string, task: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  currentUser,
  onCreateTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [activeScope, setActiveScope] = useState<'my' | 'team'>('my');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    type: 'Call',
    linkedType: 'Contact',
    linkedId: '',
    ownerId: currentUser.id,
    status: 'pending'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const userTasks = filterByRole(tasks, currentUser);

  const filteredTasks = tasks.filter(t => {
    const matchesScope = activeScope === 'my' ? t.ownerId === currentUser.id : true;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    return matchesScope && matchesStatus && matchesType;
  });

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      dueDate: todayStr,
      type: 'Call',
      linkedType: 'Contact',
      linkedId: '',
      ownerId: currentUser.id,
      status: 'pending'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    await onCreateTask(formData);
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'pending' ? 'done' : 'pending';
    await onUpdateTask(task.id, { status: nextStatus });
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#5A5A40]" />
            <span>Tasks & Follow-up Agenda</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Manage personal and team sales follow-ups, sample check-ins, and renewal calls
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-up Task</span>
        </button>
      </div>

      {/* Scope Switcher & Filters */}
      <div className="bg-white border border-[#e0e0d5] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        
        {/* Scope Toggle */}
        <div className="flex items-center bg-[#f5f5f0] border border-[#e0e0d5] p-1 rounded-full text-xs">
          <button
            onClick={() => setActiveScope('my')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
              activeScope === 'my' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
            }`}
          >
            My Follow-ups
          </button>
          <button
            onClick={() => setActiveScope('team')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
              activeScope === 'team' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
            }`}
          >
            Team Agenda
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-1.5 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="pending">Pending Tasks</option>
            <option value="done">Completed Tasks</option>
            <option value="all">All Tasks</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-1.5 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Types</option>
            <option value="Call">Call</option>
            <option value="Email">Email</option>
            <option value="Meeting">Meeting</option>
            <option value="Sample Follow-up">Sample Follow-up</option>
            <option value="Renewal Check-in">Renewal Check-in</option>
          </select>

        </div>

      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-[#e0e0d5] p-8 rounded-2xl text-center text-[#6b6b60] text-xs font-medium shadow-xs">
            No tasks found for selected criteria.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = task.status === 'pending' && task.dueDate < todayStr;
            const isDueToday = task.status === 'pending' && task.dueDate === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 bg-white border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs ${
                  task.status === 'done' 
                    ? 'border-[#e0e0d5] opacity-60 bg-[#f5f5f0]/50' 
                    : isOverdue 
                    ? 'border-rose-300 bg-rose-50/40' 
                    : isDueToday 
                    ? 'border-amber-300 bg-amber-50/40' 
                    : 'border-[#e0e0d5]'
                }`}
              >
                
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                      task.status === 'done' 
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                        : 'border-[#e0e0d5] hover:border-[#5A5A40] text-[#6b6b60]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-bold ${task.status === 'done' ? 'line-through text-[#6b6b60]' : 'text-[#2d2d2a]'}`}>
                        {task.title}
                      </h4>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#f5f5f0] text-[#5A5A40] border-[#e0e0d5]">
                        {task.type}
                      </span>
                    </div>

                    {task.linkedTitle && (
                      <p className="text-[11px] text-[#6b6b60]">
                        Linked: <span className="text-[#2d2d2a] font-semibold">{task.linkedTitle}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className={`font-semibold flex items-center gap-1 ${
                      isOverdue ? 'text-rose-600' : isDueToday ? 'text-amber-700' : 'text-[#5A5A40]'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    <div className="text-[10px] text-[#6b6b60] font-medium">Assigned: {task.ownerName}</div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-[#6b6b60] hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a]">Create Follow-up Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call client to verify sample testing results"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Sample Follow-up">Sample Follow-up</option>
                    <option value="Proposal Follow-up">Proposal Follow-up</option>
                    <option value="Renewal Check-in">Renewal Check-in</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Assigned Employee</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0d5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#f5f5f0] hover:bg-[#eaeae2] text-[#2d2d2a] rounded-full font-semibold border border-[#e0e0d5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full font-semibold shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
