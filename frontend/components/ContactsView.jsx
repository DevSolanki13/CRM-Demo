import React, { useState } from 'react';
import { 
  Contact as ContactIcon, 
  Search, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  Edit3, 
  Trash2, 
  X, 
  MessageSquare, 
  PhoneCall, 
  Briefcase 
} from 'lucide-react';
import { formatDate, filterByRole } from '../utils/crmHelpers.js';

export const ContactsView = ({
  contacts,
  companies,
  users,
  deals,
  notes,
  activities,
  currentUser,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onCreateNote,
  onCreateActivity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('All');
  
  // Drawer / Detail state
  const [selectedContact, setSelectedContact] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: companies[0]?.id || '',
    ownerId: currentUser.id
  });

  const userContacts = filterByRole(contacts, currentUser);

  const filteredContacts = userContacts.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCompany = selectedCompanyId === 'All' || c.companyId === selectedCompanyId;
    return matchesSearch && matchesCompany;
  });

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      companyId: companies[0]?.id || '',
      ownerId: currentUser.id
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setFormData({ ...contact });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingContact) {
      await onUpdateContact(editingContact.id, formData);
    } else {
      await onCreateContact(formData);
    }
    setIsModalOpen(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedContact || !newNoteText.trim()) return;

    await onCreateNote({
      text: newNoteText,
      linkedType: 'Contact',
      linkedId: selectedContact.id,
      authorId: currentUser.id,
      authorName: currentUser.name
    });

    setNewNoteText('');
  };

  const handleLogCall = async (isOutbound) => {
    if (!selectedContact) return;
    await onCreateActivity({
      type: isOutbound ? 'Outbound Call' : 'Inbound Call',
      description: `Logged ${isOutbound ? 'outbound' : 'inbound'} call with ${selectedContact.name}`,
      linkedType: 'Contact',
      linkedId: selectedContact.id,
      linkedTitle: selectedContact.name,
      authorId: currentUser.id,
      authorName: currentUser.name,
      isOutbound
    });
  };

  const contactDeals = selectedContact ? deals.filter(d => d.contactId === selectedContact.id) : [];
  const contactNotes = selectedContact ? notes.filter(n => n.linkedType === 'Contact' && n.linkedId === selectedContact.id) : [];

  return (
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ContactIcon className="w-5 h-5 text-zinc-400" />
            <span>Contacts & Client Directory</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Linked company contacts with detailed timeline history and note log
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1c1c21] border border-[#2c2c34] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="w-full sm:w-64 relative shrink-0">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, company..."
            className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Filter Company:</span>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-[#18181c] border border-[#2e2e38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            <option value="All" className="bg-[#1c1c21]">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id} className="bg-[#1c1c21]">{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table & Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Column */}
        <div className={`${selectedContact ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#1c1c21] border border-[#2c2c34] rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#24242b] text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-[#2c2c34]">
                <tr>
                  <th className="px-4 py-3.5">Contact Name</th>
                  <th className="px-4 py-3.5">Job Title & Company</th>
                  <th className="px-4 py-3.5">Contact Info</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2c2c34]">
                {filteredContacts.map(cnt => (
                  <tr 
                    key={cnt.id} 
                    onClick={() => setSelectedContact(cnt)}
                    className={`cursor-pointer transition-colors ${
                      selectedContact?.id === cnt.id ? 'bg-[#24242b] border-l-4 border-emerald-400' : 'hover:bg-[#24242b]/60'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-xs">
                          {cnt.name.charAt(0)}
                        </div>
                        <span>{cnt.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{cnt.jobTitle || 'Representative'}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-zinc-500" />
                        <span>{cnt.companyName || 'Unlinked'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-[11px] text-zinc-300 flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{cnt.email}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{cnt.phone}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-zinc-300 font-medium">
                      {cnt.ownerName || 'Unassigned'}
                    </td>

                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cnt)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#24242b] rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteContact(cnt.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/20 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Contact Detail Drawer Pane */}
        {selectedContact && (
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-start justify-between border-b border-[#2c2c34] pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedContact.name}</h3>
                <p className="text-xs text-zinc-400 font-medium">{selectedContact.jobTitle} &bull; {selectedContact.companyName}</p>
              </div>
              <button 
                onClick={() => setSelectedContact(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLogCall(true)}
                className="p-2 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-xs text-zinc-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />
                <span>Log Outbound Call</span>
              </button>
              <button
                onClick={() => handleLogCall(false)}
                className="p-2 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-xs text-zinc-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>Log Inbound Call</span>
              </button>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span>Linked Opportunities ({contactDeals.length})</span>
              </h4>
              {contactDeals.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic">No deals linked to this contact.</p>
              ) : (
                <div className="space-y-1.5">
                  {contactDeals.map(d => (
                    <div key={d.id} className="p-2.5 bg-[#24242b] border border-[#2f2f3a] rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{d.title}</div>
                        <div className="text-[10px] text-zinc-400">{d.stageName}</div>
                      </div>
                      <div className="font-extrabold text-emerald-400">${d.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-2 border-t border-[#2c2c34]">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span>Notes ({contactNotes.length})</span>
              </h4>

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add note for this client..."
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-full shadow-xs transition-colors"
                >
                  Save Note
                </button>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto pt-1">
                {contactNotes.map(n => (
                  <div key={n.id} className="p-2.5 bg-[#24242b] border border-[#2f2f3a] rounded-xl text-xs space-y-1">
                    <p className="text-zinc-200">{n.text}</p>
                    <div className="text-[10px] text-zinc-400 flex justify-between font-medium">
                      <span>{n.authorName}</span>
                      <span className="font-mono">{formatDate(n.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingContact ? 'Edit Contact' : 'Create Contact'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. David Miller"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="VP Procurement"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1c1c21]">{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

