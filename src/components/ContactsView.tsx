import React, { useState } from 'react';
import { 
  Contact as ContactIcon, 
  Search, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Edit3, 
  Trash2, 
  X, 
  MessageSquare, 
  PhoneCall, 
  Send, 
  Clock, 
  Briefcase 
} from 'lucide-react';
import { Contact, Company, User as UserType, Note, ActivityLog, Deal } from '../types/crm';
import { formatDate, filterByRole } from '../utils/crmHelpers';

interface ContactsViewProps {
  contacts: Contact[];
  companies: Company[];
  users: UserType[];
  deals: Deal[];
  notes: Note[];
  activities: ActivityLog[];
  currentUser: UserType;
  onCreateContact: (contact: Partial<Contact>) => Promise<void>;
  onUpdateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onCreateNote: (note: Partial<Note>) => Promise<void>;
  onCreateActivity: (activity: Partial<ActivityLog>) => Promise<void>;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('All');
  
  // Drawer / Detail state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: companies[0]?.id || '',
    ownerId: currentUser.id
  });

  const userContacts = filterByRole<Contact>(contacts, currentUser);

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

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({ ...contact });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingContact) {
      await onUpdateContact(editingContact.id, formData);
    } else {
      await onCreateContact(formData);
    }
    setIsModalOpen(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
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

  const handleLogCall = async (isOutbound: boolean) => {
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
  const contactActivities = selectedContact ? activities.filter(a => a.linkedType === 'Contact' && a.linkedId === selectedContact.id) : [];

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] font-serif italic flex items-center gap-2">
            <ContactIcon className="w-5 h-5 text-[#5A5A40]" />
            <span>Contacts & Client Directory</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Linked company contacts with detailed timeline history and note log
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#e0e0d5] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#5A5A40] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, company..."
            className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-full pl-10 pr-4 py-2 text-xs text-[#2d2d2a] placeholder-[#6b6b60]/60 focus:outline-none focus:border-[#5A5A40]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6b6b60] font-medium">Filter Company:</span>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-[#fcfcf9] border border-[#e0e0d5] rounded-full px-3 py-2 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
          >
            <option value="All">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table & Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Column */}
        <div className={`${selectedContact ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white border border-[#e0e0d5] rounded-2xl overflow-hidden shadow-xs`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2d2d2a]">
              <thead className="bg-[#f5f5f0] text-[#5A5A40] uppercase font-bold text-[10px] tracking-wider border-b border-[#e0e0d5]">
                <tr>
                  <th className="px-4 py-3.5">Contact Name</th>
                  <th className="px-4 py-3.5">Job Title & Company</th>
                  <th className="px-4 py-3.5">Contact Info</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0d5]">
                {filteredContacts.map(cnt => (
                  <tr 
                    key={cnt.id} 
                    onClick={() => setSelectedContact(cnt)}
                    className={`cursor-pointer transition-colors ${
                      selectedContact?.id === cnt.id ? 'bg-[#5A5A40]/10 border-l-4 border-[#5A5A40]' : 'hover:bg-[#f5f5f0]/60'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#2d2d2a] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#5A5A40] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          {cnt.name.charAt(0)}
                        </div>
                        <span>{cnt.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#2d2d2a]">{cnt.jobTitle || 'Representative'}</div>
                      <div className="text-[11px] text-[#6b6b60] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#5A5A40]" />
                        <span>{cnt.companyName || 'Unlinked'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-[11px] text-[#2d2d2a] flex items-center gap-1 font-medium">
                        <Mail className="w-3 h-3 text-[#5A5A40]" />
                        <span>{cnt.email}</span>
                      </div>
                      <div className="text-[10px] text-[#6b6b60] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#5A5A40]" />
                        <span>{cnt.phone}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-[#2d2d2a] font-medium">
                      {cnt.ownerName || 'Unassigned'}
                    </td>

                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cnt)}
                          className="p-1.5 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteContact(cnt.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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
          <div className="bg-white border border-[#e0e0d5] rounded-2xl p-5 space-y-4 shadow-xl text-[#2d2d2a]">
            <div className="flex items-start justify-between border-b border-[#e0e0d5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#2d2d2a] font-serif">{selectedContact.name}</h3>
                <p className="text-xs text-[#6b6b60] font-medium">{selectedContact.jobTitle} &bull; {selectedContact.companyName}</p>
              </div>
              <button 
                onClick={() => setSelectedContact(null)}
                className="text-[#6b6b60] hover:text-[#2d2d2a] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLogCall(true)}
                className="p-2 bg-[#f5f5f0] hover:bg-[#eaeae2] border border-[#e0e0d5] rounded-xl text-xs text-[#2d2d2a] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Log Outbound Call</span>
              </button>
              <button
                onClick={() => handleLogCall(false)}
                className="p-2 bg-[#f5f5f0] hover:bg-[#eaeae2] border border-[#e0e0d5] rounded-xl text-xs text-[#2d2d2a] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Log Inbound Call</span>
              </button>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <Briefcase className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Linked Opportunities ({contactDeals.length})</span>
              </h4>
              {contactDeals.length === 0 ? (
                <p className="text-[11px] text-[#6b6b60] italic">No deals linked to this contact.</p>
              ) : (
                <div className="space-y-1.5">
                  {contactDeals.map(d => (
                    <div key={d.id} className="p-2.5 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-[#2d2d2a]">{d.title}</div>
                        <div className="text-[10px] text-[#6b6b60]">{d.stageName}</div>
                      </div>
                      <div className="font-bold text-[#5A5A40]">${d.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-2 border-t border-[#e0e0d5]">
              <h4 className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <MessageSquare className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Notes ({contactNotes.length})</span>
              </h4>

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add note for this client..."
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-xs text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40] resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-semibold text-xs rounded-full shadow-xs transition-colors"
                >
                  Save Note
                </button>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto pt-1">
                {contactNotes.map(n => (
                  <div key={n.id} className="p-2.5 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl text-xs space-y-1">
                    <p className="text-[#2d2d2a]">{n.text}</p>
                    <div className="text-[10px] text-[#6b6b60] flex justify-between font-medium">
                      <span>{n.authorName}</span>
                      <span>{formatDate(n.timestamp)}</span>
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
        <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#2d2d2a]">
            <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
              <h2 className="text-sm font-bold text-[#2d2d2a] font-serif">
                {editingContact ? 'Edit Contact' : 'Create Contact'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#6b6b60] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. David Miller"
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="VP Procurement"
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  />
                </div>

                <div>
                  <label className="block text-[#6b6b60] font-semibold mb-1">Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
