import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Kanban, 
  Save, 
  RotateCcw, 
  Check 
} from 'lucide-react';

export const SettingsView = ({
  branding,
  stages,
  onUpdateBranding,
  onCreateStage,
  onUpdateStage,
  onResetDemoData
}) => {
  const [brandingForm, setBrandingForm] = useState({ ...branding });
  const [activeTab, setActiveTab] = useState('branding');
  
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#1D4E63');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    await onUpdateBranding(brandingForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    await onCreateStage({
      name: newStageName,
      color: newStageColor,
      category: 'New',
      order: stages.length + 1
    });
    setNewStageName('');
  };

  const handleUpdateStageName = async (id, name) => {
    await onUpdateStage(id, { name });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1D4E63]" />
            <span>Customization Hub (Admin Console)</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Re-brand CRM (Logo, colors, terminology, custom pipeline stages, repeat cycle)
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3E6EA] pb-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'branding' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Company Branding & Colors
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'stages' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Pipeline Stage Customizer
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'reset' ? 'bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1]' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Demo Data Reset
        </button>
      </div>

      {/* Branding Settings Form */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-[#12161C] shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
            <h3 className="font-display font-bold text-sm text-[#12161C] flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#1D4E63]" />
              <span>White-Label Branding Config</span>
            </h3>
            {savedSuccess && (
              <span className="text-[#255B40] font-bold text-xs flex items-center gap-1 font-mono">
                <Check className="w-4 h-4" />
                Saved successfully!
              </span>
            )}
          </div>

          <div>
            <label className="block text-[#5B6472] font-semibold mb-1">CRM App Name *</label>
            <input
              type="text"
              required
              value={brandingForm.appName}
              onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
              className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
            />
          </div>

          <div>
            <label className="block text-[#5B6472] font-semibold mb-1">Tagline / Subtitle</label>
            <input
              type="text"
              value={brandingForm.tagline}
              onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
              className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#5B6472] font-semibold mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] font-mono focus:outline-none focus:border-[#1D4E63]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#5B6472] font-semibold mb-1">
                Default Repeat Order Cycle (Days)
              </label>
              <input
                type="number"
                value={brandingForm.defaultRecurrenceDays}
                onChange={(e) => setBrandingForm({ ...brandingForm, defaultRecurrenceDays: Number(e.target.value) })}
                className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2.5 text-[#12161C] font-mono focus:outline-none focus:border-[#1D4E63]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E3E6EA] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-full text-xs shadow-2xs flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Save className="w-4 h-4" />
              <span>Save Branding Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Stages Customizer Tab */}
      {activeTab === 'stages' && (
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-[#12161C] shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div className="border-b border-[#E3E6EA] pb-3">
            <h3 className="font-display font-bold text-sm text-[#12161C] flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[#1D4E63]" />
              <span>Customize Pipeline Stages</span>
            </h3>
            <p className="text-[#5B6472] mt-1 font-medium">
              Rename, change stage colors, or append customized pipeline stages for client industry needs.
            </p>
          </div>

          <div className="space-y-2">
            {stages.map(stg => (
              <div key={stg.id} className="flex items-center gap-3 p-2 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl">
                <input
                  type="color"
                  value={stg.color}
                  onChange={(e) => onUpdateStage(stg.id, { color: e.target.value })}
                  className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={stg.name}
                  onChange={(e) => handleUpdateStageName(stg.id, e.target.value)}
                  className="flex-1 bg-[#FFFFFF] border border-[#E3E6EA] rounded-lg p-2 text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-semibold"
                />
                <span className="text-[10px] text-[#5B6472] uppercase font-mono px-2 py-1 bg-[#FFFFFF] rounded border border-[#E3E6EA]">
                  {stg.category}
                </span>
              </div>
            ))}
          </div>

          {/* Add New Stage */}
          <div className="pt-3 border-t border-[#E3E6EA] flex items-center gap-2">
            <input
              type="color"
              value={newStageColor}
              onChange={(e) => setNewStageColor(e.target.value)}
              className="w-9 h-9 rounded border-0 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="e.g. Technical Audit / Lab Testing"
              className="flex-1 bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-2 text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
            />
            <button
              onClick={handleAddStage}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-full shrink-0 shadow-2xs transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              Add Stage
            </button>
          </div>
        </div>
      )}

      {/* Reset Demo Data Tab */}
      {activeTab === 'reset' && (
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-[#12161C] shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div className="border-b border-[#E3E6EA] pb-3">
            <h3 className="font-display font-bold text-sm text-[#922D27] flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#922D27]" />
              <span>Reset Application State to Seed Demo Data</span>
            </h3>
            <p className="text-[#5B6472] mt-1 font-medium">
              Restores default demo employees, companies, contacts, leads, deals, and activity logs.
            </p>
          </div>

          <button
            onClick={onResetDemoData}
            className="px-5 py-2.5 bg-[#922D27] hover:bg-[#78231E] text-white font-bold rounded-full text-xs flex items-center gap-2 shadow-2xs transition-colors focus-visible:outline-2 focus-visible:outline-[#922D27]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      )}

    </div>
  );
};
