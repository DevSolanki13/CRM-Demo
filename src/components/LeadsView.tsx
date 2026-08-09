import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Phone, 
  Mail, 
  Building2, 
  UserCheck, 
  Edit3, 
  Trash2, 
  Send, 
  CheckCircle2, 
  ChevronDown,
  X,
  ExternalLink
} from 'lucide-react';
import { Lead, LeadSource, LeadStatus, User, CRMBrandingSettings } from '../types/crm';
import { formatDate, filterByRole } from '../utils/crmHelpers';

interface LeadsViewProps {
  leads: Lead[];
  users: User[];
  currentUser: User;
  branding: CRMBrandingSettings;
  onCreateLead: (lead: Partial<Lead>) => Promise<void>;
  onUpdateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onConvertToDeal?: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  users,
  currentUser,
  branding,
  onCreateLead,
  onUpdateLead,
  onDeleteLead,
  onConvertToDeal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedOwner, setSelectedOwner] = useState<string>('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Selection state for multi-delete
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Lead>>({
    title: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    source: 'Website',
    status: 'New',
    ownerId: currentUser.id,
    notes: ''
  });

  // Filter RBAC
  const userLeads = filterByRole<Lead>(leads, currentUser);

  // Filtered Leads
  const filteredLeads = userLeads.filter(l => {
    const matchesSearch = 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.companyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource = selectedSource === 'All' 
      ? true 
      : selectedSource === 'Outbound' ? l.isOutbound 
      : selectedSource === 'Inbound' ? !l.isOutbound 
      : l.source === selectedSource;

    const matchesStatus = selectedStatus === 'All' || l.status === selectedStatus;
    const matchesOwner = selectedOwner === 'All' || l.ownerId === selectedOwner;

    return matchesSearch && matchesSource && matchesStatus && matchesOwner;
  });

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected lead(s)?`)) {
      for (const id of selectedLeadIds) {
        await onDeleteLead(id);
      }
      setSelectedLeadIds([]);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      title: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      companyName: '',
      source: 'Website',
      status: 'New',
      ownerId: currentUser.id,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({ ...lead });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.contactName) return;

    if (editingLead) {
      await onUpdateLead(editingLead.id, formData);
    } else {
      await onCreateLead(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5A5A40]" />
            <span>Lead Management</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Track inbound inquiries & cold outbound lead generation pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedLeadIds.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#e0e0d5] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-xs">
        
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#5A5A40] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, contact, company..."
            className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-full pl-10 pr-4 py-2 text-xs text-[#2d2d2a] placeholder-[#6b6b60]/60 focus:outline-none focus:border-[#5A5A40]"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6b60] font-medium">Type:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-2 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Sources</option>
            <option value="Outbound">Cold Outbound Effort</option>
            <option value="Inbound">Inbound Inquiry</option>
            <option value="Website">Website</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Trade Show">Trade Show</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6b60] font-medium">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-2 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Unqualified">Unqualified</option>
          </select>
        </div>

        {/* Owner Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6b60] font-medium">Owner:</span>
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-2 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Reps</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Responsive Mobile Cards View (< md) */}
      <div className="block md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white border border-[#e0e0d5] rounded-2xl p-6 text-center text-xs text-[#6b6b60]">
            No leads found matching criteria.
          </div>
        ) : (
          filteredLeads.map(lead => {
            const isSelected = selectedLeadIds.includes(lead.id);
            return (
              <div 
                key={lead.id}
                className={`bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-colors ${
                  isSelected ? 'border-[#5A5A40] bg-[#5A5A40]/5' : 'border-[#e0e0d5]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectLead(lead.id)}
                      className="w-4 h-4 rounded border-[#e0e0d5] text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-[#2d2d2a]">{lead.title}</h3>
                      <div className="text-[11px] text-[#6b6b60] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#5A5A40]" />
                        <span>{lead.companyName || 'Unlinked Company'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleOpenEditModal(lead)}
                    className="p-1.5 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-lg transition-colors"
                    title="Edit Lead"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#6b6b60] pt-2 border-t border-[#e0e0d5]">
                  <div>
                    <span className="font-semibold text-[#2d2d2a]">{lead.contactName}</span>
                    {lead.contactEmail && <span className="block text-[10px] text-[#6b6b60]">{lead.contactEmail}</span>}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      lead.isOutbound 
                        ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' 
                        : 'bg-purple-100 text-purple-800 border-purple-200'
                    }`}>
                      {lead.isOutbound ? 'Outbound' : 'Inbound'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      lead.status === 'Qualified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      lead.status === 'Contacted' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      lead.status === 'New' ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' :
                      'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#6b6b60] pt-1">
                  <span>Assigned: {lead.ownerName || 'Unassigned'}</span>
                  <span>{formatDate(lead.lastActivityDate)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Leads Table (>= md) */}
      <div className="hidden md:block bg-white border border-[#e0e0d5] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#2d2d2a]">
            <thead className="bg-[#f5f5f0] text-[#5A5A40] uppercase font-bold text-[10px] tracking-wider border-b border-[#e0e0d5]">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[#e0e0d5] text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5">Lead / Company</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Source & Effort</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assigned Owner</th>
                <th className="px-4 py-3.5">Last Activity</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0d5]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#6b6b60]">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      className={`transition-colors ${isSelected ? 'bg-[#5A5A40]/10' : 'hover:bg-[#f5f5f0]/60'}`}
                    >
                      {/* Select Checkbox */}
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectLead(lead.id)}
                          className="w-4 h-4 rounded border-[#e0e0d5] text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
                        />
                      </td>

                      {/* Title & Company */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#2d2d2a]">{lead.title}</div>
                        <div className="text-[11px] text-[#6b6b60] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-[#5A5A40]" />
                          <span>{lead.companyName || 'Unlinked Company'}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <div className="text-[#2d2d2a] font-semibold">{lead.contactName}</div>
                        <div className="text-[10px] text-[#6b6b60] flex items-center gap-2 mt-0.5">
                          {lead.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-[#5A5A40]" />
                              {lead.contactEmail}
                            </span>
                          )}
                          {lead.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#5A5A40]" />
                              {lead.contactPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source & Outbound Badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            lead.isOutbound 
                              ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' 
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}>
                            {lead.isOutbound ? 'Cold Outbound' : 'Inbound'}
                          </span>
                          <span className="text-[10px] text-[#6b6b60] font-mono">({lead.source})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.status === 'Qualified' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          lead.status === 'Contacted' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          lead.status === 'New' ? 'bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/20' :
                          'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Assigned Owner */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#5A5A40] text-white text-[10px] font-bold flex items-center justify-center">
                            {lead.ownerName ? lead.ownerName.charAt(0) : 'U'}
                          </div>
                          <span className="text-[#2d2d2a] font-medium">{lead.ownerName || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td className="px-4 py-3.5 text-[#6b6b60] text-[11px] font-medium">
                        {formatDate(lead.lastActivityDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-lg transition-colors"
                            title="Edit Lead"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a]">
                {editingLead ? 'Edit Lead' : 'Create New Lead'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#6b6b60] hover:text-[#2d2d2a] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Lead Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. AeroTech Circuit Thermal Pads Supply"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. David Miller"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. AeroTech Solutions"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (512) 555-0100"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="Website">Website</option>
                    <option value="Cold Outbound">Cold Outbound</option>
                    <option value="Inbound Inquiry">Inbound Inquiry</option>
                    <option value="Referral">Referral</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Trade Show">Trade Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Assigned Owner</label>
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
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key background info or sample testing requirements..."
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40] resize-none"
                />
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
                  Save Lead
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
