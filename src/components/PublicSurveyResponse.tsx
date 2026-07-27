import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PublicSurveyResponseProps {
  token: string;
}

export default function PublicSurveyResponse({ token }: PublicSurveyResponseProps) {
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Ratings & comments
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');

  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: inv, error } = await supabase
          .rpc('get_survey_invitation_by_token', { p_token: token })
          .maybeSingle<any>();
        if (error) throw error;
        if (!inv) {
          setErrorMsg('This evaluation link is invalid or does not exist.');
          setLoading(false);
          return;
        }

        if (inv.used) {
          setErrorMsg('This unique evaluation link has already been used. Student feedback links are strictly single-use to guarantee anonymity.');
          setLoading(false);
          return;
        }

        // Check if the expiration date has passed
        if (inv.expiresAt) {
          const closeDate = new Date(inv.expiresAt);
          // Set to end of closing date day (23:59:59)
          closeDate.setHours(23, 59, 59, 999);
          if (new Date() > closeDate) {
            setErrorMsg(`The closing date (${inv.expiresAt}) for this survey has passed, and this evaluation is now closed.`);
            setLoading(false);
            return;
          }
        }

        setInvitation(inv);

        // Pre-fill ratings with 5
        const defaultRatings: Record<string, number> = {};
        if (inv.questions && Array.isArray(inv.questions)) {
          inv.questions.forEach((_, idx) => {
            defaultRatings[idx] = 5;
          });
        } else {
          // Fallback to standard 4 questions if none attached
          for (let i = 0; i < 4; i++) {
            defaultRatings[i] = 5;
          }
        }
        setRatings(defaultRatings);

      } catch (err: any) {
        setErrorMsg('An error occurred while validating your unique token. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadInvitation();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    // Validate that all questions are answered
    const questionList = invitation.questions || [
      "Lecturer starts lectures on time and displays professional punctuality",
      "Module outcomes and materials are clearly articulated and aligned with higher education standards",
      "Assessments are graded with constructive feedback and objective transparency",
      "Quality and relevance of the text, slides, and supplementary guidelines"
    ];

    const allAnswered = questionList.every((_, idx) => ratings[idx] !== undefined);
    if (!allAnswered) {
      alert('Please answer all evaluation questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_survey_response', {
        p_invitation_id: invitation.id,
        p_ratings: ratings,
        p_comments: comments.trim()
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to transmit anonymous response. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const questionList = invitation?.questions || [
    "Lecturer starts lectures on time and displays professional punctuality",
    "Module outcomes and materials are clearly articulated and aligned with higher education standards",
    "Assessments are graded with constructive feedback and objective transparency",
    "Quality and relevance of the text, slides, and supplementary guidelines"
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verifying unique secure link...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-surface border border-border rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-transparent opacity-50" />
          <AlertTriangle className="w-14 h-14 text-rose-500 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h3 className="text-xl font-black text-foreground uppercase tracking-wider">Access Unverified</h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              {errorMsg}
            </p>
          </div>
          <div className="pt-4 border-t border-border-subtle flex flex-col items-center gap-2">
            <span className="text-[9px] text-subtle-foreground font-bold uppercase tracking-widest">
              AEGISEDU SECURE DOUBLE-BLIND ASSESSMENTS
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-indigo-500 selection:text-foreground font-sans py-12 px-4 relative overflow-x-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl mx-auto space-y-8 z-10">
        
        {/* Top Branding / Institutional Info */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">
                STUDENT EVALUATION PORTAL
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Aegis<span className="text-indigo-400">EDU</span>
            </h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-subtle-foreground font-black uppercase tracking-widest">Double-Blind Protocol</p>
            <p className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5 flex items-center gap-1 justify-end">
              <ShieldCheck className="w-3.5 h-3.5" /> Enforced Anonymity
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface border border-border rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50" />
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-wider">Evaluation Completed!</h2>
                <p className="text-xs text-foreground/80 leading-relaxed max-w-xl mx-auto font-medium">
                  Your feedback has been successfully registered. Under our strict **double-blind protocol**, this invitation link is now permanently deactivated. No record remains connecting your identity, email, or token to the responses submitted.
                </p>
              </div>

              <div className="pt-8 border-t border-border-subtle max-w-sm mx-auto space-y-4">
                <div className="p-4 bg-surface-sunken rounded-2xl border border-border-subtle text-[11px] text-muted-foreground space-y-2 text-left font-medium leading-relaxed">
                  <div className="flex gap-2 items-start">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Invitation Link deactivated immediately</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Responses logged with no relational keys or headers</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Aggregate compliance metrics compiled double-blind</span>
                  </div>
                </div>
                <p className="text-[9px] text-subtle-foreground font-black uppercase tracking-widest">
                  You can now safely close this browser window.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Context Block */}
              <div className="bg-gradient-to-br from-indigo-950/30 to-surface border border-indigo-500/10 p-6 md:p-8 rounded-3xl space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Active Evaluation Campaign</p>
                  <h2 className="text-xl font-black text-foreground uppercase leading-snug tracking-tight">{invitation.surveyTitle}</h2>
                </div>

                <div className="h-px bg-surface-tint" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-subtle-foreground font-black uppercase tracking-widest">Target Module</p>
                    <p className="text-sm font-extrabold text-foreground uppercase mt-0.5">{invitation.moduleCode}</p>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{invitation.moduleName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-subtle-foreground font-black uppercase tracking-widest">Closing Date</p>
                    <p className="text-sm font-extrabold text-rose-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-4 h-4 shrink-0" /> {invitation.expiresAt}
                    </p>
                    <p className="text-[10px] text-subtle-foreground font-bold mt-0.5">Surveys close at 23:59 UTC</p>
                  </div>
                </div>
              </div>

              {/* Anonymity Assurance Banner */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-black text-foreground uppercase tracking-wider">Zero-Trace Governance Standard</p>
                  <p className="text-muted-foreground font-semibold leading-relaxed">
                    This survey is 100% anonymous. We decouple who was invited from what was submitted. Marking this token as "used" is separate from response creation. There are no relational IDs, emails, timestamps, or tokens in the response registry.
                  </p>
                </div>
              </div>

              {/* Form questions list */}
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  {questionList.map((qText: string, idx: number) => (
                    <div key={idx} className="bg-surface border border-border-subtle rounded-3xl p-6 space-y-4 shadow hover:border-border transition-colors">
                      <div className="space-y-1">
                        <span className="text-[9px] text-subtle-foreground font-black uppercase tracking-widest">Indicator {idx + 1}</span>
                        <p className="text-xs font-bold text-foreground/90 uppercase leading-relaxed">{qText}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        {/* Interactive Stars */}
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatings({ ...ratings, [idx]: star })}
                              className="p-1 cursor-pointer transition transform hover:scale-110"
                            >
                              <Star 
                                className={cn(
                                  "w-7 h-7",
                                  star <= (ratings[idx] || 5) ? "fill-amber-400 text-amber-400" : "text-subtle-foreground/70"
                                )} 
                              />
                            </button>
                          ))}
                        </div>
                        
                        <span className="text-[10px] font-black uppercase tracking-widest text-subtle-foreground">
                          {ratings[idx] === 1 ? '1 - Strongly Disagree' :
                           ratings[idx] === 2 ? '2 - Disagree' :
                           ratings[idx] === 3 ? '3 - Neutral' :
                           ratings[idx] === 4 ? '4 - Agree' :
                           '5 - Strongly Agree'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Narrative comments */}
                <div className="bg-surface border border-border-subtle rounded-3xl p-6 space-y-3 shadow">
                  <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest">
                    Qualitative feedback (Optional comment)
                  </label>
                  <textarea
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Provide comments regarding module delivery, lecturer clarity, assessibility, or notes..."
                    className="w-full bg-surface-tint border border-border rounded-2xl p-4 text-xs font-medium text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[9px] text-subtle-foreground font-semibold leading-relaxed">
                    Tip: Do not write your name, student number, or other identifying information in your comments to preserve anonymity.
                  </p>
                </div>

                {/* Submit action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-foreground rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-98 flex items-center justify-center gap-2 border border-border h-14"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Decrypting & Transmitting Anonymously...
                    </>
                  ) : (
                    <>
                      Submit Anonymous Evaluation
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-border-subtle text-[9px] text-subtle-foreground font-bold uppercase tracking-widest">
          AegisEDU Compliance Platform • Institutional Quality Assurance Protocol
        </div>
      </div>
    </div>
  );
}
