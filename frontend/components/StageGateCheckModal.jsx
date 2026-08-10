import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  Clock,
  UserCheck,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react';

const STAGE_CRITERIA = {
  'New Lead->Contacted': [
    'Reached decision-maker or identified who they are',
    'Confirmed genuine need/use-case',
    'Rough budget range known',
    'Realistic timeline known'
  ],
  'Contacted->Sample Sent': [
    'Exact specs/quantity confirmed',
    'Internal evaluation process/timeline known',
    'Competitor also sampling',
    'Shipping/logistics confirmed'
  ],
  'Sample Sent->Proposal Sent': [
    'Sample passed technical/quality requirements',
    'Decision-maker engaged',
    'Target price point known',
    'Defined next step with date'
  ],
  'Proposal Sent->Negotiation': [
    'Specific feedback received',
    'Pricing is the main blocker vs other issue',
    'Internal approvers identified',
    'Competing vendor still in play'
  ],
  'Negotiation->Closed Won': [
    'Final pricing/terms agreed',
    'Signed PO or firm signing date',
    'Delivery/renewal terms locked'
  ]
};

const LOST_REASONS = [
  'Budget mismatch',
  'No decision-maker access',
  'Losing to competitor',
  'Slow internal process',
  'Technical fit issue',
  'Went silent'
];

const BACKWARD_MOVE_REASONS = [
  'Requirements changed / Scope decreased',
  'Sample re-testing or spec revision needed',
  'Decision-maker changed / New evaluation team',
  'Budget re-evaluation / Funding delay',
  'Competitor re-entered evaluation',
  'Terms & pricing renegotiation requested',
  'Other (detailed in note below)'
];

export const StageGateCheckModal = ({
  isOpen,
  onClose,
  deal,
  fromStage,
  targetStage,
  currentUser,
  onSubmitCheck,
  onApproveCheck,
  onRejectCheck,
  onSaveDraft
}) => {
  const [answers, setAnswers] = useState({});
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [backwardReason, setBackwardReason] = useState(BACKWARD_MOVE_REASONS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forceDirectLost, setForceDirectLost] = useState(false);

  // Transition key
  const transitionKey = `${fromStage?.name}->${targetStage?.name}`;
  
  // Get criteria list or default
  const criteriaList = STAGE_CRITERIA[transitionKey] || [
    'Decision-maker verified and aligned',
    'Commercial requirements confirmed',
    'Next steps defined with agreed timeline'
  ];

  const isBackwardMove = Boolean(fromStage && targetStage && targetStage.order < fromStage.order);

  // Initialize or load existing draft/pending answers
  useEffect(() => {
    setForceDirectLost(false);
    setBackwardReason(BACKWARD_MOVE_REASONS[0]);
    if (deal && deal.pendingGateCheck) {
      setAnswers(deal.pendingGateCheck.answers || {});
      setLostReason(deal.pendingGateCheck.lostReason || LOST_REASONS[0]);
      if (deal.pendingGateCheck.backwardReason) {
        setBackwardReason(deal.pendingGateCheck.backwardReason);
      }
      setNote(deal.pendingGateCheck.note || '');
      if (deal.pendingGateCheck.outcome === 'lost') {
        setForceDirectLost(true);
      }
    } else if (deal && deal.partialGateState && deal.partialGateState.answers) {
      setAnswers(deal.partialGateState.answers || {});
    } else {
      setAnswers({});
      setLostReason(LOST_REASONS[0]);
      setNote('');
    }
  }, [deal, isOpen]);

  if (!isOpen || !deal) return null;

  const isDirectLost = targetStage?.name === 'Closed Lost' || targetStage?.category === 'Lost';
  const isReviewMode = deal.pendingGateCheck && (currentUser.role === 'Admin' || currentUser.role === 'Manager');
  const isLostMode = isDirectLost || forceDirectLost || Object.values(answers).some(val => val === false);
  const totalCriteria = criteriaList.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = isBackwardMove || isLostMode || answeredCount === totalCriteria;
  const hasNoAnswer = isLostMode;
  const allYesAnswers = !isBackwardMove && !isLostMode && allAnswered;

  const handleToggleAnswer = (criterion, val) => {
    if (isReviewMode) return;
    setAnswers(prev => ({
      ...prev,
      [criterion]: val
    }));
  };

  const handleClose = () => {
    // If not submitted, save draft partial state badge
    if (!isReviewMode && !isBackwardMove && !isDirectLost && answeredCount > 0 && !allAnswered) {
      onSaveDraft && onSaveDraft(deal.id, {
        answers,
        badgeText: `${answeredCount}/${totalCriteria} checks passed`
      });
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allAnswered || submitting) return;

    setSubmitting(true);

    if (isBackwardMove) {
      const checkData = {
        dealId: deal.id,
        dealTitle: deal.title,
        fromStageId: fromStage.id,
        fromStageName: fromStage.name,
        targetStageId: targetStage.id,
        targetStageName: targetStage.name,
        submittedBy: currentUser.id,
        submittedByName: currentUser.name,
        status: 'approved_and_executed',
        answers: {},
        outcome: 'demoted',
        backwardReason,
        note,
        partialState: null
      };

      await onSubmitCheck(checkData);
      setSubmitting(false);
      onClose();
      return;
    }

    const outcome = allYesAnswers ? 'advanced' : 'lost';
    
    // Status is approved directly if submitted by Admin or direct lost, else pending_review
    const checkStatus = (currentUser.role === 'Admin' || isDirectLost) ? 'approved_and_executed' : 'pending_review';

    const checkData = {
      dealId: deal.id,
      dealTitle: deal.title,
      fromStageId: fromStage.id,
      fromStageName: fromStage.name,
      targetStageId: targetStage.id,
      targetStageName: targetStage.name,
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      status: checkStatus,
      answers,
      outcome,
      lostReason: outcome === 'lost' ? lostReason : null,
      note,
      partialState: {
        answers,
        badgeText: `${answeredCount}/${totalCriteria} checks passed`
      }
    };

    await onSubmitCheck(checkData);
    setSubmitting(false);
    onClose();
  };

  const handleApprove = async () => {
    if (!deal.pendingGateCheck || submitting) return;
    setSubmitting(true);
    await onApproveCheck(deal.pendingGateCheck.id, currentUser);
    setSubmitting(false);
    onClose();
  };

  const handleReject = async () => {
    if (!deal.pendingGateCheck || submitting) return;
    setSubmitting(true);
    await onRejectCheck(deal.pendingGateCheck.id, currentUser, 'Requirements incomplete');
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#1c1c21] border border-[#2c2c34] rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl text-sm text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2c2c34] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl border ${
                isBackwardMove 
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
              }`}>
                {isBackwardMove ? <RotateCcw className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </span>
              <h2 className="text-base font-extrabold text-white">
                {isBackwardMove ? 'Stage Demotion & Backward Move' : 'Stage Gate Qualification Check'}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400 flex-wrap">
              <span className="font-semibold text-zinc-200">{fromStage?.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              <span className={`font-bold px-2 py-0.5 border rounded-md ${
                isBackwardMove 
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' 
                  : 'bg-[#24242b] text-white border-[#2f2f3a]'
              }`}>
                {targetStage?.name}
              </span>

              {!isReviewMode && !isDirectLost && !isBackwardMove && (
                <button
                  type="button"
                  onClick={() => setForceDirectLost(!forceDirectLost)}
                  className={`ml-2 px-2.5 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition-all border ${
                    forceDirectLost
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-rose-950/80 text-rose-300 hover:text-white hover:bg-rose-900 border-rose-800/80'
                  }`}
                  title="Flag deal as lost"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{forceDirectLost ? '← Back to Stage Check' : 'Move to Deal Lost'}</span>
                </button>
              )}
            </div>
          </div>

          <button onClick={handleClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#24242b]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Review Mode Banner for Manager/Admin */}
        {isReviewMode && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 flex items-start gap-3">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-xs">Pending Manager / Admin Review</div>
              <p className="text-[11px] text-amber-300/90 font-medium">
                Submitted by <strong>{deal.pendingGateCheck.submittedByName}</strong>. Review qualification criteria below before approving transition.
              </p>
            </div>
          </div>
        )}

        {/* Form Body: Backward Move Mode vs Qualification Checklist Mode */}
        {isBackwardMove ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2 text-amber-200">
              <div className="flex items-center gap-2 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Backward Move Demotion &mdash; Reason Required</span>
              </div>
              <p className="text-xs text-amber-300/90 font-medium">
                Moving <strong>{deal.title}</strong> backwards from <strong>{fromStage?.name}</strong> to <strong>{targetStage?.name}</strong>. Please select a demotion reason and enter observations.
              </p>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-2 text-xs uppercase tracking-wider">
                Reason for Backward Move *
              </label>
              <select
                value={backwardReason}
                onChange={(e) => setBackwardReason(e.target.value)}
                className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
              >
                {BACKWARD_MOVE_REASONS.map(r => (
                  <option key={r} value={r} className="bg-[#1c1c21]">{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-zinc-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span>Demotion Explanation / Rep Observations *</span>
              </label>
              <textarea
                required
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain why this deal is being moved backwards..."
                className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div className="pt-4 border-t border-[#2c2c34] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 font-semibold rounded-full text-xs border border-[#2f2f3a]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!note.trim() || submitting}
                className={`px-7 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                  !note.trim()
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-amber-500 hover:bg-amber-400 text-black font-extrabold'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Backward Move to {targetStage?.name}</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Progress Bar & Criteria Counter */}
            <div className="space-y-2 bg-[#18181c] p-3.5 rounded-xl border border-[#2e2e38]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Qualification Criteria Progress</span>
                <span className="font-mono font-bold text-emerald-400">{answeredCount} of {totalCriteria} answered</span>
              </div>
              <div className="h-2 w-full bg-[#24242b] rounded-full overflow-hidden border border-[#2f2f3a]">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(answeredCount / totalCriteria) * 100}%` }}
                />
              </div>
            </div>

            {/* Criteria Checklist Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Required Qualification Checklist
                </span>

                {criteriaList.map((criterion, idx) => {
                  const currentVal = answers[criterion];
                  const isYes = currentVal === true;
                  const isNo = currentVal === false;

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isYes 
                          ? 'bg-emerald-950/20 border-emerald-800/60' 
                          : isNo 
                            ? 'bg-rose-950/20 border-rose-800/60' 
                            : 'bg-[#24242b] border-[#2f2f3a]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-zinc-200 flex-1">
                        {idx + 1}. {criterion}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isReviewMode}
                          onClick={() => handleToggleAnswer(criterion, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isYes 
                              ? 'bg-emerald-500 text-black shadow-sm' 
                              : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#2e2e38]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>YES</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReviewMode}
                          onClick={() => handleToggleAnswer(criterion, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isNo 
                              ? 'bg-rose-600 text-white shadow-sm' 
                              : 'bg-[#18181c] text-zinc-400 hover:text-white border border-[#2e2e38]'
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

              {/* Conditional Lost Reason Section if ANY answer is NO */}
              {hasNoAnswer && (
                <div className="p-4 bg-rose-950/20 border border-rose-800/60 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{forceDirectLost ? 'Deal Flagged as Lost \u2014 Mandatory Lost Reason Required' : 'Criterion Failed \u2014 Deal Will Move to Closed Lost'}</span>
                  </div>
                  
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1 text-xs">
                      Mandatory Lost Reason *
                    </label>
                    <select
                      disabled={isReviewMode}
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-zinc-400 cursor-pointer"
                    >
                      {LOST_REASONS.map(r => (
                        <option key={r} value={r} className="bg-[#1c1c21]">{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Optional Notes Field */}
              <div className="space-y-1">
                <label className="block text-zinc-400 font-semibold text-xs flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Free-text Note / Rep Observations (Optional)</span>
                </label>
                <textarea
                  disabled={isReviewMode}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe in your own words why the lead/deal is progressing or failing criteria..."
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#2c2c34] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#24242b] hover:bg-[#2c2c36] text-zinc-300 font-semibold rounded-xl text-xs border border-[#2f2f3a]"
                >
                  Cancel
                </button>

                {isReviewMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={submitting}
                      className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold rounded-xl text-xs border border-rose-800"
                    >
                      Reject Submission
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={submitting}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Execute Transition</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!allAnswered || submitting}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all ${
                      !allAnswered
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                        : hasNoAnswer
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-white hover:bg-zinc-200 text-black'
                    }`}
                  >
                    {hasNoAnswer ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Submit & Move to Closed Lost</span>
                      </>
                    ) : currentUser.role === 'Admin' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Execute Auto-Advance to {targetStage?.name}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Submit for Manager/Admin Review</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
