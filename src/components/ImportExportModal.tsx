import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import { exportToCSV, parseCSVText } from '../utils/crmHelpers';
import { Contact, Lead, Deal, CRMState } from '../types/crm';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CRMState;
  onImportContacts: (items: any[]) => Promise<void>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  state,
  onImportContacts
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [importedSuccess, setImportedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    const rows = parseCSVText(csvText);
    setParsedRows(rows);
  };

  const handleRunImport = async () => {
    if (parsedRows.length === 0) return;
    await onImportContacts(parsedRows);
    setImportedSuccess(true);
    setTimeout(() => {
      setImportedSuccess(false);
      onClose();
    }, 1500);
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
  };

  return (
    <div className="fixed inset-0 bg-[#2d2d2a]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e0e0d5] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-xs text-[#2d2d2a]">
        
        <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
          <h2 className="text-sm font-bold text-[#2d2d2a] font-serif flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#5A5A40]" />
            <span>CSV Import & Export Center</span>
          </h2>
          <button onClick={onClose} className="text-[#6b6b60] hover:text-[#2d2d2a] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-[#e0e0d5] pb-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
              activeTab === 'export' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
            }`}
          >
            Export Data to CSV
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-1.5 rounded-full font-semibold transition-colors ${
              activeTab === 'import' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
            }`}
          >
            Import Contacts CSV
          </button>
        </div>

        {activeTab === 'export' && (
          <div className="space-y-3 py-2">
            <p className="text-[#6b6b60] font-medium">Download formatted CSV exports for your reports or accounting:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleExportContacts}
                className="p-4 bg-[#fcfcf9] hover:bg-[#f5f5f0] border border-[#e0e0d5] rounded-xl font-bold text-[#2d2d2a] flex flex-col items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-5 h-5 text-[#5A5A40]" />
                <span>Export Contacts</span>
              </button>

              <button
                onClick={handleExportLeads}
                className="p-4 bg-[#fcfcf9] hover:bg-[#f5f5f0] border border-[#e0e0d5] rounded-xl font-bold text-[#2d2d2a] flex flex-col items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-5 h-5 text-[#5A5A40]" />
                <span>Export Leads</span>
              </button>

              <button
                onClick={handleExportDeals}
                className="p-4 bg-[#fcfcf9] hover:bg-[#f5f5f0] border border-[#e0e0d5] rounded-xl font-bold text-[#2d2d2a] flex flex-col items-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-5 h-5 text-[#5A5A40]" />
                <span>Export Deals</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-3 py-1">
            <p className="text-[#6b6b60] font-medium">Paste CSV text below with columns: <code className="bg-[#f5f5f0] px-1.5 py-0.5 rounded border border-[#e0e0d5] text-[#2d2d2a]">name, email, phone, jobTitle, companyName</code></p>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name, email, phone, jobTitle, companyName&#10;John Doe, john@example.com, +1 555-0100, VP Sales, Acme Corp"
              className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] font-mono focus:outline-none focus:border-[#5A5A40] resize-none"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={handleParse}
                className="px-4 py-1.5 bg-[#f5f5f0] hover:bg-[#eaeae2] text-[#2d2d2a] font-semibold rounded-full border border-[#e0e0d5]"
              >
                Preview CSV ({parsedRows.length} rows)
              </button>

              {parsedRows.length > 0 && (
                <button
                  onClick={handleRunImport}
                  className="px-5 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full shadow-xs transition-colors"
                >
                  Confirm Import {parsedRows.length} Items
                </button>
              )}
            </div>

            {importedSuccess && (
              <p className="text-[#5A5A40] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Successfully imported contacts!
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
