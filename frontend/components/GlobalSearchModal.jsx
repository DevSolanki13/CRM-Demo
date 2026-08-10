import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  Users, 
  Contact, 
  Building2, 
  Briefcase 
} from 'lucide-react';
import { formatCurrency } from '../utils/crmHelpers.js';

export const GlobalSearchModal = ({
  isOpen,
  onClose,
  state,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedLeads = q ? state.leads.filter(l => l.title.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q)).slice(0, 4) : [];
  const matchedContacts = q ? state.contacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.companyName && c.companyName.toLowerCase().includes(q))).slice(0, 4) : [];
  const matchedDeals = q ? state.deals.filter(d => d.title.toLowerCase().includes(q) || (d.companyName && d.companyName.toLowerCase().includes(q))).slice(0, 4) : [];
  const matchedCompanies = q ? state.companies.filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)).slice(0, 4) : [];

  const totalResults = matchedLeads.length + matchedContacts.length + matchedDeals.length + matchedCompanies.length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl text-xs text-white">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Global search leads, contacts, deals, companies..."
            className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <button onClick={onClose} className="absolute right-3.5 top-3 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
          {!q ? (
            <p className="text-center text-zinc-500 py-6 font-medium">Type to search across all records...</p>
          ) : totalResults === 0 ? (
            <p className="text-center text-zinc-500 py-6 font-medium">No matching records found for "{query}".</p>
          ) : (
            <>
              {/* Leads */}
              {matchedLeads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <span>Leads ({matchedLeads.length})</span>
                  </div>
                  {matchedLeads.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { onSelectResult('lead', l); onClose(); }}
                      className="w-full p-2.5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{l.title}</div>
                        <div className="text-[10px] text-zinc-400">{l.contactName} &bull; {l.companyName}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">{l.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Contacts */}
              {matchedContacts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Contact className="w-3 h-3 text-zinc-400" />
                    <span>Contacts ({matchedContacts.length})</span>
                  </div>
                  {matchedContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onSelectResult('contact', c); onClose(); }}
                      className="w-full p-2.5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[10px] text-zinc-400">{c.jobTitle} &bull; {c.companyName}</div>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{c.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Deals */}
              {matchedDeals.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-zinc-400" />
                    <span>Deals ({matchedDeals.length})</span>
                  </div>
                  {matchedDeals.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { onSelectResult('deal', d); onClose(); }}
                      className="w-full p-2.5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{d.title}</div>
                        <div className="text-[10px] text-zinc-400">{d.stageName} &bull; {d.companyName}</div>
                      </div>
                      <span className="font-extrabold text-emerald-400">{formatCurrency(d.value)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Companies */}
              {matchedCompanies.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-zinc-400" />
                    <span>Companies ({matchedCompanies.length})</span>
                  </div>
                  {matchedCompanies.map(comp => (
                    <button
                      key={comp.id}
                      onClick={() => { onSelectResult('company', comp); onClose(); }}
                      className="w-full p-2.5 bg-[#24242b] hover:bg-[#2c2c36] border border-[#2f2f3a] rounded-xl text-left flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white">{comp.name}</div>
                        <div className="text-[10px] text-zinc-400">{comp.industry}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

