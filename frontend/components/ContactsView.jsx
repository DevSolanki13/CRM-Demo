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
import { AddActivityModal } from './AddActivityModal.jsx';

export const ContactsView = ({
  contacts,
  companies,
  users,
  stages = [],
  deals,
  notes,
  activities,
  currentUser,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onCreateNote,
  onCreateActivity,
  onCreateTask,
  onUpdateDeal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('All');
  
  // Drawer / Detail state
  const [selectedContact, setSelectedContact] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [activityModalContact, setActivityModalContact] = useState(null);

  const handleSubmitActivityFromModal = async (payload) => {
    const { activityData, outcomeData, targetEntity } = payload;

    if (onCreateActivity) {
      await onCreateActivity(activityData);
    }

    const contactDeal = deals.find(d => d.contactId === targetEntity.id);

    if (outcomeData.shouldAdvanceStage && outcomeData.targetStageObj && contactDeal && onUpdateDeal) {
      await onUpdateDeal(contactDeal.id, {
        stageId: outcomeData.targetStageObj.id,
        stageName: outcomeData.targetStageObj.name
      });
    }

    if (onCreateTask && outcomeData.assignedOwnerId) {
      await onCreateTask({
        title: `[Follow-up] ${activityData.type}: ${targetEntity.name}`,
        dueDate: outcomeData.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        type: activityData.type === 'Meeting' ? 'Meeting' : 'Call',
        linkedType: 'Contact',
        linkedId: targetEntity.id,
        linkedTitle: targetEntity.name,
        ownerId: outcomeData.assignedOwnerId,
        ownerName: outcomeData.assignedOwnerName,
        status: 'pending',
        note: outcomeData.summaryNote
      });
    }

    setActivityModalContact(null);
  };

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
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <ContactIcon className="w-5 h-5 text-[#1D4E63]" />
            <span>Contacts & Client Directory</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Linked company contacts with detailed timeline history and note log
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-2xs">
        <div className="w-full sm:w-64 relative shrink-0">
          <Search className="w-4 h-4 text-[#5B6472] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, company..."
            className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl pl-10 pr-4 py-2 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5B6472] font-semibold">Filter Company:</span>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl px-3 py-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
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
        <div className={`${selectedContact ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl overflow-hidden shadow-2xs`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#12161C]">
              <thead className="bg-[#F6F7F8] text-[#5B6472] uppercase font-mono font-bold text-[10px] tracking-wider border-b border-[#E3E6EA]">
                <tr>
                  <th className="px-4 py-3.5">Contact Name</th>
                  <th className="px-4 py-3.5">Job Title & Company</th>
                  <th className="px-4 py-3.5">Contact Info</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EA]">
                {filteredContacts.map(cnt => (
                  <tr 
                    key={cnt.id} 
                    onClick={() => setSelectedContact(cnt)}
                    className={`cursor-pointer transition-colors ${
                      selectedContact?.id === cnt.id ? 'bg-[#F6F7F8] border-l-4 border-[#1D4E63]' : 'hover:bg-[#F6F7F8]/60'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-display font-bold text-[#12161C] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1D4E63] text-white font-mono font-extrabold flex items-center justify-center text-xs">
                          {cnt.name.charAt(0)}
                        </div>
                        <span>{cnt.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#12161C]">{cnt.jobTitle || 'Representative'}</div>
                      <div className="text-[11px] text-[#5B6472] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#5B6472]" />
                        <span>{cnt.companyName || 'Unlinked'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono">
                      <div className="text-[11px] text-[#12161C] flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#5B6472]" />
                        <span>{cnt.email}</span>
                      </div>
                      <div className="text-[10px] text-[#5B6472] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#5B6472]" />
                        <span>{cnt.phone}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-[#12161C] font-semibold">
                      {cnt.ownerName || 'Unassigned'}
                    </td>

                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cnt)}
                          className="p-1.5 text-[#5B6472] hover:text-[#12161C] hover:bg-[#F6F7F8] rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteContact(cnt.id)}
                          className="p-1.5 text-[#B5423A] hover:bg-[#FDF2F1] rounded-lg"
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
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl p-5 space-y-4 shadow-2xs text-[#12161C]">
            <div className="flex items-start justify-between border-b border-[#E3E6EA] pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-[#12161C]">{selectedContact.name}</h3>
                <p className="text-xs text-[#5B6472] font-medium">{selectedContact.jobTitle} &bull; {selectedContact.companyName}</p>
              </div>
              <button 
                onClick={() => setSelectedContact(null)}
                className="text-[#5B6472] hover:text-[#12161C] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Controls */}
            <div>
              <button
                onClick={() => setActivityModalContact(selectedContact)}
                className="w-full p-2.5 bg-[#EFF6F9] hover:bg-[#D8E8EF] border border-[#D8E8EF] rounded-xl text-xs text-[#1D4E63] font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <PhoneCall className="w-4 h-4 text-[#1D4E63]" />
                <span>Log Activity & Stage Qualification</span>
              </button>
            </div>

            {/* Linked Deals */}
            <div className="space-y-2">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#5B6472]" />
                <span>Linked Opportunities ({contactDeals.length})</span>
              </h4>
              {contactDeals.length === 0 ? (
                <p className="text-[11px] text-[#5B6472] italic">No deals linked to this contact.</p>
              ) : (
                <div className="space-y-1.5">
                  {contactDeals.map(d => (
                    <div key={d.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs flex justify-between items-center font-mono">
                      <div>
                        <div className="font-bold text-[#12161C] font-sans">{d.title}</div>
                        <div className="text-[10px] text-[#5B6472]">{d.stageName}</div>
                      </div>
                      <div className="font-bold text-[#255B40]">{formatCurrency(d.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 pt-2 border-t border-[#E3E6EA]">
              <h4 className="font-display text-xs font-bold text-[#5B6472] uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#5B6472]" />
                <span>Notes ({contactNotes.length})</span>
              </h4>

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add note for this client..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63] resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold text-xs rounded-full shadow-2xs transition-colors"
                >
                  Save Note
                </button>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto pt-1 no-scrollbar">
                {contactNotes.map(n => (
                  <div key={n.id} className="p-2.5 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl text-xs space-y-1">
                    <p className="text-[#12161C]">{n.text}</p>
                    <div className="text-[10px] text-[#5B6472] flex justify-between font-mono">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#12161C]">
            <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
              <h2 className="font-display text-sm font-bold text-[#12161C]">
                {editingContact ? 'Edit Contact' : 'Create Contact'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5B6472] hover:text-[#12161C] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#5B6472] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. David Miller"
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="VP Procurement"
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                  />
                </div>

                <div>
                  <label className="block text-[#5B6472] font-semibold mb-1">Company</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={Boolean(activityModalContact)}
        onClose={() => setActivityModalContact(null)}
        targetEntity={activityModalContact}
        entityType="Contact"
        stages={stages}
        users={users}
        currentUser={currentUser}
        onSubmitActivity={handleSubmitActivityFromModal}
      />

    </div>
  );
};
