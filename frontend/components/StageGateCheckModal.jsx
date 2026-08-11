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

  const transitionKey = `${fromStage?.name}->${targetStage?.name}`;

  const criteriaList = STAGE_CRITERIA[transitionKey] || [
    'Decision-maker verified and aligned',
    'Commercial requirements confirmed',
    'Next steps defined with agreed timeline'
  ];

  const isBackwardMove = Boolean(fromStage && targetStage && targetStage.order < fromStage.order);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E3E6EA] rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-xl text-xs md:text-sm text-[#12161C] max-h-[90vh] overflow-y-auto no-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E6EA] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl border ${isBackwardMove
                  ? 'bg-[#FEF8EC] text-[#C6790A] border-[#F3D9A2]'
                  : 'bg-[#F0F7F3] text-[#3F7A5C] border-[#BCDBC9]'
                }`}>
                {isBackwardMove ? <RotateCcw className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </span>
              <h2 className="font-display text-base font-extrabold text-[#12161C]">
                {isBackwardMove ? 'Stage Demotion & Backward Move' : 'Stage Gate Qualification Check'}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[#5B6472] flex-wrap font-mono">
              <span className="font-bold text-[#12161C]">{fromStage?.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5B6472]" />
              <span className={`font-bold px-2 py-0.5 border rounded-md ${isBackwardMove
                  ? 'bg-[#FEF8EC] text-[#C6790A] border-[#F3D9A2]'
                  : 'bg-[#F6F7F8] text-[#12161C] border-[#E3E6EA]'
                }`}>
                {targetStage?.name}
              </span>

              {!isReviewMode && !isDirectLost && !isBackwardMove && (
                <button
                  type="button"
                  onClick={() => setForceDirectLost(!forceDirectLost)}
                  className={`ml-2 px-2.5 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition-all border ${forceDirectLost
                      ? 'bg-[#B5423A] text-white border-[#B5423A]'
                      : 'bg-[#FDF2F1] text-[#B5423A] hover:bg-[#F9E2E0] border-[#F4C4C1]'
                    }`}
                  title="Flag deal as lost"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{forceDirectLost ? '← Back to Stage Check' : 'Move to Deal Lost'}</span>
                </button>
              )}
            </div>
          </div>

          <button onClick={handleClose} className="p-1.5 text-[#5B6472] hover:text-[#12161C] rounded-lg hover:bg-[#F6F7F8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Review Mode Banner */}
        {isReviewMode && (
          <div className="p-3.5 bg-[#FEF8EC] border border-[#F5DDA9] rounded-xl text-[#965700] flex items-start gap-3">
            <UserCheck className="w-4 h-4 text-[#965700] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-display font-bold text-xs">Pending Manager / Admin Review</div>
              <p className="text-[11px] text-[#5B6472]">
                Submitted by <strong>{deal.pendingGateCheck.submittedByName}</strong>. Review qualification criteria below.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        {isBackwardMove ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-[#FEF8EC] border border-[#F5DDA9] rounded-xl space-y-2 text-[#965700]">
              <div className="flex items-center gap-2 font-bold text-xs">
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Backward Move Demotion &mdash; Reason Required</span>
              </div>
              <p className="text-xs text-[#5B6472]">
                Moving <strong>{deal.title}</strong> backwards from <strong>{fromStage?.name}</strong> to <strong>{targetStage?.name}</strong>. Please select a demotion reason.
              </p>
            </div>

            <div>
              <label className="block text-[#12161C] font-bold mb-2 text-xs uppercase tracking-wider">
                Reason for Backward Move *
              </label>
              <select
                value={backwardReason}
                onChange={(e) => setBackwardReason(e.target.value)}
                className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-xs md:text-sm text-[#12161C] focus:outline-none focus:border-[#1D4E63] cursor-pointer"
              >
                {BACKWARD_MOVE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[#12161C] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#5B6472]" />
                <span>Demotion Explanation / Observations *</span>
              </label>
              <textarea
                required
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain why this deal is being moved backwards..."
                className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3.5 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
              />
            </div>

            <div className="pt-4 border-t border-[#E3E6EA] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] font-semibold rounded-full text-xs border border-[#E3E6EA]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!note.trim() || submitting}
                className={`px-7 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-2xs transition-all ${!note.trim()
                    ? 'bg-[#E3E6EA] text-[#5B6472] cursor-not-allowed border border-[#E3E6EA]'
                    : 'bg-[#965700] hover:bg-[#7D4800] text-white'
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
            <div className="space-y-2 bg-[#F6F7F8] p-3.5 rounded-xl border border-[#E3E6EA]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#12161C]">Qualification Criteria Progress</span>
                <span className="font-mono font-bold text-[#255B40]">{answeredCount} of {totalCriteria} answered</span>
              </div>
              <div className="h-2 w-full bg-[#E3E6EA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#255B40] transition-all duration-300 rounded-full"
                  style={{ width: `${(answeredCount / totalCriteria) * 100}%` }}
                />
              </div>
            </div>

            {/* Criteria Checklist Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono font-bold text-[#5B6472] uppercase tracking-wider block">
                  Required Qualification Checklist
                </span>

                {criteriaList.map((criterion, idx) => {
                  const currentVal = answers[criterion];
                  const isYes = currentVal === true;
                  const isNo = currentVal === false;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isYes
                          ? 'bg-[#F0F7F3] border-[#BCDBC9]'
                          : isNo
                            ? 'bg-[#FDF2F1] border-[#F4C4C1]'
                            : 'bg-[#F6F7F8] border-[#E3E6EA]'
                        }`}
                    >
                      <span className="text-xs font-semibold text-[#12161C] flex-1">
                        {idx + 1}. {criterion}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        <button
                          type="button"
                          disabled={isReviewMode}
                          onClick={() => handleToggleAnswer(criterion, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isYes
                              ? 'bg-[#255B40] text-white shadow-2xs'
                              : 'bg-[#FFFFFF] text-[#5B6472] hover:text-[#12161C] border border-[#E3E6EA]'
                            }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>YES</span>
                        </button>

                        <button
                          type="button"
                          disabled={isReviewMode}
                          onClick={() => handleToggleAnswer(criterion, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isNo
                              ? 'bg-[#922D27] text-white shadow-2xs'
                              : 'bg-[#FFFFFF] text-[#5B6472] hover:text-[#12161C] border border-[#E3E6EA]'
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
                <div className="p-4 bg-[#FDF2F1] border border-[#F4C4C1] rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-[#922D27] font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-[#922D27]" />
                    <span>{forceDirectLost ? 'Deal Flagged as Lost \u2014 Mandatory Lost Reason Required' : 'Criterion Failed \u2014 Deal Will Move to Closed Lost'}</span>
                  </div>

                  <div>
                    <label className="block text-[#12161C] font-semibold mb-1 text-xs">
                      Mandatory Lost Reason *
                    </label>
                    <select
                      disabled={isReviewMode}
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#F4C4C1] rounded-xl p-2.5 text-xs text-[#12161C] focus:outline-none focus:border-[#922D27] cursor-pointer"
                    >
                      {LOST_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Optional Notes Field */}
              <div className="space-y-1">
                <label className="block text-[#5B6472] font-semibold text-xs flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Free-text Note / Rep Observations (Optional)</span>
                </label>
                <textarea
                  disabled={isReviewMode}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe in your own words why the lead/deal is progressing or failing criteria..."
                  className="w-full bg-[#F6F7F8] border border-[#E3E6EA] rounded-xl p-3 text-xs text-[#12161C] placeholder-[#5B6472] focus:outline-none focus:border-[#1D4E63]"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#E3E6EA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#F6F7F8] hover:bg-[#EEF0F3] text-[#5B6472] font-semibold rounded-xl text-xs border border-[#E3E6EA]"
                >
                  Cancel
                </button>

                {isReviewMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={submitting}
                      className="px-4 py-2 bg-[#FDF2F1] hover:bg-[#F9E2E0] text-[#922D27] font-bold rounded-xl text-xs border border-[#F4C4C1]"
                    >
                      Reject Submission
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={submitting}
                      className="px-5 py-2 bg-[#255B40] hover:bg-[#1E4A34] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Execute Transition</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!allAnswered || submitting}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-2xs transition-all ${!allAnswered
                        ? 'bg-[#E3E6EA] text-[#5B6472] cursor-not-allowed border border-[#E3E6EA]'
                        : hasNoAnswer
                          ? 'bg-[#922D27] hover:bg-[#78231E] text-white'
                          : 'bg-[#1D4E63] hover:bg-[#153B4B] text-white'
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
