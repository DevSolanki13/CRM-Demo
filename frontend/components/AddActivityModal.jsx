import React, { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  PhoneCall,
  PhoneOff,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { STAGE_CRITERIA, ACTIVITY_STAGE_CRITERIA, getActivityConnectionInfo } from '../utils/crmHelpers.js';

export const AddActivityModal = ({
  isOpen,
  onClose,
  targetEntity,
  entityType = 'Lead', // 'Lead', 'Deal', 'Contact'
  stages = [],
  deals = [],
  users = [],
  currentUser,
  onSubmitActivity
}) => {
  const [activityType, setActivityType] = useState('Call');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  
  // Call Connection Flow State
  const [isConnected, setIsConnected] = useState(true); // default Yes
  
  // Stage Qualification Criteria State
  const [answers, setAnswers] = useState({});
  const [assignedOwnerId, setAssignedOwnerId] = useState(currentUser?.id || '');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // default tomorrow
  );

  const leadDeal = (deals && Array.isArray(deals))
    ? deals.find(d => d.leadId === targetEntity?.id || d.id === targetEntity?.id || d.title === targetEntity?.title)
    : null;

  const entityStageId = targetEntity?.stageId || leadDeal?.stageId;
  const entityStageName = targetEntity?.stageName || leadDeal?.stageName;

  const sortedStages = [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let currentStageIndex = -1;
  if (entityStageId) {
    currentStageIndex = sortedStages.findIndex(s => s.id === entityStageId);
  }
  if (currentStageIndex === -1 && entityStageName) {
    currentStageIndex = sortedStages.findIndex(s => s.name === entityStageName);
  }
  if (currentStageIndex === -1) {
    currentStageIndex = 0;
  }

  const currentStageObj = sortedStages[currentStageIndex] || sortedStages[0];
  const nextStageObj = (currentStageIndex + 1 < sortedStages.length) 
    ? sortedStages[currentStageIndex + 1] 
    : null;

  // Retrieve activity-specific connection labels & questions
  const connectionInfo = getActivityConnectionInfo(activityType);

  const activityKey = activityType.includes('Meeting') 
    ? 'Meeting' 
    : activityType.includes('Email') 
    ? 'Outbound Email' 
    : activityType.includes('Sample') 
    ? 'Sample Follow-up' 
    : activityType.includes('Note') 
    ? 'Note' 
    : 'Call';

  const typeCriteria = ACTIVITY_STAGE_CRITERIA[activityKey] || ACTIVITY_STAGE_CRITERIA['Call'];
  const transitionKey = `${currentStageObj?.name}->${nextStageObj?.name}`;
  
  const criteriaList = typeCriteria[transitionKey] || STAGE_CRITERIA[transitionKey] || [
    `Reached decision-maker or key contact via ${activityType}`,
    `Confirmed requirement and usage timeline via ${activityType}`,
    `Budget alignment confirmed via ${activityType}`,
    `Agreed on next follow-up action for ${activityType}`
  ];

  useEffect(() => {
    if (targetEntity) {
      setDescription(`Logged ${activityType} for ${targetEntity.title || targetEntity.contactName || targetEntity.name}`);
      setAssignedOwnerId(targetEntity.ownerId || currentUser?.id || '');
      setAnswers({});
      setIsConnected(true);
    }
  }, [targetEntity, activityType, isOpen]);

  if (!isOpen || !targetEntity) return null;

  const answeredCount = Object.keys(answers).length;
  const totalCriteria = criteriaList.length;
  const allAnswered = answeredCount === totalCriteria;
  const allPassed = allAnswered && Object.values(answers).every(val => val === true);
  const hasFailedCriteria = Object.values(answers).some(val => val === false);

  const handleToggleAnswer = (criterion, val) => {
    setAnswers(prev => ({
      ...prev,
      [criterion]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    // Determine outcomes based on user prompt rules:
    // 1) If call connected is NO -> Stage remains same, status = 'Follow up' (Yellow), auto task created.
    // 2) If call connected is YES & ALL criteria YES -> Advance stage to next stage!
    // 3) If call connected is YES & ANY criteria NO -> Stage remains same, status = 'Follow up' (Yellow), auto task created.
    
    const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    let shouldAdvanceStage = false;
    let requiresManagerApproval = false;
    let newStatus = 'Follow up';
    let summaryNote = '';

    if (!isConnected) {
      shouldAdvanceStage = false;
      requiresManagerApproval = false;
      newStatus = 'Follow up';
      summaryNote = `${connectionInfo.promptText} -> NO. Status flipped to "Follow up" (Yellow). Auto-followup task created for sales rep agenda.`;
    } else if (allPassed && nextStageObj) {
      if (isAdminOrManager) {
        shouldAdvanceStage = true;
        requiresManagerApproval = false;
        newStatus = nextStageObj.category === 'Won' ? 'Won' : 'Qualified';
        summaryNote = `100% Stage Gate criteria passed! Auto-approved by ${currentUser.name} (${currentUser.role}) and advanced stage to "${nextStageObj.name}".`;
      } else {
        shouldAdvanceStage = false;
        requiresManagerApproval = true;
        newStatus = 'Pending Review';
        summaryNote = `100% Stage Gate criteria matched! Submitted stage advancement request to "${nextStageObj.name}" pending Manager/Admin approval.`;
      }
    } else {
      shouldAdvanceStage = false;
      requiresManagerApproval = false;
      newStatus = 'Follow up';
      const failedCount = Object.values(answers).filter(v => v === false).length;
      summaryNote = `Stage Gate criteria check incomplete (${failedCount} requirement(s) unfulfilled). Stage remains "${currentStageObj?.name}". Status flipped to "Follow up" (Yellow). Auto-followup task created.`;
    }

    const payload = {
      entityType,
      targetEntity,
      activityData: {
        type: activityType,
        description: `${description}\n\n[System Audit Note]: ${summaryNote}`,
        timestamp: new Date(timestamp).toISOString(),
        linkedType: entityType,
        linkedId: targetEntity.id,
        linkedTitle: targetEntity.title || targetEntity.name,
        authorId: currentUser.id,
        authorName: currentUser.name,
        isOutbound: activityType === 'Call' || activityType === 'Outbound Email'
      },
      outcomeData: {
        isConnected,
        criteriaAnswers: answers,
        allPassed,
        shouldAdvanceStage,
        requiresManagerApproval,
        fromStageObj: currentStageObj,
        targetStageObj: nextStageObj || currentStageObj,
        newStatus,
        assignedOwnerId,
        assignedOwnerName: users.find(u => u.id === assignedOwnerId)?.name || currentUser.name,
        dueDate,
        summaryNote
      }
    };

    await onSubmitActivity(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-xl text-xs md:text-sm text-[#12161C] max-h-[90vh] overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#EFF6F9] text-[#1D4E63] border border-[#D8E8EF] rounded-xl">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-[#12161C]">Log Activity & Stage Qualification</h3>
              <div className="text-xs text-[#5B6472] font-medium mt-0.5">
                Target: <strong className="text-[#12161C]">{targetEntity.title || targetEntity.contactName || targetEntity.name}</strong>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Activity Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#12161C] font-bold mb-1.5 text-xs uppercase tracking-wider">Activity Type *</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 text-xs md:text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer font-semibold"
              >
                <option value="Call">Phone Call</option>
                <option value="Meeting">Meeting / Product Demo</option>
                <option value="Outbound Email">Outbound Email</option>
                <option value="Sample Follow-up">Physical Sample Follow-up</option>
                <option value="Note">Internal Sales Note</option>
              </select>
            </div>

            <div>
              <label className="block text-[#12161C] font-bold mb-1.5 text-xs uppercase tracking-wider">Date & Time *</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 text-xs md:text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
              />
            </div>
          </div>

          {/* STEP 1: Activity-Specific Connection & Engagement Toggle */}
          <div className="bg-[#F6F7F8] border border-[#E3E6EA] p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-display font-bold text-xs uppercase tracking-wider text-[#12161C] flex items-center gap-2">
                {isConnected ? <PhoneCall className="w-4 h-4 text-[#16A34A]" /> : <PhoneOff className="w-4 h-4 text-[#DC2626]" />}
                <span>{connectionInfo.promptText} *</span>
              </label>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIsConnected(true)}
                  className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                    isConnected
                      ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-2xs'
                      : 'bg-[#FFFFFF] text-[#5B6472] hover:text-[#12161C] border-[#E3E6EA]'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{connectionInfo.yesLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConnected(false)}
                  className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                    !isConnected
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-2xs'
                      : 'bg-[#FFFFFF] text-[#5B6472] hover:text-[#12161C] border-[#E3E6EA]'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{connectionInfo.noLabel}</span>
                </button>
              </div>
            </div>

            {!isConnected && (
              <div className="p-3.5 bg-[#FEFCE8] border border-[#FEF08A] rounded-xl text-[#A16207] text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#A16207] shrink-0" />
                <span>
                  {connectionInfo.disconnectedNotice}
                </span>
              </div>
            )}
          </div>

          {/* STEP 2: STAGE QUALIFICATION CHECKLIST (Shown when Connected = YES) */}
          {isConnected && (
            <div className="space-y-3.5 bg-[#FAFCFD] border border-[#E3E6EA] p-4.5 rounded-2xl">
              
              {/* Stage Transition Header Info */}
              <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <span className="font-bold text-[#12161C]">Stage Qualification Criteria:</span>
                  <span className="font-mono text-[#5B6472]">
                    {currentStageObj?.name} &rrarr; <strong className="text-[#12161C]">{nextStageObj?.name || 'Closed Won'}</strong>
                  </span>
                </div>

                <span className="text-[11px] font-mono font-bold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 rounded-full">
                  {answeredCount} / {totalCriteria} Answered
                </span>
              </div>

              {/* Checklist Questions */}
              <div className="space-y-2.5">
                {criteriaList.map((criterion, idx) => {
                  const val = answers[criterion];
                  const isYes = val === true;
                  const isNo = val === false;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isYes
                          ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                          : isNo
                          ? 'bg-[#FEF2F2] border-[#FECACA]'
                          : 'bg-[#FFFFFF] border-[#E3E6EA]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#12161C] flex-1">
                        {idx + 1}. {criterion} *
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        <button
                          type="button"
                          onClick={() => handleToggleAnswer(criterion, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isYes
                              ? 'bg-[#16A34A] text-white shadow-2xs'
                              : 'bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C] border border-[#E3E6EA]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>YES</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleAnswer(criterion, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isNo
                              ? 'bg-[#DC2626] text-white shadow-2xs'
                              : 'bg-[#F6F7F8] text-[#5B6472] hover:text-[#12161C] border border-[#E3E6EA]'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>NO</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Feedback Banner */}
              {allPassed && nextStageObj && (
                (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') ? (
                  <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-[#15803D] text-xs font-semibold flex items-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#15803D] shrink-0" />
                    <span>
                      <strong>100% Criteria Matched!</strong> As <strong>{currentUser?.role || 'Admin'}</strong>, saving will <strong>auto-approve & advance stage to "{nextStageObj.name}"</strong>!
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#FEF8EC] border border-[#F5DDA9] rounded-xl text-[#965700] text-xs font-semibold flex items-center gap-2 shadow-2xs">
                    <Clock className="w-4.5 h-4.5 text-[#965700] shrink-0 animate-pulse" />
                    <span>
                      <strong>100% Criteria Matched!</strong> Saving will submit a <strong>Manager/Admin Approval Request</strong> to advance stage to <strong>"{nextStageObj.name}"</strong>.
                    </span>
                  </div>
                )
              )}

              {hasFailedCriteria && (
                <div className="p-3.5 bg-[#FEFCE8] border border-[#FEF08A] rounded-xl text-[#A16207] text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#A16207] shrink-0" />
                  <span>
                    Criterion failed. Stage remains <strong>"{currentStageObj?.name}"</strong>. Status will flip to <strong className="px-2 py-0.5 rounded bg-[#FEFCE8] border border-[#FEF08A] text-[#A16207]">Follow up (Yellow)</strong> and schedule a reminder task.
                  </span>
                </div>
              )}

            </div>
          )}

          {/* Activity Description / Notes */}
          <div>
            <label className="block text-[#12161C] font-bold mb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#5B6472]" />
              <span>Activity Description / Conversation Notes *</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter interaction details, customer objections, or agreement terms..."
              className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 text-xs md:text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63]"
            />
          </div>

          {/* AUTOMATIC FOLLOW-UP REMINDER SECTION */}
          <div className="p-4 bg-[#F6F7F8] border border-[#E3E6EA] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-[#12161C] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A16207]" />
                <span>Automatic Follow-Up Scheduling & Sales Rep Agenda</span>
              </label>
              <span className="text-[10px] font-mono text-[#A16207] bg-[#FEFCE8] border border-[#FEF08A] px-2.5 py-0.5 rounded-full font-bold">
                Follow up Status Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-[#5B6472] font-semibold text-xs mb-1">Assign Follow-Up To Sales Rep *</label>
                <select
                  value={assignedOwnerId}
                  onChange={(e) => setAssignedOwnerId(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#5B6472] font-semibold text-xs mb-1">Follow-Up Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E3E6EA] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#1D4E63] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#E3E6EA] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] font-semibold rounded-full text-xs border border-[#E3E6EA]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-7 py-2.5 bg-[#1D4E63] hover:bg-[#153B4B] text-white font-bold text-xs rounded-full shadow-2xs transition-colors flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[#1D4E63]"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Save Activity & Process Flow</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
