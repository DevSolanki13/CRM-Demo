import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  X
} from 'lucide-react';
import { formatDate, filterByRole } from '../utils/crmHelpers.js';

export const TasksView = ({
  tasks,
  users,
  currentUser,
  onCreateTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [activeScope, setActiveScope] = useState('my');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    await onCreateTask(formData);
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'pending' ? 'done' : 'pending';
    await onUpdateTask(task.id, { status: nextStatus });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#1D4E63]" />
            <span>Follow-ups & Tasks Ledger</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Daily activity tracking & deadline notifications for sales reps
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Task</span>
        </button>
      </div>

      {/* Scope Switcher & Filters */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
        
        {/* Scope Toggle */}
        <div className="flex items-center bg-[#F6F7F8] border border-[#E3E6EA] p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveScope('my')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
              activeScope === 'my' ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
            }`}
          >
            My Follow-ups
          </button>
          <button
            onClick={() => setActiveScope('team')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
              activeScope === 'team' ? 'bg-[#FFFFFF] text-[#1D4E63] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
            }`}
          >
            Team Agenda
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
          >
            <option value="pending">Pending Tasks</option>
            <option value="done">Completed Tasks</option>
            <option value="all">All Tasks</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-1.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
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
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-8 rounded-2xl text-center text-[#5B6472] text-xs font-medium shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
            No tasks found for selected criteria.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = task.status === 'pending' && task.dueDate < todayStr;
            const isDueToday = task.status === 'pending' && task.dueDate === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 bg-[#FFFFFF] border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-[0_1px_2px_rgba(18,22,28,0.06)] ${
                  task.status === 'done' 
                    ? 'border-[#E3E6EA] opacity-60 bg-[#F6F7F8]' 
                    : isOverdue 
                    ? 'border-[#F4C4C1] bg-[#FDF2F1]' 
                    : isDueToday 
                    ? 'border-[#F5DDA9] bg-[#FEF8EC]' 
                    : 'border-[#E3E6EA]'
                }`}
              >
                
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                      task.status === 'done' 
                        ? 'bg-[#255B40] text-white border-[#BCDBC9]' 
                        : 'border-[#E3E6EA] bg-[#F6F7F8] hover:border-[#1D4E63] text-[#5B6472]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-display text-xs font-bold ${task.status === 'done' ? 'line-through text-[#5B6472]' : 'text-[#12161C]'}`}>
                        {task.title}
                      </h4>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border bg-[#EFF6F9] text-[#1D4E63] border-[#D8E8EF]">
                        {task.type}
                      </span>
                    </div>

                    {task.linkedTitle && (
                      <p className="text-[11px] text-[#5B6472]">
                        Linked: <span className="text-[#12161C] font-bold">{task.linkedTitle}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className={`font-mono font-bold flex items-center gap-1 ${
                      isOverdue ? 'text-[#922D27]' : isDueToday ? 'text-[#965700]' : 'text-[#255B40]'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                    <div className="text-[10px] text-[#5B6472] font-medium">Assigned: {task.ownerName}</div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-[#5B6472] hover:text-[#922D27] hover:bg-[#FDF2F1] rounded-lg transition-colors"
                    title="Delete Task"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">Create Follow-up Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5B6472] hover:text-[#12161C] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call client to verify sample testing results"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
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
                <label className="block text-[#5B6472] font-semibold mb-1">Assigned Employee</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3E6EA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] rounded-full font-semibold border border-[#E3E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-full font-bold shadow-2xs"
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
