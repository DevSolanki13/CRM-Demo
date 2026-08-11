import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2
} from 'lucide-react';
import { exportToCSV } from '../utils/crmHelpers.js';

export const ImportExportModal = ({
  isOpen,
  onClose,
  state
}) => {
  const [exportedStatus, setExportedStatus] = useState(null);

  if (!isOpen) return null;

  const triggerExportStatus = (filename) => {
    setExportedStatus(`Successfully exported ${filename}!`);
    setTimeout(() => {
      setExportedStatus(null);
    }, 3000);
  };

  const handleExportContacts = () => {
    const rows = state.contacts.map(c => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      JobTitle: c.jobTitle,
      Company: c.companyName,
      Owner: c.ownerName,
      CreatedAt: c.createdAt
    }));
    exportToCSV('crm_contacts_export.csv', rows);
    triggerExportStatus('crm_contacts_export.csv');
  };

  const handleExportLeads = () => {
    const rows = state.leads.map(l => ({
      Title: l.title,
      ContactName: l.contactName,
      ContactEmail: l.contactEmail,
      Company: l.companyName,
      Source: l.source,
      Outbound: l.isOutbound ? 'Yes' : 'No',
      Status: l.status,
      Owner: l.ownerName,
      CreatedAt: l.createdAt
    }));
    exportToCSV('crm_leads_export.csv', rows);
    triggerExportStatus('crm_leads_export.csv');
  };

  const handleExportDeals = () => {
    const rows = state.deals.map(d => ({
      Title: d.title,
      Value: d.value,
      Currency: d.currency,
      Stage: d.stageName,
      Company: d.companyName,
      Contact: d.contactName,
      Owner: d.ownerName,
      Status: d.status,
      CreatedAt: d.createdAt
    }));
    exportToCSV('crm_deals_export.csv', rows);
    triggerExportStatus('crm_deals_export.csv');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-xs text-[#12161C]">
        
        <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
          <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#1D4E63]" />
            <span>CSV Data Export Center</span>
          </h2>
          <button onClick={onClose} className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <p className="text-[#5B6472] font-medium">
            Download formatted CSV file exports of your Contacts, Leads, and Pipeline Deals for reporting, backup, or accounting:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleExportContacts}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#12161C]">Export Contacts</span>
              <span className="text-[10px] text-[#5B6472] font-mono">({state.contacts.length} records)</span>
            </button>

            <button
              onClick={handleExportLeads}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#12161C]">Export Leads</span>
              <span className="text-[10px] text-[#5B6472] font-mono">({state.leads.length} records)</span>
            </button>

            <button
              onClick={handleExportDeals}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#12161C]">Export Deals</span>
              <span className="text-[10px] text-[#5B6472] font-mono">({state.deals.length} records)</span>
            </button>
          </div>

          {exportedStatus && (
            <div className="p-3 bg-[#F0F7F3] border border-[#BCDBC9] rounded-xl text-[#255B40] font-bold flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#255B40] shrink-0" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#E3E6EA]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] font-semibold rounded-full border border-[#E3E6EA] cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
