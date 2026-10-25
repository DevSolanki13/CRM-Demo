import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Kanban, 
  Save, 
  RotateCcw, 
  Check,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  ToggleLeft,
  ToggleRight,
  RefreshCw
} from 'lucide-react';
import { fetchAutomationRules, fetchAutomationStatus, updateAutomationRules } from '../api/crmClient.js';
import { toast } from 'sonner';
import { DEFAULT_FORECAST_PROBABILITIES } from '../utils/reportMetrics.js';
import { DEFAULT_APPROVAL_POLICY } from '../../backend/services/approvalPolicy.js';
import { ReferenceRepairView } from './ReferenceRepairView.jsx';

export const SettingsView = ({
  branding,
  stages,
  pipelines = [],
  users = [],
  records,
  onHistoricalLinkResolved,
  onUpdateBranding,
  onCreateStage,
  onUpdateStage,
  onCreatePipeline,
  onUpdatePipeline,
  onResetDemoData
}) => {
  const [brandingForm, setBrandingForm] = useState({ ...branding });
  const [activeTab, setActiveTab] = useState('branding'); // 'branding' | 'stages' | 'automation' | 'reset'
  
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#FFFFFF');
  const [newPipelineName, setNewPipelineName] = useState('');
  const [settingsPipelineId, setSettingsPipelineId] = useState('pipeline-sales');
  const settingsPipeline = pipelines.find(pipeline => pipeline.id === settingsPipelineId);
  const pipelineStages = stages.filter(stage => stage.pipelineId === settingsPipelineId);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Automation Rules State
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [forecastMonth, setForecastMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reporting, setReporting] = useState(() => branding.customFields?.reporting || {});
  const [approvalPolicy, setApprovalPolicy] = useState(() => ({
    ...DEFAULT_APPROVAL_POLICY, ...(branding.customFields?.approvalPolicy || {})
  }));

  useEffect(() => {
    async function loadRules() {
      setLoadingRules(true);
      try {
        const data = await fetchAutomationRules();
        setRules(Array.isArray(data) ? data : []);
        setAutomationStatus(await fetchAutomationStatus());
      } catch (err) {
        console.warn('Could not load automation rules:', err);
      } finally {
        setLoadingRules(false);
      }
    }
    if (activeTab === 'automation') {
      loadRules();
    }
  }, [activeTab]);

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    await onUpdateBranding(brandingForm);
    setSavedSuccess(true);
    toast.success('Branding settings saved successfully');
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    await onCreateStage({
      name: newStageName,
      color: newStageColor,
      category: 'Pipeline',
      pipelineId: settingsPipelineId,
    });
    setNewStageName('');
    toast.success('New pipeline stage added');
  };

  const handleCreatePipeline = async event => {
    event.preventDefault();
    if (!newPipelineName.trim()) return;
    try {
      const created = await onCreatePipeline({ name: newPipelineName.trim() });
      setSettingsPipelineId(created.id);
      setNewPipelineName('');
    } catch (error) { toast.error(error.message || 'Could not create pipeline'); }
  };

  const handleQualificationChange = async (stageCode, field, checked) => {
    const current = settingsPipeline?.qualificationRules || {};
    const fields = current[stageCode] || [];
    const next = checked ? [...new Set([...fields, field])] : fields.filter(item => item !== field);
    try {
      await onUpdatePipeline(settingsPipelineId, {
        qualificationRules: { ...current, [stageCode]: next }
      });
    } catch (error) { toast.error(error.message || 'Could not save qualification rule'); }
  };

  const handleUpdateStageName = async (id, name) => {
    await onUpdateStage(id, { name });
  };

  const handleRuleChange = (ruleId, field, value) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, [field]: value } : r));
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await updateAutomationRules(rules);
      toast.success('Automatic follow-up rules updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save automation rules');
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveForecast = async () => {
    try {
      const updated = await onUpdateBranding({
        customFields: { ...(branding.customFields || {}), reporting }
      });
      setBrandingForm(updated);
      toast.success('Forecast settings saved');
    } catch (error) {
      toast.error(error.message || 'Could not save forecast settings');
    }
  };

  const handleSaveApprovalPolicy = async () => {
    try {
      const updated = await onUpdateBranding({
        customFields: { ...(branding.customFields || {}), approvalPolicy }
      });
      setBrandingForm(updated);
      toast.success('Approval rules saved');
    } catch (error) {
      toast.error(error.message || 'Could not save approval rules');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#F6F7F8] min-h-screen text-[#12161C]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl shadow-2xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[#12161C] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1D4E63]" />
            <span>Sales settings</span>
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-medium">
            Manage branding, pipeline stages, follow-ups and sales targets.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3E6EA] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'branding' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Branding
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'stages' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Pipeline stages
        </button>
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'automation' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1D4E63]" />
          <span>Follow-ups</span>
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'approvals' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Approvals
        </button>
        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'forecast' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Forecast &amp; Targets
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'links' ? 'bg-[#FFFFFF] text-[#1D4E63] border border-[#E3E6EA] shadow-2xs' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Repair links
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === 'reset' ? 'bg-[#FDF2F1] text-[#922D27] border border-[#F4C4C1]' : 'text-[#5B6472] hover:text-[#12161C]'
          }`}
        >
          Demo data
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
            <label htmlFor="settings-pipeline" className="block font-semibold text-[#5B6472]">Pipeline</label>
            <select id="settings-pipeline" value={settingsPipelineId} onChange={event => setSettingsPipelineId(event.target.value)}
              className="w-full rounded-xl border border-[#CBD2D8] bg-white p-2.5 text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63]">
              {pipelines.map(pipeline => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
            </select>
          </div>

          <form onSubmit={handleCreatePipeline} className="flex flex-col sm:flex-row gap-2 border-b border-[#E3E6EA] pb-4">
            <label htmlFor="new-pipeline-name" className="sr-only">New pipeline name</label>
            <input id="new-pipeline-name" value={newPipelineName} onChange={event => setNewPipelineName(event.target.value)}
              placeholder="New pipeline name" maxLength={80}
              className="flex-1 rounded-xl border border-[#CBD2D8] bg-white p-2.5 text-[#12161C] focus-visible:outline-2 focus-visible:outline-[#1D4E63]" />
            <button type="submit" disabled={!newPipelineName.trim()}
              className="rounded-full bg-[#1D4E63] px-4 py-2 font-bold text-white hover:bg-[#153B4B] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#1D4E63]">
              Create pipeline
            </button>
          </form>

          <div className="space-y-2">
            {pipelineStages.map(stg => (
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

          <div className="space-y-2 border-t border-[#E3E6EA] pt-4">
            <h4 className="font-bold text-sm">Required before a stage change</h4>
            <p className="text-[#5B6472]">Choose the customer details needed before entering each stage in this pipeline.</p>
            {pipelineStages.filter(stage => !['Won', 'Lost'].includes(stage.category)).map(stage => (
              <div key={stage.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-[#F6F7F8] p-3">
                <span className="min-w-32 font-semibold">{stage.name}</span>
                {[['contactId', 'Contact'], ['companyId', 'Company'], ['expectedCloseDate', 'Close date']].map(([field, label]) => (
                  <label key={field} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={Boolean(settingsPipeline?.qualificationRules?.[stage.code]?.includes(field))}
                      onChange={event => handleQualificationChange(stage.code, field, event.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
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

      {/* Automatic Follow-up Rules Tab */}
      {activeTab === 'automation' && (
        <div className="bg-[#FFFFFF] border border-[#E3E6EA] p-6 rounded-2xl max-w-3xl space-y-5 text-xs text-[#12161C] shadow-[0_1px_2px_rgba(18,22,28,0.06)]">
          <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3">
            <div>
              <h3 className="font-display font-bold text-sm text-[#12161C] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1D4E63]" />
                <span>Follow-up rules</span>
              </h3>
              <p className="text-[#5B6472] mt-1 font-medium">
                Configure auto-task rules triggered when leads are created, samples sent, proposals submitted, or renewals approach.
              </p>
            </div>

            <button
              onClick={handleSaveRules}
              disabled={savingRules}
              className="px-4 py-2 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold rounded-full text-xs shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {savingRules ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Rules</span>
            </button>
          </div>

          {automationStatus && (
            <div className="rounded-xl bg-[#F6F7F8] p-4 border border-[#E3E6EA] text-sm" role="status">
              <p className="font-semibold">Renewal worker: {automationStatus.renewal?.status || 'waiting for first run'}</p>
              {automationStatus.renewal?.nextRunAt && <p className="text-[#5B6472] mt-1">Next run: {new Date(automationStatus.renewal.nextRunAt).toLocaleString()}</p>}
              {automationStatus.renewal?.lastError && <p className="text-[#922D27] mt-1">Last error: {automationStatus.renewal.lastError}</p>}
              {automationStatus.failedFollowUps?.length > 0 && (
                <p className="text-[#922D27] mt-1">{automationStatus.failedFollowUps.length} follow-up job(s) waiting to retry.</p>
              )}
            </div>
          )}

          {loadingRules ? (
            <div className="p-8 text-center text-[#5B6472] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1D4E63]" />
              <p>Loading follow-up rules...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    rule.isActive 
                      ? 'bg-[#FAFCFD] border-[#CAD2DB] shadow-2xs' 
                      : 'bg-[#F6F7F8] border-[#E3E6EA] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[#12161C]">{rule.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF]">
                          Trigger: {rule.triggerEvent}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5B6472]">{rule.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRuleChange(rule.id, 'isActive', !rule.isActive)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                        rule.isActive
                          ? 'bg-[#F0F7F3] text-[#255B40] border border-[#BCDBC9]'
                          : 'bg-[#F6F7F8] text-[#5B6472] border border-[#E3E6EA]'
                      }`}
                    >
                      {rule.isActive ? <ToggleRight className="w-4 h-4 text-[#255B40]" /> : <ToggleLeft className="w-4 h-4 text-[#5B6472]" />}
                      <span>{rule.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {rule.isActive && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#E3E6EA]/60">
                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">
                          Due Date Offset (Days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={rule.offsetDays}
                          onChange={(e) => handleRuleChange(rule.id, 'offsetDays', Number(e.target.value))}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2 text-xs font-mono font-bold text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">
                          Task Type
                        </label>
                        <select
                          value={rule.taskType}
                          onChange={(e) => handleRuleChange(rule.id, 'taskType', e.target.value)}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        >
                          <option value="Call">Call</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Email">Email</option>
                          <option value="Sample Follow-up">Sample Follow-up</option>
                          <option value="Proposal Review">Proposal Review</option>
                          <option value="Renewal Check-in">Renewal Check-in</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">
                          Task Priority
                        </label>
                        <select
                          value={rule.priority}
                          onChange={(e) => handleRuleChange(rule.id, 'priority', e.target.value)}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        >
                          <option value="Urgent">Urgent</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-[#5B6472] mb-1">
                          Task Title Template <span className="text-[10px] font-normal font-mono">(Placeholders: &#123;&#123;entityName&#125;&#125;, &#123;&#123;contactName&#125;&#125;, &#123;&#123;companyName&#125;&#125;)</span>
                        </label>
                        <input
                          type="text"
                          value={rule.taskTitleTemplate}
                          onChange={(e) => handleRuleChange(rule.id, 'taskTitleTemplate', e.target.value)}
                          className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset Demo Data Tab */}
      {activeTab === 'approvals' && (
        <section className="bg-white border border-[#E3E6EA] rounded-2xl p-5 sm:p-6 max-w-2xl space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold">Manager approval rules</h2>
            <p className="text-sm text-[#5B6472] mt-1">Choose when a rep’s stage change needs review.</p>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={approvalPolicy.alwaysRequireReview}
              onChange={event => setApprovalPolicy(previous => ({ ...previous, alwaysRequireReview: event.target.checked }))}
              className="mt-1" />
            <span><strong>Review every advance</strong><br /><span className="text-[#5B6472]">Turn this off to review only the exceptions below.</span></span>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">Deal value needing review
              <input type="number" min="0" step="1" value={approvalPolicy.largeDealThreshold}
                onChange={event => setApprovalPolicy(previous => ({ ...previous, largeDealThreshold: Number(event.target.value) }))}
                className="block mt-1 w-full rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
            </label>
            <label className="text-sm font-semibold">Discount needing review (%)
              <input type="number" min="0" max="100" step="1" value={approvalPolicy.discountThresholdPercent}
                onChange={event => setApprovalPolicy(previous => ({ ...previous, discountThresholdPercent: Number(event.target.value) }))}
                className="block mt-1 w-full rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={approvalPolicy.requireIncompleteChecklist}
              onChange={event => setApprovalPolicy(previous => ({ ...previous, requireIncompleteChecklist: event.target.checked }))} />
            Review when a required stage answer is missing
          </label>
          {approvalPolicy.requireIncompleteChecklist && (
            <div className="grid sm:grid-cols-2 gap-3">
              {stages.filter(stage => !['Won', 'Lost'].includes(stage.category)).map(stage => (
                <label key={stage.id} className="text-sm font-semibold">
                  {stage.name} required answers
                  <input type="text" defaultValue={(approvalPolicy.requiredAnswersByStage?.[stage.id] || []).join(', ')}
                    onBlur={event => setApprovalPolicy(previous => ({ ...previous,
                      requiredAnswersByStage: { ...(previous.requiredAnswersByStage || {}),
                        [stage.id]: event.target.value.split(',').map(value => value.trim()).filter(Boolean) }
                    }))}
                    placeholder="Separate checklist labels with commas"
                    className="block mt-1 w-full rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-[#5B6472]">Existing review requests remain pending until a manager decides them.</p>
          <button type="button" onClick={handleSaveApprovalPolicy}
            className="rounded-lg bg-[#1D4E63] text-white px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63]">
            Save approval rules
          </button>
        </section>
      )}

      {activeTab === 'forecast' && (
        <section className="bg-white border border-[#E3E6EA] rounded-2xl p-5 sm:p-6 max-w-3xl space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold">Forecast &amp; sales targets</h2>
            <p className="text-sm text-[#5B6472] mt-1">Set the chance of closing at each stage and a monthly target for each rep.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {stages.filter(stage => !['Won', 'Lost'].includes(stage.category)).map(stage => (
              <label key={stage.id} className="text-sm font-semibold text-[#12161C]">
                {stage.name} probability (%)
                <input type="number" min="0" max="100" step="1"
                  value={reporting.probabilities?.[stage.id] ?? DEFAULT_FORECAST_PROBABILITIES[stage.id] ?? 0}
                  onChange={event => setReporting(previous => ({ ...previous,
                    probabilities: { ...(previous.probabilities || {}), [stage.id]: Number(event.target.value) }
                  }))}
                  className="block mt-1 w-full rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
              </label>
            ))}
          </div>
          <div className="border-t border-[#E3E6EA] pt-5">
            <label className="text-sm font-semibold">Target month
              <input type="month" value={forecastMonth} onChange={event => setForecastMonth(event.target.value)}
                className="block mt-1 rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
            </label>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {users.filter(user => user.active && user.role === 'Sales Rep').map(user => (
                <label key={user.id} className="text-sm font-semibold">
                  {user.name} target
                  <input type="number" min="0" step="1"
                    value={reporting.targets?.[forecastMonth]?.[user.id] ?? 0}
                    onChange={event => setReporting(previous => ({ ...previous,
                      targets: { ...(previous.targets || {}),
                        [forecastMonth]: { ...(previous.targets?.[forecastMonth] || {}), [user.id]: Number(event.target.value) } }
                    }))}
                    className="block mt-1 w-full rounded-lg border border-[#E3E6EA] p-2.5 text-base font-normal" />
                </label>
              ))}
            </div>
          </div>
          <button type="button" onClick={handleSaveForecast}
            className="rounded-lg bg-[#1D4E63] text-white px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4E63]">
            Save forecast settings
          </button>
        </section>
      )}

      {activeTab === 'links' && <ReferenceRepairView records={records} onResolved={onHistoricalLinkResolved} />}

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
