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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-xs text-white">
        
        <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            <span>CSV Data Export Center</span>
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <p className="text-zinc-400 font-medium">
            Download formatted CSV file exports of your Contacts, Leads, and Pipeline Deals for reporting, backup, or accounting:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleExportContacts}
              className="p-5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-2xl font-bold text-white flex flex-col items-center gap-2 transition-all shadow-xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-white text-black transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Export Contacts</span>
              <span className="text-[10px] text-zinc-400 font-normal">({state.contacts.length} records)</span>
            </button>

            <button
              onClick={handleExportLeads}
              className="p-5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-2xl font-bold text-white flex flex-col items-center gap-2 transition-all shadow-xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-white text-black transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Export Leads</span>
              <span className="text-[10px] text-zinc-400 font-normal">({state.leads.length} records)</span>
            </button>

            <button
              onClick={handleExportDeals}
              className="p-5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-2xl font-bold text-white flex flex-col items-center gap-2 transition-all shadow-xs group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-white text-black transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Export Deals</span>
              <span className="text-[10px] text-zinc-400 font-normal">({state.deals.length} records)</span>
            </button>
          </div>

          {exportedStatus && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-300 font-bold flex items-center gap-2 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#2c2c34]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 font-semibold rounded-full border border-[#2f2f3a] cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

