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
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[#1D4E63]" />
            <span>Team & Workload Management</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Admin team role assignments (Admin, Manager, Sales Rep) and workload distribution
          </p>
        </div>

        {currentUser.role === 'Admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-white" />
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
              className="bg-[#FFFFFF] border border-[#E3E6EA] p-5 rounded-2xl space-y-4 hover:border-[#1D4E63] transition-all shadow-2xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E3E6EA]" 
                    />
                    <div>
                      <h3 className="font-display font-bold text-sm text-[#12161C]">{u.name}</h3>
                      <div className="text-[11px] text-[#5B6472] font-mono">{u.email}</div>
                    </div>
                  </div>

                  {currentUser.role === 'Admin' && (
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="text-[#5B6472] hover:text-[#12161C] p-1.5 rounded-lg hover:bg-[#F6F7F8]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E3E6EA]">
                  <span className="text-[#5B6472] font-medium">Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-[#F6F7F8] text-[#12161C] border-[#E3E6EA]">
                    {u.role}
                  </span>
                </div>

              </div>

              {/* Workload Stats */}
              <div className="bg-[#F6F7F8] p-3.5 rounded-xl border border-[#E3E6EA] space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#5B6472]">
                  <span>Assigned Leads:</span>
                  <span className="font-bold text-[#12161C]">{empLeads.length}</span>
                </div>
                <div className="flex items-center justify-between text-[#5B6472]">
                  <span>Active Deals:</span>
                  <span className="font-bold text-[#12161C]">{empDeals.length}</span>
                </div>
                <div className="flex items-center justify-between text-[#5B6472] border-t border-[#E3E6EA] pt-2">
                  <span>Pipeline Value:</span>
                  <span className="font-extrabold text-[#255B40]">{formatCurrency(totalDealVal)}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5B6472] hover:text-[#12161C] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elena@company.com"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
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
