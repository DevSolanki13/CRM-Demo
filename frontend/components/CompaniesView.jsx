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
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-zinc-400" />
            <span>Companies & Accounts</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Directory of enterprise accounts and associated contact personas
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-4 rounded-2xl">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name or industry..."
            className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      {/* Companies Table & Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className={`${selectedCompany ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#1c1c21] border border-[#2c2c34] rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#24242b] text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#2c2c34]">
                <tr>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Industry</th>
                  <th className="px-4 py-3.5">Website & Address</th>
                  <th className="px-4 py-3.5">Linked Contacts</th>
                  <th className="px-4 py-3.5">Total Deal Value</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c2c34]">
                {filteredCompanies.map(comp => {
                  const compContacts = contacts.filter(c => c.companyId === comp.id);
                  const compDeals = deals.filter(d => d.companyId === comp.id);
                  const totalVal = compDeals.reduce((sum, d) => sum + d.value, 0);

                  return (
                    <tr
                      key={comp.id}
                      onClick={() => setSelectedCompany(comp)}
                      className={`cursor-pointer transition-colors ${
                        selectedCompany?.id === comp.id ? 'bg-[#24242b] border-l-4 border-emerald-400' : 'hover:bg-[#24242b]/60'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white text-black font-extrabold flex items-center justify-center text-xs">
                            {comp.name.charAt(0)}
                          </div>
                          <span>{comp.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="bg-[#18181c] text-zinc-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#2e2e38]">
                          {comp.industry}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-1 text-white font-medium">
                          <Globe className="w-3 h-3 text-zinc-500" />
                          <span>{comp.website || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{comp.address || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-zinc-300">
                        {compContacts.length} contacts
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-emerald-400">
                        {formatCurrency(totalVal)}
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(comp)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCompany(comp.id)}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/20 rounded-lg"
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
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-start justify-between border-b border-[#2c2c34] pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedCompany.name}</h3>
                <p className="text-xs text-zinc-400 font-medium">{selectedCompany.industry}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-300 space-y-1 bg-[#24242b] p-3.5 rounded-xl border border-[#2f2f3a]">
              <div><span className="text-zinc-500 font-semibold">Address:</span> {selectedCompany.address}</div>
              <div><span className="text-zinc-500 font-semibold">Website:</span> {selectedCompany.website}</div>
              {selectedCompany.notes && <div><span className="text-zinc-500 font-semibold">Notes:</span> {selectedCompany.notes}</div>}
            </div>

            {/* Linked Contacts */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contacts ({linkedContacts.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedContacts.map(c => (
                  <div key={c.id} className="p-2.5 bg-[#24242b] border border-[#2f2f3a] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-zinc-400">{c.jobTitle}</div>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">{c.email}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2 pt-2 border-t border-[#2c2c34]">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>Deals ({linkedDeals.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedDeals.map(d => (
                  <div key={d.id} className="p-2.5 bg-[#24242b] border border-[#2f2f3a] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-bold text-white">{d.title}</div>
                      <div className="text-[10px] text-zinc-400">{d.stageName}</div>
                    </div>
                    <div className="font-extrabold text-emerald-400">${d.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AeroTech Solutions"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Aerospace & Tech"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.example.com"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Innovation Way, Austin TX"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 resize-none"
                />
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

