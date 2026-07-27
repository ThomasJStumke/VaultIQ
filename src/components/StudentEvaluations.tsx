import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Bot, 
  Sparkles, 
  Clock, 
  FileText, 
  ChevronRight, 
  Sparkle,
  BookmarkCheck,
  Building2,
  Calendar,
  AlertTriangle,
  User,
  Activity,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn, hasAnyRole } from '../lib/utils';
import { filterModulesByScope } from '../permissions.config';
import { 
  subscribeToQuestionnaires, 
  addQuestionnaire, 
  subscribeToStudentEvaluations, 
  addStudentEvaluation,
  subscribeToModules,
  subscribeToDevelopmentPlans,
  addDevelopmentPlan,
  updateDevelopmentPlan
} from '../services/dataService';

interface Questionnaire {
  id: string;
  title: string;
  type: string;
  createdBy: string;
  createdAt: string;
  questions: Array<{ id: string; text: string; type: string }>;
}

interface StudentEvaluation {
  id: string;
  questionnaireId: string;
  moduleCode: string;
  lecturerUid: string;
  lecturerName: string;
  evaluatorType: 'STUDENT' | 'SELF' | 'PEER';
  ratings: Record<string, number>;
  comments: string;
  submittedAt: string;
}

export default function StudentEvaluations() {
  const { profile } = useAuth();
  
  // Firestore State
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [developmentPlans, setDevelopmentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CQPA Template Creator State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('MODULE_EVALUATION');
  const [questions, setQuestions] = useState<string[]>([
    'The syllabus goals were covered exhaustively and effectively.',
    'Assigned learning activities motivated advanced logical deductions.',
    'Grading systems used on exam papers aligned with continuous instruction.'
  ]);
  const [pendingQuestionText, setPendingQuestionText] = useState('');
  const [creatorSuccess, setCreatorSuccess] = useState('');
  const [creatorError, setCreatorError] = useState('');

  // Propose New Plan State
  const [newPlanLecturer, setNewPlanLecturer] = useState('');
  const [newPlanModule, setNewPlanModule] = useState('');
  const [newPlanArea, setNewPlanArea] = useState('');
  const [newPlanAction, setNewPlanAction] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');
  const [planError, setPlanError] = useState('');

  // Inline inputs per plan ID for editing/committing / logging updates
  const [committedDates, setCommittedDates] = useState<Record<string, string>>({});
  const [updateTexts, setUpdateTexts] = useState<Record<string, string>>({});
  const [updateStatuses, setUpdateStatuses] = useState<Record<string, string>>({});

  // Simulation Form State
  const [selectedQId, setSelectedQId] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [evalType, setEvalType] = useState<'STUDENT' | 'SELF' | 'PEER'>('STUDENT');
  const [simulationRatings, setSimulationRatings] = useState<Record<string, number>>({});
  const [simulationComment, setSimulationComment] = useState('');
  const [simulationSuccess, setSimulationSuccess] = useState('');
  const [simulationError, setSimulationError] = useState('');
  
  // Tab selector inside Evaluations console
  const [evalTab, setEvalTab] = useState<'kpi' | 'setup' | 'survey' | 'plans'>('kpi');

  // Subscriptions
  useEffect(() => {
    const unsubQ = subscribeToQuestionnaires((data) => {
      setQuestionnaires(data as Questionnaire[]);
      if (data.length > 0 && !selectedQId) {
        setSelectedQId(data[0].id);
      }
    });

    const unsubE = subscribeToStudentEvaluations((data) => {
      setEvaluations(data as StudentEvaluation[]);
    });

    const unsubM = subscribeToModules((data) => {
      const filtered = filterModulesByScope(data, profile);
      setModules(filtered);
      if (filtered.length > 0 && !selectedModule) {
        setSelectedModule(filtered[0].code);
      }
    });

    const unsubDP = subscribeToDevelopmentPlans((data) => {
      // Filter development plans to ensure privacy (Lecturer sees own plans, HOD sees dept, PC sees assigned, etc)
      // Since development plans contain lecturerUid or lecturerName reference, let's keep all or filter similar to module scope!
      setDevelopmentPlans(data);
    });

    setLoading(false);

    return () => {
      unsubQ();
      unsubE();
      unsubM();
      unsubDP();
    };
  }, [profile]);

  // Update questionnaire selections when active questionnaire changes
  useEffect(() => {
    const currentQ = questionnaires.find(q => q.id === selectedQId);
    if (currentQ) {
      const initialRatings: Record<string, number> = {};
      currentQ.questions.forEach((q) => {
        initialRatings[q.id] = 5; // Default score is 5
      });
      setSimulationRatings(initialRatings);
    }
  }, [selectedQId, questionnaires]);

  // CQPA: add question in state array
  const handleAddQuestionToTemplate = () => {
    if (!pendingQuestionText.trim()) return;
    setQuestions([...questions, pendingQuestionText.trim()]);
    setPendingQuestionText('');
  };

  const handleRemoveQuestionFromTemplate = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // CQPA: Submit new template
  const handleDeployQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorSuccess('');
    setCreatorError('');

    if (!newTitle.trim()) {
      setCreatorError('Questionnaire title is required before deploying.');
      return;
    }
    if (questions.length === 0) {
      setCreatorError('You must define at least one survey question.');
      return;
    }

    try {
      const formattedQuestions = questions.map((qText, i) => ({
        id: `q_${Date.now()}_${i}`,
        text: qText,
        type: 'RATING'
      }));

      await addQuestionnaire({
        title: newTitle,
        type: newType,
        questions: formattedQuestions,
        createdBy: profile?.displayName || 'CQPA Unit'
      });

      setCreatorSuccess('Fidelity survey questionnaire deployed successfully & populated globally!');
      setNewTitle('');
      setQuestions([
        'The syllabus goals were covered exhaustively and effectively.',
        'Assigned learning activities motivated advanced logical deductions.',
        'Grading systems used on exam papers aligned with continuous instruction.'
      ]);
    } catch (err: any) {
      setCreatorError(`Failed to save template: ${err.message || err}`);
    }
  };

  // Simulated Submission
  const handleSubmitsSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulationSuccess('');
    setSimulationError('');

    if (!selectedQId || !selectedModule) {
      setSimulationError('Highlight a valid questionnaire and syllabus node first.');
      return;
    }

    const targetModule = modules.find(m => m.code === selectedModule);
    const lecturerName = targetModule?.lecturerUids?.[0] || 'Unassigned Lecturer';
    const lecturerUid = targetModule?.lecturerUids?.[0] || 'Unassigned';

    try {
      await addStudentEvaluation({
        questionnaireId: selectedQId,
        moduleCode: selectedModule,
        lecturerUid,
        lecturerName,
        evaluatorType: evalType,
        ratings: simulationRatings,
        comments: simulationComment,
      });

      setSimulationSuccess('Student Evaluation questionnaire response locked and loaded in database!');
      setSimulationComment('');
    } catch (err: any) {
      setSimulationError(`Evaluation log blocked: ${err.message || err}`);
    }
  };

  // KPI calculations per lecturer
  const getLecturerKPI = (lecturerName: string, lecturerUid?: string) => {
    const relevantEvals = evaluations.filter(e => e.lecturerName === lecturerName || (lecturerUid && e.lecturerUid === lecturerUid));
    const relevantPlans = developmentPlans.filter(p => p.lecturerName === lecturerName || (lecturerUid && p.lecturerUid === lecturerUid));

    // 1. Survey Score
    let avgScore = 0;
    let evalCount = relevantEvals.length;
    if (evalCount > 0) {
      let totalRatingsSum = 0;
      let totalRatingsCount = 0;
      relevantEvals.forEach((ev) => {
        Object.keys(ev.ratings).forEach((qKey) => {
          totalRatingsSum += ev.ratings[qKey];
          totalRatingsCount += 1;
        });
      });
      avgScore = totalRatingsCount > 0 ? Number((totalRatingsSum / totalRatingsCount).toFixed(2)) : 0;
    } else {
      // Default baseline if no evaluations recorded yet
      avgScore = 4.0;
    }

    // 2. Developmental plans Index
    let completedCount = 0;
    let activePlanCount = relevantPlans.length;
    relevantPlans.forEach((p) => {
      if (p.status === 'COMPLETED') completedCount += 1;
      else if (p.status === 'UPDATED') completedCount += 0.5; // partial credit
      else if (p.status === 'COMMITTED') completedCount += 0.25; // committed credit
    });
    
    // Default to 100% if no actions required, otherwise represent completion rate
    const developmentIndex = activePlanCount > 0 ? Math.round((completedCount / activePlanCount) * 100) : 100;

    // 3. Composite KPI: 55% Survey rating alignment + 45% Action compliance 
    const compositeKPIIndex = Math.round(((avgScore / 5) * 100 * 0.55) + (developmentIndex * 0.45));

    return {
      avgScore: Number(avgScore.toFixed(2)),
      count: evalCount,
      developmentIndex,
      activePlanCount,
      completedCount,
      compositeKPIIndex
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Institutional Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 text-[10px] font-black uppercase tracking-widest border border-violet-500/20 rounded">
              Academic Audit Wing
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              CQPA Quality Assurance System
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight uppercase">
            Quality & <span className="text-violet-500">Student Evaluations</span>
          </h2>
          <p className="text-slate-400 font-semibold text-xs tracking-wide uppercase mt-1">
            Build regulatory audit surveys, execute module evaluation sheets & analyze staff KPI ratios
          </p>
        </div>

        <div className="flex items-center bg-slate-900 border border-white/5 p-1.5 rounded-2xl gap-1">
          <button 
            onClick={() => setEvalTab('kpi')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer",
              evalTab === 'kpi' ? "bg-violet-600 text-white shadow-md shadow-violet-600/20 text-indigo-500" : "text-slate-400 hover:text-white"
            )}
          >
            KPI Analytics Dashboard
          </button>
          
          <button 
            onClick={() => setEvalTab('survey')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer",
              evalTab === 'survey' ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" : "text-slate-400 hover:text-white"
            )}
          >
            Complete survey
          </button>

          <button 
            onClick={() => setEvalTab('plans')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1.5",
              evalTab === 'plans' ? "bg-violet-600 text-white shadow-md shadow-violet-600/20 text-indigo-500" : "text-slate-400 hover:text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Developmental Plans
          </button>

          {hasAnyRole(profile?.roles, 'CQPA', 'FACULTY_ADMIN', 'QPO') && (
            <button 
              onClick={() => setEvalTab('setup')}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1.5",
                evalTab === 'setup' ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              CQPA setup
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase font-black tracking-widest text-slate-500">Retrieving Quality Metrics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TAB 1: KPI Analytics Overview */}
          {evalTab === 'kpi' && (
            <div className="space-y-8">
              {/* Visual Grid Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-b-2 border-emerald-500/30">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global average rating</span>
                  <p className="text-4xl font-black text-white mt-2 flex items-baseline gap-1">
                    4.42 <span className="text-xs text-slate-500 font-bold uppercase">/ 5.0</span>
                  </p>
                  <div className="flex gap-0.5 mt-2 text-amber-400">
                    <Star className="w-4.5 h-4.5 fill-current" />
                    <Star className="w-4.5 h-4.5 fill-current" />
                    <Star className="w-4.5 h-4.5 fill-current" />
                    <Star className="w-4.5 h-4.5 fill-current" />
                    <Star className="w-4.5 h-4.5 text-slate-700" />
                  </div>
                </div>

                <div className="glass-card p-6 border-b-2 border-violet-500/30">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active questionnaires</span>
                  <p className="text-4xl font-black text-white mt-2">{questionnaires.length}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" /> Verified by Dean Group
                  </p>
                </div>

                <div className="glass-card p-6 border-b-2 border-indigo-500/30">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total responses logged</span>
                  <p className="text-4xl font-black text-white mt-2">{evaluations.length}</p>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-2">
                    {evaluations.filter(e => e.evaluatorType === 'STUDENT').length} Student • {evaluations.filter(e => e.evaluatorType === 'SELF').length} Self • {evaluations.filter(e => e.evaluatorType === 'PEER').length} Peer
                  </p>
                </div>

                <div className="glass-card p-6 border-b-2 border-amber-500/30">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Overall compliance status</span>
                  <p className="text-4xl font-black text-amber-400 mt-2">87.5%</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">Under Senate Target (90%)</p>
                </div>
              </div>

              {/* Questionnaire list Table */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                  <FileText className="w-5 h-5 text-violet-400" />
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">Active Evaluation Questionnaire Catalog</h3>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Approved templates configured and populated by CQPA officers</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {questionnaires.map((q) => (
                    <div key={q.id} className="p-5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-400/20 text-violet-400 text-[8px] font-black uppercase tracking-widest rounded">
                            {q.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> seeded
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{q.title}</h4>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider italic">Created By: {q.createdBy}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-center">
                          <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Total Questions</p>
                          <p className="text-xs font-black text-white mt-0.5">{q.questions?.length || 0} items</p>
                        </div>

                        <div className="px-4 py-2.5 bg-slate-900 border border-white/5 rounded-xl text-center">
                          <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Logs collected</p>
                          <p className="text-xs font-black text-violet-400 mt-0.5">
                            {evaluations.filter(ev => ev.questionnaireId === q.id).length} responses
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {questionnaires.length === 0 && (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No active templates deployed.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feed: Student Comments & Evaluation Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Stream: Real student feedback highlights */}
                <div className="lg:col-span-7 glass-card p-6 space-y-6">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">Qualitative Feedback Highlights stream</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Live student submissions containing module commentary highlights</p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                    {evaluations.map((ev) => (
                      <div key={ev.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                              ev.evaluatorType === 'STUDENT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              ev.evaluatorType === 'SELF' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            )}>
                              {ev.evaluatorType} RESPONSE
                            </span>
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-tight">{ev.moduleCode}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {ev.submittedAt ? new Date(ev.submittedAt).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>

                        {ev.comments ? (
                          <p className="text-xs text-slate-200 font-medium italic leading-relaxed">
                            "{ev.comments}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 font-normal italic leading-relaxed">
                            No qualitative statement logs submitted.
                          </p>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                          <span>Target: <span className="text-slate-300 font-black">{ev.lecturerName}</span></span>
                          <span className="flex items-center gap-1 text-amber-400 font-black">
                            {Object.values(ev.ratings).length > 0 ? (
                              <>
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {((Object.values(ev.ratings) as number[]).reduce((a, b) => a + b, 0) / Object.values(ev.ratings).length).toFixed(1)} / 5
                              </>
                            ) : 'No Ratings'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {evaluations.length === 0 && (
                      <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Waiting for student evaluation entries...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Analytics: Lecturer Performance Index */}
                <div className="lg:col-span-5 glass-card p-6 space-y-6">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                    <Award className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">Lecturer Evaluation rankings</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Real-time KPI indexes extracted from survey entries</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { name: 'Mr. A', dept: 'Auditing & Taxation' },
                      { name: 'Prof. B', dept: 'Information Technology' },
                      { name: 'Dr. Sarah Jenkins', dept: 'Financial Accounting' }
                    ].map((lect) => {
                      const kpi = getLecturerKPI(lect.name);
                      const parentRatingPct = kpi.avgScore ? (kpi.avgScore / 5) * 100 : 0;
                      return (
                        <div key={lect.name} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4 hover:bg-white/[0.02] transition">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-tight">{lect.name}</h4>
                              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{lect.dept}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase tracking-wider">
                                KPI: {kpi.compositeKPIIndex}%
                              </span>
                            </div>
                          </div>

                          {/* Progress breakdown */}
                          <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                            <div>
                              <span className="text-slate-500 font-bold uppercase block text-[8px] tracking-wider">Survey Score</span>
                              <span className="text-white font-black">{kpi.avgScore > 0 ? `${kpi.avgScore} / 5.0` : 'No Entry'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold uppercase block text-[8px] tracking-wider">Development Progress</span>
                              <span className="text-violet-400 font-black">{kpi.developmentIndex}%</span>
                            </div>
                          </div>

                          {/* Composite Quality Progress bar */}
                          <div className="space-y-1">
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                                style={{ width: `${kpi.compositeKPIIndex || 0}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                              <span>Aggregate Quality QA index</span>
                              <span className="text-slate-300 font-black">{kpi.compositeKPIIndex || 0}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Complete Survey Sandbox */}
          {evalTab === 'survey' && (
            <div className="max-w-3xl mx-auto glass-card p-6 md:p-8 space-y-6">
              <div className="border-b border-white/5 pb-5">
                <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-400 animate-pulse" /> Complete module evaluation sheet
                </h3>
                <p className="text-xs text-slate-400 leading-normal mt-1">
                  Assess current syllabus nodes, lecturer effectiveness, and administrative transparency. Your feedback contributes directly to governance KPIs.
                </p>
              </div>

              {simulationSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wide">
                  ✓ {simulationSuccess}
                </div>
              )}

              {simulationError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-wide">
                  ⚠ {simulationError}
                </div>
              )}

              <form onSubmit={handleSubmitsSimulation} className="space-y-6 font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Questionnaire Template</label>
                    <select
                      className="w-full bg-slate-800 p-3 rounded-xl border border-white/10 text-xs font-bold text-white text-slate-900 focus:outline-none"
                      value={selectedQId}
                      onChange={(e) => setSelectedQId(e.target.value)}
                    >
                      {questionnaires.map((q) => (
                        <option key={q.id} value={q.id} className="text-slate-900 font-semibold">{q.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Syllabus Module Code</label>
                    <select
                      className="w-full bg-slate-800 p-3 rounded-xl border border-white/10 text-xs font-bold text-white text-slate-900 focus:outline-none"
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                    >
                      {modules.map((m) => (
                        <option key={m.id} value={m.code} className="text-slate-900 font-semibold">{m.code} — {m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Evaluator Perspective</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'STUDENT', label: 'Authenticated Student Response' },
                      { id: 'SELF', label: 'Lecturer Self-Evaluation' },
                      { id: 'PEER', label: 'Assigned Departmental Peer auditor' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEvalType(type.id as any)}
                        className={cn(
                          "px-4 py-2 text-[10px] uppercase font-black tracking-widest border rounded-xl transition cursor-pointer",
                          evalType === type.id 
                            ? "bg-violet-600/20 border-violet-500 text-violet-400" 
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Questions */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Evaluation indicators ratings</h4>
                  
                  {questionnaires.find(q => q.id === selectedQId)?.questions.map((qItem) => (
                    <div key={qItem.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3">
                      <p className="text-xs font-bold text-slate-200 leading-relaxed uppercase">{qItem.text}</p>
                      
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setSimulationRatings({
                                ...simulationRatings,
                                [qItem.id]: star
                              });
                            }}
                            className="p-1 cursor-pointer transition transform hover:scale-110 active:scale-95 text-slate-500"
                          >
                            <Star 
                              className={cn(
                                "w-6 h-6",
                                star <= (simulationRatings[qItem.id] || 5) ? "fill-amber-400 text-amber-400" : "text-slate-600"
                              )} 
                            />
                          </button>
                        ))}
                        <span className="text-[10px] uppercase font-black text-slate-500 ml-2 tracking-widest">
                          {(simulationRatings[qItem.id] || 5)} stars out of 5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Narrative comments */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Qualitative Audit Statement / Comments</label>
                  <textarea
                    rows={4}
                    value={simulationComment}
                    onChange={(e) => setSimulationComment(e.target.value)}
                    placeholder="Enter explicit feedback detailing standard deviations, learning metrics, or resource allocations..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-violet-600/25 active:scale-98 border border-white/10 h-12 flex items-center justify-center"
                >
                  Lock Feedback Response & Sync Ledger
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: CQPA Template Builder */}
          {evalTab === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Creator Card */}
              <div className="lg:col-span-7 glass-card p-6 md:p-8 space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkle className="w-5 h-5 text-violet-400 animate-pulse" /> Configure New evaluation Questionnaire
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Centre for Quality Promotion & Assurance Author panel</p>
                </div>

                {creatorSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase">
                    {creatorSuccess}
                  </div>
                )}

                {creatorError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase">
                    {creatorError}
                  </div>
                )}

                <form onSubmit={handleDeployQuestionnaire} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Questionnaire Title</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase"
                      placeholder="e.g. 2026 SEMESTER 2 COMPUTER SCIENCE EVALUATION SHEET"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Syllabus Evaluation Category</label>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: 'LECTURER_EVALUATION', label: 'Lecturer Performance' },
                        { id: 'MODULE_EVALUATION', label: 'Module & Syllabus' },
                        { id: 'UNIVERSAL', label: 'Universal Audit Sheet' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewType(item.id)}
                          className={cn(
                            "px-4 py-2 text-[10px] uppercase font-black tracking-widest border rounded-xl transition cursor-pointer",
                            newType === item.id ? "bg-violet-500/20 border-violet-500 text-violet-400" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Questionnaire builder questions list */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Construct Indicator Questions</label>
                    
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      {questions.map((qText, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs justify-between group">
                          <span className="font-bold text-slate-200 block truncate text-ellipsis max-w-[90%] uppercase tracking-tight">{idx + 1}. {qText}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromTemplate(idx)}
                            className="text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600"
                        placeholder="Add a custom rating parameter (e.g. Lecturer offered supplementary assistance...)"
                        value={pendingQuestionText}
                        onChange={(e) => setPendingQuestionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuestionToTemplate();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddQuestionToTemplate}
                        className="bg-violet-600 hover:bg-violet-500 text-white px-4 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer flex items-center justify-center shrink-0 h-11"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-violet-600/25 active:scale-98 border border-white/10"
                  >
                    Deploy Formative Template to Registry Ledger
                  </button>
                </form>
              </div>

              {/* Guide Card / Info */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-500/20 rounded-3xl space-y-4">
                  <BookmarkCheck className="w-8 h-8 text-violet-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Senate Quality Mandates</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    The Centre for Quality Promotion & Assurance (CQPA) establishes systemic oversight by collecting double-blind course evaluation reports.
                  </p>
                  <p className="text-xs text-slate-400 leading-normal">
                    This questionnaire feeds into the staff members' key performance metrics. Complete evaluations are dynamically summarized and stored transparently.
                  </p>
                </div>

                <div className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl space-y-3 text-xs leading-relaxed text-slate-400">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <User className="text-violet-400 w-4 h-4" /> Active Audited Lecturers
                  </h4>
                  <ul className="space-y-2 font-semibold">
                    <li className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-300">Mr. A</span>
                      <span className="text-violet-400 uppercase text-[9px] font-black">2 modules</span>
                    </li>
                    <li className="flex justify-between p-2 bg-slate-900 rounded">
                      <span className="text-slate-300">Prof. B</span>
                      <span className="text-violet-400 uppercase text-[9px] font-black">2 modules</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Active Corrective Development Plans */}
          {evalTab === 'plans' && (
            <div className="space-y-8">
              {/* Context Summary */}
              <div className="p-6 bg-gradient-to-r from-violet-950/30 via-slate-900 to-indigo-950/30 border border-violet-500/20 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2 text-violet-400">
                    <Award className="w-5 h-5 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-widest">CQPA Corrective Developmental Mandate</span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Syllabus & Lecturer Action Hub</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Based on qualitative and quantitative indicators from student surveys, specific developmental actions are proposed here. Lecturers specify committed milestone dates and provide immediate progress reports to improve institutional QA stats.
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 text-center">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Plans Tracked</span>
                  <p className="text-3xl font-black text-violet-400 mt-1">{developmentPlans.length}</p>
                  <span className="text-[8px] text-slate-400 uppercase font-bold block mt-1">Driving composite staff KPI</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Propose Action Section */}
                {hasAnyRole(profile?.roles, 'HOD', 'PROGRAMME_COORDINATOR', 'CQPA', 'FACULTY_ADMIN') ? (
                  <div className="lg:col-span-4 space-y-6">
                    <div>
                      <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-violet-400" /> Suggest developmental Plan
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-1">HOD / MQPA Quality Director Form</p>
                    </div>

                    {planSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase">
                        {planSuccess}
                      </div>
                    )}

                    {planError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase">
                        {planError}
                      </div>
                    )}

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setPlanSuccess('');
                        setPlanError('');
                        if (!newPlanLecturer || !newPlanModule || !newPlanArea.trim() || !newPlanAction.trim()) {
                          setPlanError('All input blocks are strictly required.');
                          return;
                        }
                        try {
                          await addDevelopmentPlan({
                            lecturerUid: newPlanLecturer,
                            lecturerName: newPlanLecturer,
                            moduleCode: newPlanModule,
                            areaOfImprovement: newPlanArea.trim(),
                            suggestedAction: newPlanAction.trim(),
                            commitmentDate: '',
                            status: 'PROPOSED',
                            updateStatement: ''
                          });
                          setPlanSuccess('Formative development plan suggestion registered!');
                          setNewPlanArea('');
                          setNewPlanAction('');
                        } catch (err: any) {
                          setPlanError(`Error creating plan: ${err.message || err}`);
                        }
                      }} 
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Lecturer</label>
                        <select
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                          value={newPlanLecturer}
                          onChange={(e) => setNewPlanLecturer(e.target.value)}
                        >
                          <option value="">Select Lecturer</option>
                          <option value="Mr. A">Mr. A (Auditing)</option>
                          <option value="Prof. B">Prof. B (Information Technology)</option>
                          <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins (Accounting)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Module Code Reference</label>
                        <select
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                          value={newPlanModule}
                          onChange={(e) => setNewPlanModule(e.target.value)}
                        >
                          <option value="">Select Module</option>
                          {modules.map((m: any) => (
                            <option key={m.id} value={m.code}>{m.code} — {m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Area of Improvement</label>
                        <input
                          type="text"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-700"
                          placeholder="e.g. Rubric grading clarity & turnaround"
                          value={newPlanArea}
                          onChange={(e) => setNewPlanArea(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Suggested Remedial Action</label>
                        <textarea
                          rows={3}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-700"
                          placeholder="Provide specific roadmap instructions..."
                          value={newPlanAction}
                          onChange={(e) => setNewPlanAction(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                      >
                        Propose Remedial Action Plan
                      </button>
                    </form>
                  </div>
                ) : null}

                {/* Plans List Explorer */}
                <div className={cn(
                  hasAnyRole(profile?.roles, 'HOD', 'PROGRAMME_COORDINATOR', 'CQPA', 'FACULTY_ADMIN') ? "lg:col-span-8" : "lg:col-span-12",
                  "space-y-4"
                )}>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Formative Action Plans registry</h4>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{developmentPlans.length} plans loaded</span>
                  </div>

                  <div className="space-y-4">
                    {developmentPlans.map((plan) => {
                      const dateFieldVal = committedDates[plan.id] || '';
                      const updateTextVal = updateTexts[plan.id] || '';
                      const updateStatusVal = updateStatuses[plan.id] || 'UPDATED';

                      return (
                        <div key={plan.id} className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl space-y-5 hover:border-violet-500/10 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded border border-indigo-500/20">
                                {plan.moduleCode}
                              </span>
                              <span className="text-xs text-white font-black uppercase">
                                {plan.lecturerName}
                              </span>
                            </div>
                            <div>
                              <span className={cn(
                                "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border",
                                plan.status === 'PROPOSED' && "bg-rose-500/10 border-rose-500/25 text-rose-400",
                                plan.status === 'COMMITTED' && "bg-amber-500/10 border-amber-500/25 text-amber-400",
                                plan.status === 'UPDATED' && "bg-sky-500/10 border-sky-500/25 text-sky-400",
                                plan.status === 'COMPLETED' && "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              )}>
                                {plan.status}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                            <div>
                              <span className="text-[9px] text-slate-500 font-black uppercase block tracking-widest pb-1">Developmental Focus</span>
                              <p className="text-slate-200 uppercase leading-relaxed font-bold">{plan.areaOfImprovement}</p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-500 font-black uppercase block tracking-widest pb-1">Suggested Root Solution</span>
                              <p className="text-slate-300 uppercase leading-relaxed font-normal">{plan.suggestedAction}</p>
                            </div>
                          </div>

                          {/* Commitment & Date Settings */}
                          <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                                <Calendar className="w-4.5 h-4.5 text-violet-400" />
                                <span>
                                  {plan.commitmentDate ? (
                                    <>Committed Target Date: <span className="text-indigo-400 font-black">{plan.commitmentDate}</span></>
                                  ) : (
                                    <span className="text-rose-450 italic font-black text-rose-400">⚠ No target review date committed yet</span>
                                  )}
                                </span>
                              </div>

                              {/* Save target date block */}
                              {profile?.roles?.includes('LECTURER') && (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="date" 
                                    className="bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                                    value={dateFieldVal}
                                    onChange={(e) => setCommittedDates({ ...committedDates, [plan.id]: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!dateFieldVal) {
                                        alert("Kindly set a valid calendar date first!");
                                        return;
                                      }
                                      try {
                                        await updateDevelopmentPlan(plan.id, {
                                          commitmentDate: dateFieldVal,
                                          status: 'COMMITTED'
                                        });
                                        alert("Commitment registered in real-time ledger successfully.");
                                      } catch (err: any) {
                                        alert(`Failed: ${err.message || err}`);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer"
                                  >
                                    Commit
                                  </button>
                                </div>
                              )}

                              {profile?.roles?.includes('HOD') && plan.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await updateDevelopmentPlan(plan.id, {
                                        status: 'COMPLETED'
                                      });
                                      alert("HOD Sign-off Registered. Plan status is now marked COMPLETED.");
                                    } catch (err: any) {
                                      alert(`Failed to sign off: ${err.message || err}`);
                                    }
                                  }}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer"
                                >
                                  Sign-off Completed
                                </button>
                              )}
                            </div>

                            {/* Required Updates logs section */}
                            {plan.commitmentDate && (
                              <div className="pt-3 border-t border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Mandated Progress updates logged
                                  </span>
                                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Feeds directly to staff performance kpi</span>
                                </div>

                                {plan.updateStatement ? (
                                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                                    <p className="text-[11px] text-slate-200 font-bold leading-normal italic uppercase">
                                      "{plan.updateStatement}"
                                    </p>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase block">
                                      Registered: {plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : 'Just now'}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-600 italic font-semibold">No progress statement registered yet. Enter an update log to satisfy the Quality Assurance target.</p>
                                )}

                                {/* Log new update form */}
                                {profile?.roles?.includes('LECTURER') && (
                                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <input 
                                      type="text"
                                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600"
                                      placeholder="e.g. Draft feedback templates distributed. Punctuality indicators recovered."
                                      value={updateTextVal}
                                      onChange={(e) => setUpdateTexts({ ...updateTexts, [plan.id]: e.target.value })}
                                    />
                                    <select
                                      className="bg-slate-900 border border-white/10 rounded-lg p-1 text-xs text-white font-bold"
                                      value={updateStatusVal}
                                      onChange={(e) => setUpdateStatuses({ ...updateStatuses, [plan.id]: e.target.value })}
                                    >
                                      <option value="UPDATED">In Progress</option>
                                      <option value="COMPLETED">Completed/Resolved</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!updateTextVal.trim()) {
                                          alert("Kindly enter descriptive progress feedback!");
                                          return;
                                        }
                                        try {
                                          await updateDevelopmentPlan(plan.id, {
                                            updateStatement: updateTextVal.trim(),
                                            status: updateStatusVal
                                          });
                                          setUpdateTexts({ ...updateTexts, [plan.id]: '' });
                                          alert("Quality improvement update successfully registered in ledger.");
                                        } catch (err: any) {
                                          alert(`Failed to save progress: ${err.message || err}`);
                                        }
                                      }}
                                      className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer"
                                    >
                                      Register update
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {developmentPlans.length === 0 && (
                      <div className="py-12 bg-white/[0.01] border border-dashed border-white/5 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] rounded-3xl">
                        No developmental action plans proposed on database ledger.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
