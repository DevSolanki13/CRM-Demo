import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Globe, 
  MapPin, 
  Users, 
  Edit3, 
  Trash2, 
  X, 
  Briefcase 
} from 'lucide-react';
import { formatCurrency } from '../utils/crmHelpers.js';

export const CompaniesView = ({
  companies,
  contacts,
  deals,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    address: '',
    notes: ''
  });

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setFormData({ name: '', industry: 'Manufacturing', website: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingCompany(comp);
    setFormData({ ...comp });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingCompany) {
      await onUpdateCompany(editingCompany.id, formData);
    } else {
      await onCreateCompany(formData);
    }
    setIsModalOpen(false);
  };

  const linkedContacts = selectedCompany ? contacts.filter(c => c.companyId === selectedCompany.id) : [];
  const linkedDeals = selectedCompany ? deals.filter(d => d.companyId === selectedCompany.id) : [];

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1D4E63]" />
            <span>Companies & Corporate Accounts</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Directory of enterprise accounts and associated contact personas
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl shadow-2xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name or industry..."
            className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-10 pr-4 py-2 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
          />
        </div>
      </div>

      {/* Companies Table & Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className={`${selectedCompany ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl overflow-hidden shadow-2xs`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#12161C]">
              <thead className="bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA]">
                <tr>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Industry</th>
                  <th className="px-4 py-3.5">Website & Address</th>
                  <th className="px-4 py-3.5">Linked Contacts</th>
                  <th className="px-4 py-3.5">Total Deal Value</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EA]">
                {filteredCompanies.map(comp => {
                  const compContacts = contacts.filter(c => c.companyId === comp.id);
                  const compDeals = deals.filter(d => d.companyId === comp.id);
                  const totalVal = compDeals.reduce((sum, d) => sum + d.value, 0);

                  return (
                    <tr
                      key={comp.id}
                      onClick={() => setSelectedCompany(comp)}
                      className={`cursor-pointer transition-colors ${
                        selectedCompany?.id === comp.id ? 'bg-[#F6F7F8] border-l-4 border-[#1D4E63]' : 'hover:bg-[#F6F7F8]/60'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-display font-bold text-[#12161C] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#1D4E63] text-white font-mono font-extrabold flex items-center justify-center text-xs">
                            {comp.name.charAt(0)}
                          </div>
                          <span>{comp.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="bg-[#F6F7F8] text-[#12161C] px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#E3E6EA]">
                          {comp.industry}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] font-mono">
                        <div className="flex items-center gap-1 text-[#12161C] font-semibold">
                          <Globe className="w-3 h-3 text-[#5B6472]" />
                          <span>{comp.website || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#5B6472] mt-0.5">
                          <MapPin className="w-3 h-3 text-[#5B6472]" />
                          <span>{comp.address || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-[#12161C]">
                        {compContacts.length} contacts
                      </td>

                      <td className="px-4 py-3.5 font-mono font-extrabold text-[#3F7A5C]">
                        {formatCurrency(totalVal)}
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(comp)}
                            className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCompany(comp.id)}
                            className="p-1.5 text-[#B5423A] hover:bg-[#FDF2F1] rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Company Drawer Pane */}
        {selectedCompany && (
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 space-y-4 shadow-2xs text-[#12161C]">
            <div className="flex items-start justify-between border-b border-[#E3E6EA] pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-[#12161C]">{selectedCompany.name}</h3>
                <p className="text-xs text-[#5B6472] font-medium">{selectedCompany.industry}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="text-[#5B6472] hover:text-[#12161C] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#12161C] space-y-1 bg-[#F6F7F8] p-3.5 rounded-xl border border-[#E3E6EA]">
              <div><span className="text-[#5B6472] font-semibold">Address:</span> {selectedCompany.address}</div>
              <div><span className="text-[#5B6472] font-semibold font-mono">Website:</span> {selectedCompany.website}</div>
              {selectedCompany.notes && <div><span className="text-[#5B6472] font-semibold">Notes:</span> {selectedCompany.notes}</div>}
            </div>

            {/* Linked Contacts */}
            <div className="space-y-2">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5B6472]" />
                <span>Contacts ({linkedContacts.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedContacts.map(c => (
                  <div key={c.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-bold text-[#12161C]">{c.name}</div>
                      <div className="text-[10px] text-[#5B6472]">{c.jobTitle}</div>
                    </div>
                    <div className="text-[10px] text-[#5B6472] font-mono">{c.email}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2 pt-2 border-t border-[#E3E6EA]">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#5B6472]" />
                <span>Deals ({linkedDeals.length})</span>
              </h4>
              <div className="space-y-1.5 font-mono">
                {linkedDeals.map(d => (
                  <div key={d.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-bold text-[#12161C] font-sans">{d.title}</div>
                      <div className="text-[10px] text-[#5B6472]">{d.stageName}</div>
                    </div>
                    <div className="font-bold text-[#255B40]">{formatCurrency(d.value)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5B6472] hover:text-[#12161C] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AeroTech Solutions"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Aerospace & Tech"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.example.com"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Innovation Way, Austin TX"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] resize-none"
                />
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
                  Save Company
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
