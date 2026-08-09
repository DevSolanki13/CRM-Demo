import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  ShieldCheck, 
  Briefcase, 
  DollarSign, 
  Mail, 
  CheckCircle2, 
  Edit3, 
  X, 
  BarChart2 
} from 'lucide-react';
import { User, UserRole, Lead, Deal } from '../types/crm';
import { formatCurrency } from '../utils/crmHelpers';

interface EmployeesViewProps {
  users: User[];
  leads: Lead[];
  deals: Deal[];
  currentUser: User;
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, user: Partial<User>) => Promise<void>;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  users,
  leads,
  deals,
  currentUser,
  onCreateUser,
  onUpdateUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
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

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <Users2 className="w-5 h-5 text-[#5A5A40]" />
            <span>Team & Workload Management</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Admin team role assignments (Admin, Manager, Sales Rep) and workload distribution
          </p>
        </div>

        {currentUser.role === 'Admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map(u => {
          const empLeads = leads.filter(l => l.ownerId === u.id);
          const empDeals = deals.filter(d => d.ownerId === u.id);
          const totalDealVal = empDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div 
              key={u.id}
              className="bg-white border border-[#e0e0d5] p-5 rounded-2xl space-y-4 shadow-xs hover:border-[#5A5A40]/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                      alt={u.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e0e0d5]" 
                    />
                    <div>
                      <h3 className="font-bold text-sm text-[#2d2d2a]">{u.name}</h3>
                      <div className="text-[11px] text-[#6b6b60]">{u.email}</div>
                    </div>
                  </div>

                  {currentUser.role === 'Admin' && (
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="text-[#6b6b60] hover:text-[#2d2d2a] p-1.5 rounded-lg hover:bg-[#f5f5f0]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#e0e0d5]">
                  <span className="text-[#6b6b60] font-medium">Role:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-[#f5f5f0] text-[#5A5A40] border-[#e0e0d5]">
                    {u.role}
                  </span>
                </div>

              </div>

              {/* Workload Stats */}
              <div className="bg-[#fcfcf9] p-3 rounded-xl border border-[#e0e0d5] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#6b6b60]">
                  <span>Assigned Leads:</span>
                  <span className="font-bold text-[#2d2d2a]">{empLeads.length}</span>
                </div>
                <div className="flex items-center justify-between text-[#6b6b60]">
                  <span>Active Deals:</span>
                  <span className="font-bold text-[#2d2d2a]">{empDeals.length}</span>
                </div>
                <div className="flex items-center justify-between text-[#6b6b60] border-t border-[#e0e0d5] pt-1.5">
                  <span>Pipeline Value:</span>
                  <span className="font-extrabold text-[#5A5A40]">{formatCurrency(totalDealVal)}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a]">
                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="elena@company.com"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                >
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
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
