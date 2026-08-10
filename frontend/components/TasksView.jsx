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
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-zinc-400" />
            <span>Follow-ups & Tasks</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Daily activity tracking & deadline notifications for sales reps
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>New Task</span>
        </button>
      </div>

      {/* Scope Switcher & Filters */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Scope Toggle */}
        <div className="flex items-center bg-[#18181c] border border-[#2e2e38] p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveScope('my')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
              activeScope === 'my' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            My Follow-ups
          </button>
          <button
            onClick={() => setActiveScope('team')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${
              activeScope === 'team' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
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
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="pending" className="bg-[#1c1c21]">Pending Tasks</option>
            <option value="done" className="bg-[#1c1c21]">Completed Tasks</option>
            <option value="all" className="bg-[#1c1c21]">All Tasks</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Types</option>
            <option value="Call" className="bg-[#1c1c21]">Call</option>
            <option value="Email" className="bg-[#1c1c21]">Email</option>
            <option value="Meeting" className="bg-[#1c1c21]">Meeting</option>
            <option value="Sample Follow-up" className="bg-[#1c1c21]">Sample Follow-up</option>
            <option value="Renewal Check-in" className="bg-[#1c1c21]">Renewal Check-in</option>
          </select>

        </div>

      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#1c1c21] border border-[#2c2c34] p-8 rounded-2xl text-center text-zinc-500 text-xs font-medium">
            No tasks found for selected criteria.
          </div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = task.status === 'pending' && task.dueDate < todayStr;
            const isDueToday = task.status === 'pending' && task.dueDate === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 bg-[#1c1c21] border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  task.status === 'done' 
                    ? 'border-[#2c2c34] opacity-50 bg-[#18181c]' 
                    : isOverdue 
                    ? 'border-rose-800/80 bg-rose-950/20' 
                    : isDueToday 
                    ? 'border-amber-800/80 bg-amber-950/20' 
                    : 'border-[#2c2c34]'
                }`}
              >
                
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`mt-0.5 p-1 rounded-lg border transition-colors ${
                      task.status === 'done' 
                        ? 'bg-emerald-500 text-black border-emerald-400' 
                        : 'border-zinc-700 hover:border-white text-zinc-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-bold ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </h4>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#18181c] text-zinc-300 border-[#2e2e38]">
                        {task.type}
                      </span>
                    </div>

                    {task.linkedTitle && (
                      <p className="text-[11px] text-zinc-400">
                        Linked: <span className="text-white font-semibold">{task.linkedTitle}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className={`font-semibold flex items-center gap-1 ${
                      isOverdue ? 'text-rose-400' : isDueToday ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-mono">{formatDate(task.dueDate)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium">Assigned: {task.ownerName}</div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">Create Follow-up Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call client to verify sample testing results"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    <option value="Call" className="bg-[#1c1c21]">Call</option>
                    <option value="Email" className="bg-[#1c1c21]">Email</option>
                    <option value="Meeting" className="bg-[#1c1c21]">Meeting</option>
                    <option value="Sample Follow-up" className="bg-[#1c1c21]">Sample Follow-up</option>
                    <option value="Proposal Follow-up" className="bg-[#1c1c21]">Proposal Follow-up</option>
                    <option value="Renewal Check-in" className="bg-[#1c1c21]">Renewal Check-in</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Assigned Employee</label>
                <select
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#1c1c21]">{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2c2c34]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 rounded-full font-semibold border border-[#2f2f3a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-zinc-200 text-black rounded-full font-bold shadow-xs"
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

