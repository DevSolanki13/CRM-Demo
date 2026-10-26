import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { exportToCSV } from '../utils/crmHelpers.js';
import { fetchAllRecords } from '../api/crmClient.js';

export const ImportExportModal = ({
  isOpen,
  onClose,
  state
}) => {
  const [exportedStatus, setExportedStatus] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exportingResource, setExportingResource] = useState(null);

  if (!isOpen) return null;

  const getRecordCount = (resource) => {
    if (state._pages?.[resource]?.total !== undefined) {
      return state._pages[resource].total;
    }
    return state[resource]?.length ?? 0;
  };

  const triggerExportStatus = (message) => {
    setExportedStatus(message);
    setExportError(null);
    setTimeout(() => {
      setExportedStatus(null);
    }, 4000);
  };

  const handleExportContacts = async () => {
    try {
      setExportingResource('contacts');
      setExportError(null);
      const contacts = await fetchAllRecords('contacts');
      const rows = contacts.map(c => ({
        Name: c.name,
        Email: c.email,
        Phone: c.phone,
        JobTitle: c.jobTitle,
        Company: c.companyName,
        Owner: c.ownerName,
        CreatedAt: c.createdAt
      }));
      exportToCSV('crm_contacts_export.csv', rows);
      triggerExportStatus(`Successfully exported ${rows.length} contacts to crm_contacts_export.csv!`);
    } catch (err) {
      setExportError(`Failed to export contacts: ${err.message}`);
    } finally {
      setExportingResource(null);
    }
  };

  const handleExportLeads = async () => {
    try {
      setExportingResource('leads');
      setExportError(null);
      const leads = await fetchAllRecords('leads');
      const rows = leads.map(l => ({
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
      triggerExportStatus(`Successfully exported ${rows.length} leads to crm_leads_export.csv!`);
    } catch (err) {
      setExportError(`Failed to export leads: ${err.message}`);
    } finally {
      setExportingResource(null);
    }
  };

  const handleExportDeals = async () => {
    try {
      setExportingResource('deals');
      setExportError(null);
      const deals = await fetchAllRecords('deals');
      const rows = deals.map(d => ({
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
      triggerExportStatus(`Successfully exported ${rows.length} deals to crm_deals_export.csv!`);
    } catch (err) {
      setExportError(`Failed to export deals: ${err.message}`);
    } finally {
      setExportingResource(null);
    }
  };

  const isBusy = !!exportingResource;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FAFCFD] border border-[#E3E6EA] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-[0_8px_24px_rgba(18,22,28,0.12)] text-xs text-[#12161C]">
        
        <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
          <h2 className="font-display text-sm font-bold text-[#12161C] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#1D4E63]" />
            <span>CSV Data Export Center</span>
          </h2>
          <button onClick={onClose} disabled={isBusy} className="text-[#5B6472] hover:text-[#12161C] p-1 rounded-lg disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <p className="text-[#5B6472] font-medium">
            Download formatted CSV file exports of your Contacts, Leads, and Pipeline Deals. All pages across the entire database are retrieved:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleExportContacts}
              disabled={isBusy}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                {exportingResource === 'contacts' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold text-[#12161C]">
                {exportingResource === 'contacts' ? 'Exporting...' : 'Export Contacts'}
              </span>
              <span className="text-[10px] text-[#5B6472] font-mono">
                ({getRecordCount('contacts')} records)
              </span>
            </button>

            <button
              onClick={handleExportLeads}
              disabled={isBusy}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                {exportingResource === 'leads' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold text-[#12161C]">
                {exportingResource === 'leads' ? 'Exporting...' : 'Export Leads'}
              </span>
              <span className="text-[10px] text-[#5B6472] font-mono">
                ({getRecordCount('leads')} records)
              </span>
            </button>

            <button
              onClick={handleExportDeals}
              disabled={isBusy}
              className="p-5 bg-[#FFFFFF] hover:bg-[#EFF6F9] border border-[#E3E6EA] rounded-2xl font-bold text-[#12161C] flex flex-col items-center gap-2 transition-all shadow-2xs group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2.5 rounded-xl bg-[#1D4E63] text-white transition-colors">
                {exportingResource === 'deals' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs font-bold text-[#12161C]">
                {exportingResource === 'deals' ? 'Exporting...' : 'Export Deals'}
              </span>
              <span className="text-[10px] text-[#5B6472] font-mono">
                ({getRecordCount('deals')} records)
              </span>
            </button>
          </div>

          {exportedStatus && (
            <div className="p-3 bg-[#F0F7F3] border border-[#BCDBC9] rounded-xl text-[#255B40] font-bold flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#255B40] shrink-0" />
              <span>{exportedStatus}</span>
            </div>
          )}

          {exportError && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-xl text-[#9B1C1C] font-bold flex items-center gap-2 text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-[#9B1C1C] shrink-0" />
              <span>{exportError}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#E3E6EA]">
          <button
            onClick={onClose}
            disabled={isBusy}
            className="px-5 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] font-semibold rounded-full border border-[#E3E6EA] cursor-pointer disabled:opacity-40"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
