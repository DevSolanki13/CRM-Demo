import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Globe, 
  MapPin, 
  Users, 
  DollarSign, 
  Edit3, 
  Trash2, 
  X, 
  Briefcase 
} from 'lucide-react';
import { Company, Contact, Deal } from '../types/crm';
import { formatCurrency } from '../utils/crmHelpers';

interface CompaniesViewProps {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  onCreateCompany: (company: Partial<Company>) => Promise<void>;
  onUpdateCompany: (id: string, company: Partial<Company>) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  contacts,
  deals,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState<Partial<Company>>({
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

  const handleOpenEdit = (comp: Company) => {
    setEditingCompany(comp);
    setFormData({ ...comp });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#5A5A40]" />
            <span>Companies Directory</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            B2B Client Accounts & linked organizational contact structures
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-[#e0e0d5] p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#5A5A40] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company name or industry..."
            className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-full pl-10 pr-4 py-2 text-xs text-[#2d2d2a] placeholder-[#6b6b60]/60 focus:outline-none focus:border-[#5A5A40]"
          />
        </div>
      </div>

      {/* Companies Table & Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className={`${selectedCompany ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-[#e0e0d5] rounded-2xl overflow-hidden shadow-xs`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2d2d2a]">
              <thead className="bg-[#f5f5f0] text-[#5A5A40] uppercase font-bold text-[10px] tracking-wider border-b border-[#e0e0d5]">
                <tr>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Industry</th>
                  <th className="px-4 py-3.5">Website & Address</th>
                  <th className="px-4 py-3.5">Linked Contacts</th>
                  <th className="px-4 py-3.5">Total Deal Value</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0d5]">
                {filteredCompanies.map(comp => {
                  const compContacts = contacts.filter(c => c.companyId === comp.id);
                  const compDeals = deals.filter(d => d.companyId === comp.id);
                  const totalVal = compDeals.reduce((sum, d) => sum + d.value, 0);

                  return (
                    <tr
                      key={comp.id}
                      onClick={() => setSelectedCompany(comp)}
                      className={`cursor-pointer transition-colors ${
                        selectedCompany?.id === comp.id ? 'bg-[#5A5A40]/10 border-l-4 border-[#5A5A40]' : 'hover:bg-[#f5f5f0]/60'
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#2d2d2a] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#5A5A40] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {comp.name.charAt(0)}
                          </div>
                          <span>{comp.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="bg-[#f5f5f0] text-[#5A5A40] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#e0e0d5]">
                          {comp.industry}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-[#6b6b60]">
                        <div className="flex items-center gap-1 text-[#2d2d2a] font-medium">
                          <Globe className="w-3 h-3 text-[#5A5A40]" />
                          <span>{comp.website || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#6b6b60] mt-0.5">
                          <MapPin className="w-3 h-3 text-[#5A5A40]" />
                          <span>{comp.address || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-[#2d2d2a]">
                        {compContacts.length} contacts
                      </td>

                      <td className="px-4 py-3.5 font-extrabold text-[#5A5A40]">
                        {formatCurrency(totalVal)}
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(comp)}
                            className="p-1.5 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCompany(comp.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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
          <div className="bg-white border border-[#e0e0d5] rounded-2xl p-5 space-y-4 shadow-xl text-[#2d2d2a]">
            <div className="flex items-start justify-between border-b border-[#e0e0d5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#2d2d2a]">{selectedCompany.name}</h3>
                <p className="text-xs text-[#6b6b60] font-medium">{selectedCompany.industry}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#2d2d2a] space-y-1 bg-[#fcfcf9] p-3 rounded-xl border border-[#e0e0d5]">
              <div><span className="text-[#6b6b60] font-semibold">Address:</span> {selectedCompany.address}</div>
              <div><span className="text-[#6b6b60] font-semibold">Website:</span> {selectedCompany.website}</div>
              {selectedCompany.notes && <div><span className="text-[#6b6b60] font-semibold">Notes:</span> {selectedCompany.notes}</div>}
            </div>

            {/* Linked Contacts */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Contacts ({linkedContacts.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedContacts.map(c => (
                  <div key={c.id} className="p-2.5 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-semibold text-[#2d2d2a]">{c.name}</div>
                      <div className="text-[10px] text-[#6b6b60]">{c.jobTitle}</div>
                    </div>
                    <div className="text-[10px] text-[#6b6b60] font-medium">{c.email}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2 pt-2 border-t border-[#e0e0d5]">
              <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Deals ({linkedDeals.length})</span>
              </h4>
              <div className="space-y-1.5">
                {linkedDeals.map(d => (
                  <div key={d.id} className="p-2.5 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl text-xs flex justify-between">
                    <div>
                      <div className="font-semibold text-[#2d2d2a]">{d.title}</div>
                      <div className="text-[10px] text-[#6b6b60]">{d.stageName}</div>
                    </div>
                    <div className="font-bold text-[#5A5A40]">${d.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a]">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AeroTech Solutions"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Aerospace & Tech"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.example.com"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="100 Innovation Way, Austin TX"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
