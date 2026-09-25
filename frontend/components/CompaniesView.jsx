import React, { useState, useMemo } from 'react';
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
  companies = [],
  contacts = [],
  deals = [],
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

  // Selective Memoization of Companies
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.industry && c.industry.toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

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

  const linkedContacts = useMemo(() => {
    return selectedCompany ? contacts.filter(c => c.companyId === selectedCompany.id) : [];
  }, [selectedCompany, contacts]);

  const linkedDeals = useMemo(() => {
    return selectedCompany ? deals.filter(d => d.companyId === selectedCompany.id) : [];
  }, [selectedCompany, deals]);

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1D4E63]" aria-hidden="true" />
            <span>Companies & Corporate Accounts</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Directory of enterprise accounts and associated contact personas
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          aria-label="Add new company account"
          className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
        >
          <Plus className="w-4 h-4 text-white" aria-hidden="true" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search companies by name or industry"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name or industry..."
            className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-10 pr-4 py-2 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
          />
        </div>
      </div>

      {/* Companies Table & Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className={`${selectedCompany ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl overflow-hidden shadow-sm`}>
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs text-[#12161C]">
              <thead className="sticky top-0 z-10 bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA] shadow-xs">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Company Name</th>
                  <th scope="col" className="px-4 py-3.5">Industry</th>
                  <th scope="col" className="px-4 py-3.5">Website & Address</th>
                  <th scope="col" className="px-4 py-3.5">Linked Contacts</th>
                  <th scope="col" className="px-4 py-3.5">Total Deal Value</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EA]">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#5B6472]">
                      <p className="font-semibold text-xs">No companies found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map(comp => {
                    const compContacts = contacts.filter(c => c.companyId === comp.id);
                    const compDeals = deals.filter(d => d.companyId === comp.id);
                    const totalVal = compDeals.reduce((sum, d) => sum + (d.value || 0), 0);

                    return (
                      <tr
                        key={comp.id}
                        onClick={() => setSelectedCompany(comp)}
                        className={`cursor-pointer transition-colors ${
                          selectedCompany?.id === comp.id ? 'bg-[#EFF6F9] font-semibold border-l-2 border-[#1D4E63]' : 'hover:bg-[#F6F7F8]'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-display font-bold text-[#12161C] flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#1D4E63] text-white font-mono font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {comp.name.charAt(0)}
                            </div>
                            <span>{comp.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="bg-[#EFF6F9] text-[#1D4E63] px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border border-[#D8E8EF]">
                            {comp.industry}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-[11px] font-mono">
                          <div className="flex items-center gap-1 text-[#12161C] font-semibold">
                            <Globe className="w-3 h-3 text-[#1D4E63]" aria-hidden="true" />
                            <span>{comp.website || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#5B6472] mt-0.5">
                            <MapPin className="w-3 h-3 text-[#5B6472]" aria-hidden="true" />
                            <span>{comp.address || 'N/A'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-[#12161C]">
                          <span className="bg-[#F6F7F8] px-2 py-0.5 rounded-md border border-[#E3E6EA]">
                            {compContacts.length} contacts
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono font-extrabold text-[#255B40]">
                          {formatCurrency(totalVal)}
                        </td>

                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(comp)}
                              aria-label={`Edit ${comp.name}`}
                              className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => onDeleteCompany(comp.id)}
                              aria-label={`Delete ${comp.name}`}
                              className="p-1.5 text-[#922D27] hover:bg-[#FDF2F1] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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

        {/* Selected Company Drawer Pane */}
        {selectedCompany && (
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 space-y-4 shadow-sm text-[#12161C]">
            <div className="flex items-start justify-between border-b border-[#E3E6EA] pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-[#12161C]">{selectedCompany.name}</h3>
                <span className="bg-[#EFF6F9] text-[#1D4E63] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#D8E8EF] mt-1 inline-block">
                  {selectedCompany.industry}
                </span>
              </div>
              <button onClick={() => setSelectedCompany(null)} aria-label="Close detail pane" className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="text-xs text-[#12161C] space-y-1 bg-[#F6F7F8] p-3.5 rounded-xl border border-[#E3E6EA]">
              <div><span className="text-[#5B6472] font-semibold">Address:</span> {selectedCompany.address || 'Not specified'}</div>
              <div><span className="text-[#5B6472] font-semibold font-mono">Website:</span> {selectedCompany.website || 'Not specified'}</div>
              {selectedCompany.notes && <div><span className="text-[#5B6472] font-semibold">Notes:</span> {selectedCompany.notes}</div>}
            </div>

            {/* Linked Contacts */}
            <div className="space-y-2">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />
                <span>Contacts ({linkedContacts.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedContacts.length === 0 ? (
                  <p className="text-[11px] text-[#5B6472] italic">No contacts registered for this account.</p>
                ) : (
                  linkedContacts.map(c => (
                    <div key={c.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs flex justify-between">
                      <div>
                        <div className="font-bold text-[#12161C]">{c.name}</div>
                        <div className="text-[10px] text-[#5B6472]">{c.jobTitle}</div>
                      </div>
                      <div className="text-[10px] text-[#1D4E63] font-mono">{c.email}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2 pt-2 border-t border-[#E3E6EA]">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#1D4E63]" aria-hidden="true" />
                <span>Deals ({linkedDeals.length})</span>
              </h4>
              <div className="space-y-1.5 font-mono">
                {linkedDeals.length === 0 ? (
                  <p className="text-[11px] text-[#5B6472] italic font-sans">No deals linked to this account.</p>
                ) : (
                  linkedDeals.map(d => (
                    <div key={d.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[#12161C] font-sans">{d.title}</div>
                        <div className="text-[10px] text-[#5B6472]">{d.stageName}</div>
                      </div>
                      <div className="font-bold text-[#255B40]">{formatCurrency(d.value)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[var(--ink)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="font-display text-sm font-bold text-[var(--ink)]">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close modal" className="text-[var(--ink-muted)] hover:text-[var(--ink)] p-1 rounded-lg">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--ink-muted)] font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AeroTech Solutions"
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--ink-muted)] font-semibold mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Aerospace & Tech"
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--ink-muted)] font-semibold mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.example.com"
                    className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--ink-muted)] font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Innovation Way, Austin TX"
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)]"
                />
              </div>

              <div>
                <label className="block text-[var(--ink-muted)] font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--primary-600)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--canvas)] hover:bg-[#EEF0F3] text-[var(--ink-muted)] rounded-full font-semibold border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white rounded-full font-bold shadow-2xs"
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
