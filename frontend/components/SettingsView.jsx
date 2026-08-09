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
  const [newStageColor, setNewStageColor] = useState('#2563eb');

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
    <div className="p-6 space-y-6 bg-[#f5f5f0] text-[#2d2d2a] min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e0d5] p-6 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#2d2d2a] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#5A5A40]" />
            <span>Customization Hub (Re-branding & Settings)</span>
          </h1>
          <p className="text-xs text-[#6b6b60] mt-1 font-medium">
            Easily re-brand this CRM per client (Logo, colors, terminology, custom pipeline stages, repeat cycle)
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e0e0d5] pb-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === 'branding' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
          }`}
        >
          Company Branding & Colors
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === 'stages' ? 'bg-[#5A5A40] text-white shadow-xs' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
          }`}
        >
          Pipeline Stage Customizer
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            activeTab === 'reset' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'text-[#6b6b60] hover:text-[#2d2d2a]'
          }`}
        >
          Demo Data Reset
        </button>
      </div>

      {/* Branding Settings Form */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-white border border-[#e0e0d5] p-6 rounded-2xl max-w-2xl space-y-4 shadow-xs text-xs text-[#2d2d2a]">
          <div className="flex items-center justify-between border-b border-[#e0e0d5] pb-3">
            <h3 className="font-bold text-sm text-[#2d2d2a] flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#5A5A40]" />
              <span>White-Label Branding Config</span>
            </h3>
            {savedSuccess && (
              <span className="text-[#5A5A40] font-bold text-xs flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved successfully!
              </span>
            )}
          </div>

          <div>
            <label className="block text-[#6b6b60] font-semibold mb-1">CRM App Name *</label>
            <input
              type="text"
              required
              value={brandingForm.appName}
              onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
              className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
            />
          </div>

          <div>
            <label className="block text-[#6b6b60] font-semibold mb-1">Tagline / Subtitle</label>
            <input
              type="text"
              value={brandingForm.tagline}
              onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
              className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#6b6b60] font-semibold mb-1">Primary Brand Color</label>
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
                  className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] font-mono focus:outline-none focus:border-[#5A5A40]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#6b6b60] font-semibold mb-1">
                Default Repeat Order Cycle (Days)
              </label>
              <input
                type="number"
                value={brandingForm.defaultRecurrenceDays}
                onChange={(e) => setBrandingForm({ ...brandingForm, defaultRecurrenceDays: Number(e.target.value) })}
                className="w-full bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2.5 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e0e0d5] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full text-xs shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Branding Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Stages Customizer Tab */}
      {activeTab === 'stages' && (
        <div className="bg-white border border-[#e0e0d5] p-6 rounded-2xl max-w-2xl space-y-4 shadow-xs text-xs text-[#2d2d2a]">
          <div className="border-b border-[#e0e0d5] pb-3">
            <h3 className="font-bold text-sm text-[#2d2d2a] flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[#5A5A40]" />
              <span>Customize Pipeline Stages</span>
            </h3>
            <p className="text-[#6b6b60] mt-1 font-medium">
              Rename, change stage colors, or append customized pipeline stages for client industry needs.
            </p>
          </div>

          <div className="space-y-2">
            {stages.map(stg => (
              <div key={stg.id} className="flex items-center gap-3 p-2 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl">
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
                  className="flex-1 bg-white border border-[#e0e0d5] rounded-lg p-2 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40] font-semibold"
                />
                <span className="text-[10px] text-[#6b6b60] uppercase font-mono px-2 py-1 bg-[#f5f5f0] rounded border border-[#e0e0d5]">
                  {stg.category}
                </span>
              </div>
            ))}
          </div>

          {/* Add New Stage */}
          <div className="pt-3 border-t border-[#e0e0d5] flex items-center gap-2">
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
              className="flex-1 bg-[#fcfcf9] border border-[#e0e0d5] rounded-xl p-2 text-[#2d2d2a] focus:outline-none focus:border-[#5A5A40]"
            />
            <button
              onClick={handleAddStage}
              className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-bold rounded-full shrink-0 shadow-xs transition-colors"
            >
              Add Stage
            </button>
          </div>
        </div>
      )}

      {/* Reset Demo Data Tab */}
      {activeTab === 'reset' && (
        <div className="bg-white border border-[#e0e0d5] p-6 rounded-2xl max-w-2xl space-y-4 shadow-xs text-xs text-[#2d2d2a]">
          <div className="border-b border-[#e0e0d5] pb-3">
            <h3 className="font-bold text-sm text-rose-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-700" />
              <span>Reset Application State to Seed Demo Data</span>
            </h3>
            <p className="text-[#6b6b60] mt-1 font-medium">
              Restores default demo employees, companies, contacts, leads, deals, and activity logs.
            </p>
          </div>

          <button
            onClick={onResetDemoData}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      )}

    </div>
  );
};
