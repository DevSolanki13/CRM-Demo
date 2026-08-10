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
    <div className="p-8 space-y-6 bg-[#131316] text-white min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            <span>Settings & System Customization</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Easily re-brand this CRM per client (Logo, colors, terminology, custom pipeline stages, repeat cycle)
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2c2c34] pb-2">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'branding' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Company Branding & Colors
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'stages' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Pipeline Stage Customizer
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'reset' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Demo Data Reset
        </button>
      </div>

      {/* Branding Settings Form */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-white">
          <div className="flex items-center justify-between border-b border-[#2c2c34] pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-zinc-400" />
              <span>White-Label Branding Config</span>
            </h3>
            {savedSuccess && (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <Check className="w-4 h-4" />
                Saved successfully!
              </span>
            )}
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">CRM App Name *</label>
            <input
              type="text"
              required
              value={brandingForm.appName}
              onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
              className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Tagline / Subtitle</label>
            <input
              type="text"
              value={brandingForm.tagline}
              onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
              className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Primary Brand Color</label>
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
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">
                Default Repeat Order Cycle (Days)
              </label>
              <input
                type="number"
                value={brandingForm.defaultRecurrenceDays}
                onChange={(e) => setBrandingForm({ ...brandingForm, defaultRecurrenceDays: Number(e.target.value) })}
                className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#2c2c34] flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-full text-xs shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Branding Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Stages Customizer Tab */}
      {activeTab === 'stages' && (
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-white">
          <div className="border-b border-[#2c2c34] pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Kanban className="w-4 h-4 text-zinc-400" />
              <span>Customize Pipeline Stages</span>
            </h3>
            <p className="text-zinc-400 mt-1 font-medium">
              Rename, change stage colors, or append customized pipeline stages for client industry needs.
            </p>
          </div>

          <div className="space-y-2">
            {stages.map(stg => (
              <div key={stg.id} className="flex items-center gap-3 p-2 bg-[#24242b] border border-[#2f2f3a] rounded-xl">
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
                  className="flex-1 bg-[#18181c] border border-[#2e2e38] rounded-lg p-2 text-white focus:outline-none focus:border-zinc-500 font-semibold"
                />
                <span className="text-[10px] text-zinc-400 uppercase font-mono px-2 py-1 bg-[#18181c] rounded border border-[#2e2e38]">
                  {stg.category}
                </span>
              </div>
            ))}
          </div>

          {/* Add New Stage */}
          <div className="pt-3 border-t border-[#2c2c34] flex items-center gap-2">
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
              className="flex-1 bg-[#18181c] border border-[#2e2e38] rounded-xl p-2 text-white focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handleAddStage}
              className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-full shrink-0 shadow-xs transition-colors"
            >
              Add Stage
            </button>
          </div>
        </div>
      )}

      {/* Reset Demo Data Tab */}
      {activeTab === 'reset' && (
        <div className="bg-[#1c1c21] border border-[#2c2c34] p-6 rounded-2xl max-w-2xl space-y-4 text-xs text-white">
          <div className="border-b border-[#2c2c34] pb-3">
            <h3 className="font-bold text-sm text-rose-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset Application State to Seed Demo Data</span>
            </h3>
            <p className="text-zinc-400 mt-1 font-medium">
              Restores default demo employees, companies, contacts, leads, deals, and activity logs.
            </p>
          </div>

          <button
            onClick={onResetDemoData}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-full text-xs flex items-center gap-2 shadow-xs transition-colors"
          >

            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      )}

    </div>
  );
};
