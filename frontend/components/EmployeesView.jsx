import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  Edit3, 
  X 
} from 'lucide-react';
import { formatCurrency } from '../utils/crmHelpers.js';

export const EmployeesView = ({
  users,
  leads,
  deals,
  currentUser,
  onCreateUser,
  onUpdateUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Sales Rep',
    active: true
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'Sales Rep', active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      await onUpdateUser(editingUser.id, formData);
    } else {
      await onCreateUser(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-zinc-400" />
            <span>Team & Workload Management</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Admin team role assignments (Admin, Manager, Sales Rep) and workload distribution
          </p>
        </div>

        {currentUser.role === 'Admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {users.map(u => {
          const empLeads = leads.filter(l => l.ownerId === u.id);
          const empDeals = deals.filter(d => d.ownerId === u.id);
          const totalDealVal = empDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div 
              key={u.id}
              className="bg-[#1c1c21] border border-[#2c2c34] p-5 rounded-2xl space-y-4 hover:border-zinc-500 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-700" 
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white">{u.name}</h3>
                      <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                    </div>
                  </div>

                  {currentUser.role === 'Admin' && (
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-[#24242b]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2c2c34]">
                  <span className="text-zinc-400 font-medium">Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#18181c] text-zinc-300 border-[#2e2e38]">
                    {u.role}
                  </span>
                </div>

              </div>

              {/* Workload Stats */}
              <div className="bg-[#24242b] p-3.5 rounded-xl border border-[#2f2f3a] space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Assigned Leads:</span>
                  <span className="font-bold text-white">{empLeads.length}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Active Deals:</span>
                  <span className="font-bold text-white">{empDeals.length}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 border-t border-[#2f2f3a] pt-2">
                  <span>Pipeline Value:</span>
                  <span className="font-extrabold text-emerald-400">{formatCurrency(totalDealVal)}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elena@company.com"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                >
                  <option value="Sales Rep" className="bg-[#1c1c21]">Sales Rep</option>
                  <option value="Manager" className="bg-[#1c1c21]">Manager</option>
                  <option value="Admin" className="bg-[#1c1c21]">Admin</option>
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
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

