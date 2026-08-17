import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Square, 
  BarChart3, 
  Users, 
  Check, 
  Calendar, 
  Building2, 
  BookOpen, 
  Layers,
  Sparkles,
  ArrowRight,
  Star,
  Activity,
  Mail,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronLeft,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Edit2,
  Save,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { 
  subscribeToSurveys, 
  addSurvey, 
  updateSurvey, 
  subscribeToSurveyResponses, 
  addSurveyResponse, 
  subscribeToModules, 
  addStudentEvaluation,
  subscribeToQuestionnaires,
  getStudentListsOnce,
  createSurveyInvitations,
  subscribeToSurveyInvitations,
  addDevelopmentPlan,
  subscribeToQuestionBank,
  addQuestionBankQuestion,
  updateQuestionBankQuestion,
  deleteQuestionBankQuestion
} from '../services/supabaseService';
import PublicSurveyResponse from './PublicSurveyResponse';

// Constants replicating the institutional structures
const DEPARTMENTS = [
  { id: 'FAI_AUD_TAX', facultyId: 'FAI', name: 'Auditing and Taxation', code: 'AUD_TAX' },
  { id: 'FAI_MGT_ACC', facultyId: 'FAI', name: 'Management Accounting', code: 'MGT_ACC' },
  { id: 'FAI_FIN_ACC', facultyId: 'FAI', name: 'Financial Accounting', code: 'FIN_ACC' },
  { id: 'FAI_IT', facultyId: 'FAI', name: 'Information Technology', code: 'INF_TECH' },
  { id: 'FAI_IS', facultyId: 'FAI', name: 'Information Systems', code: 'INF_SYS' },
  { id: 'FAI_ICM', facultyId: 'FAI', name: 'Information Communications Management', code: 'INF_ICM' },
  { id: 'CS', facultyId: 'FAS', name: 'Computer Science', code: 'CS' },
  { id: 'IT', facultyId: 'FAS', name: 'Information Technology (FAS)', code: 'IT' },
  { id: 'SOC', facultyId: 'FAS', name: 'Sociology', code: 'SOC' },
  { id: 'CIV', facultyId: 'FEBE', name: 'Civil Engineering', code: 'CIV' },
  { id: 'ELE', facultyId: 'FEBE', name: 'Electrical Engineering', code: 'ELE' },
  { id: 'MEC', facultyId: 'FEBE', name: 'Mechanical Engineering', code: 'MEC' },
  { id: 'ACCT', facultyId: 'FAS', name: 'Accounting', code: 'ACCT' },
  { id: 'MGT', facultyId: 'FAS', name: 'Management', code: 'MGT' },
  { id: 'MATH', facultyId: 'FAS', name: 'Mathematics', code: 'MATH' },
];

const OFFICIAL_PROGRAMMES = [
  { code: 'DIP_AUD', name: 'Diploma in Auditing', departmentId: 'FAI_AUD_TAX' },
  { code: 'DIP_TAX', name: 'Diploma in Taxation', departmentId: 'FAI_AUD_TAX' },
  { code: 'DIP_MACC', name: 'Diploma in Management Accounting', departmentId: 'FAI_MGT_ACC' },
  { code: 'DIP_FACC', name: 'Diploma in Financial Accounting', departmentId: 'FAI_FIN_ACC' },
  { code: 'DIP_IT', name: 'Diploma in Information Technology', departmentId: 'FAI_IT' },
  { code: 'DIP_IS', name: 'Diploma in Information Systems', departmentId: 'FAI_IS' },
  { code: 'DIP_ICM', name: 'Diploma in Information Communications Management', departmentId: 'FAI_ICM' },
  { code: 'BSC_CS', name: 'Bachelor of Science in Computer Science', departmentId: 'CS' },
  { code: 'DIP_CIV', name: 'Diploma in Civil Engineering', departmentId: 'CIV' },
  { code: 'DIP_ELE', name: 'Diploma in Electrical Engineering', departmentId: 'ELE' },
  { code: 'DIP_MEC', name: 'Diploma in Mechanical Engineering', departmentId: 'MEC' },
  { code: 'DIP_ACCT', name: 'Diploma in Accountancy', departmentId: 'ACCT' },
  { code: 'DIP_MGT', name: 'Diploma in Management', departmentId: 'MGT' },
  { code: 'DIP_MATH', name: 'Diploma in Mathematics', departmentId: 'MATH' },
];

// Standard evaluation questions (Master Template)
const STANDARD_QUESTIONS = [
  "Lecturer starts lectures on time and displays professional punctuality",
  "Module outcomes and materials are clearly articulated and aligned with higher education standards",
  "Assessments are graded with constructive feedback and objective transparency",
  "Quality and relevance of the text, slides, and supplementary guidelines"
];

interface Survey {
  id: string;
  title: string;
  questionSource: 'STANDARD' | 'CUSTOM';
  questions: string[];
  targetType: 'ALL' | 'DEPARTMENTS' | 'PROGRAMMES' | 'MODULES';
  targets: string[]; // Codes or IDs of departments/programmes/modules
  openDate: string;
  closeDate: string;
  released: boolean;
  closedEarly: boolean;
  resultsSynced: boolean;
  createdBy: string;
  createdAt: any;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  moduleCode: string;
  ratings: Record<string, number>;
  comments: string;
  submittedAt: any;
}

export default function SurveyManagement({ initialQpoSubTab }: { initialQpoSubTab?: 'campaigns' | 'question_bank' } = {}) {
  const { profile } = useAuth();
  
  // States
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mode selection: QPO Console vs Student Simulation
  const [activeTab, setActiveTab] = useState<'qpo' | 'student'>('qpo');
  
  // QPO Sub Tab
  const [qpoSubTab, setQpoSubTab] = useState<'campaigns' | 'question_bank'>(initialQpoSubTab || 'campaigns');

  useEffect(() => {
    if (initialQpoSubTab) {
      setQpoSubTab(initialQpoSubTab);
    }
  }, [initialQpoSubTab]);

  // Question Bank UI states
  const [newBankText, setNewBankText] = useState('');
  const [newBankType, setNewBankType] = useState<'Rating 1-5' | 'Yes/No' | 'Open Text'>('Rating 1-5');
  const [newBankRequired, setNewBankRequired] = useState<'Yes' | 'No'>('Yes');
  const [newBankCategory, setNewBankCategory] = useState('');

  // Editing Question Bank item states
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingType, setEditingType] = useState<'Rating 1-5' | 'Yes/No' | 'Open Text'>('Rating 1-5');
  const [editingRequired, setEditingRequired] = useState<'Yes' | 'No'>('Yes');
  const [editingCategory, setEditingCategory] = useState('');

  // Excel Upload states
  const [bulkQBError, setBulkQBError] = useState('');
  const [bulkQBSuccess, setBulkQBSuccess] = useState('');
  const qbFileInputRef = useRef<HTMLInputElement>(null);
  
  // Create Survey Form States
  const [surveyTitle, setSurveyTitle] = useState('');
  const [questionSource, setQuestionSource] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  
  const [targetType, setTargetType] = useState<'ALL' | 'DEPARTMENTS' | 'PROGRAMMES' | 'MODULES'>('ALL');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  
  const [openDate, setOpenDate] = useState('');
  const [closeDate, setCloseDate] = useState('');
  
  // Feedback alerts
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  
  // Student Response Form States
  const [simulatingSurveyId, setSimulatingSurveyId] = useState('');
  const [simulatingModuleCode, setSimulatingModuleCode] = useState('');
  const [studentRatings, setStudentRatings] = useState<Record<string, number>>({});
  const [studentComment, setStudentComment] = useState('');

  // Anonymous Survey Invitations States
  const [invitations, setInvitations] = useState<any[]>([]);
  const [activeSimulationToken, setActiveSimulationToken] = useState<string | null>(null);

  // Subscriptions
  useEffect(() => {
    const unsubSurveys = subscribeToSurveys((data) => {
      setSurveys(data as Survey[]);
    });

    const unsubResponses = subscribeToSurveyResponses((data) => {
      setSurveyResponses(data as SurveyResponse[]);
    });

    const unsubModules = subscribeToModules((data) => {
      setModules(data);
    });

    const unsubQuestionnaires = subscribeToQuestionnaires((data) => {
      setQuestionnaires(data);
    });

    const unsubInvitations = subscribeToSurveyInvitations((data) => {
      setInvitations(data);
    });

    const unsubQuestionBank = subscribeToQuestionBank((data) => {
      setQuestionBank(data);
    });

    setLoading(false);

    return () => {
      unsubSurveys();
      unsubResponses();
      unsubModules();
      unsubQuestionnaires();
      unsubInvitations();
      unsubQuestionBank();
    };
  }, []);

  // Helper to determine the dynamic status of a survey
  const getSurveyStatus = (survey: Survey): 'DRAFT' | 'OPEN' | 'CLOSED' => {
    if (!survey.released) {
      return 'DRAFT';
    }
    if (survey.closedEarly) {
      return 'CLOSED';
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (today < survey.openDate) {
      return 'DRAFT'; // Or "SCHEDULED", we map scheduled to draft as a future release state or keep it in queue
    }
    if (today > survey.closeDate) {
      return 'CLOSED';
    }
    return 'OPEN';
  };

  // Target item options based on targetType
  const getTargetOptions = () => {
    switch (targetType) {
      case 'DEPARTMENTS':
        return DEPARTMENTS.map(d => ({ value: d.id, label: `${d.code} - ${d.name}` }));
      case 'PROGRAMMES':
        return OFFICIAL_PROGRAMMES.map(p => ({ value: p.code, label: `${p.code} - ${p.name}` }));
      case 'MODULES':
        return modules.map(m => ({ value: m.code, label: `${m.code} - ${m.name}` }));
      default:
        return [];
    }
  };

  // ==========================================
  // QUESTION BANK HELPER FUNCTIONS
  // ==========================================

  const handleDownloadQuestionTemplate = () => {
    const headers = ["QuestionText", "QuestionType", "Required", "Category"];
    const exampleRow = [
      "EXAMPLE - The lecturer explains complex topics clearly",
      "Rating 1-5",
      "Yes",
      "Teaching Quality"
    ];
    const data = [headers, exampleRow];
    for (let i = 0; i < 10; i++) {
      data.push(["", "", "", ""]);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Question Bank Template");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Question_Bank_Template.xlsx");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQBFileUpload = (file: File) => {
    setBulkQBError('');
    setBulkQBSuccess('');
    const reader = new FileReader();
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'xlsx' || fileType === 'xls') {
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (!jsonData || jsonData.length === 0) {
            setBulkQBError('The uploaded sheet is empty or invalid.');
            return;
          }

          let addedCount = 0;
          for (const row of jsonData) {
            const textKey = Object.keys(row).find(k => k.toLowerCase() === 'questiontext');
            const typeKey = Object.keys(row).find(k => k.toLowerCase() === 'questiontype');
            const reqKey = Object.keys(row).find(k => k.toLowerCase() === 'required');
            const catKey = Object.keys(row).find(k => k.toLowerCase() === 'category');

            const text = textKey ? String(row[textKey]).trim() : '';
            const rawType = typeKey ? String(row[typeKey]).trim() : '';
            const rawReq = reqKey ? String(row[reqKey]).trim() : '';
            const category = catKey ? String(row[catKey]).trim() : 'General';

            if (!text || text.startsWith('EXAMPLE -') || text === '') {
              continue;
            }

            let type: 'Rating 1-5' | 'Yes/No' | 'Open Text' = 'Rating 1-5';
            if (rawType.toLowerCase().includes('yes') || rawType.toLowerCase().includes('no')) {
              type = 'Yes/No';
            } else if (rawType.toLowerCase().includes('open') || rawType.toLowerCase().includes('text')) {
              type = 'Open Text';
            }

            let required: 'Yes' | 'No' = 'Yes';
            if (rawReq.toLowerCase() === 'no' || rawReq.toLowerCase() === 'n') {
              required = 'No';
            }

            await addQuestionBankQuestion({
              text,
              type,
              required,
              category,
              order: 0
            });
            addedCount++;
          }

          setBulkQBSuccess(`Successfully imported ${addedCount} questions into the central Question Bank.`);
          if (qbFileInputRef.current) qbFileInputRef.current.value = '';
        } catch (err: any) {
          setBulkQBError(`Error parsing Excel file: ${err.message || err}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setBulkQBError('Unsupported file type. Please upload a valid .xlsx template.');
    }
  };

  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankText.trim()) return;
    const categoryName = newBankCategory.trim() || 'General';
    
    const categoryQuestions = questionBank.filter(q => q.category.toLowerCase() === categoryName.toLowerCase());
    const maxOrder = categoryQuestions.reduce((max, q) => Math.max(max, q.order || 0), -1);

    try {
      await addQuestionBankQuestion({
        text: newBankText.trim(),
        type: newBankType,
        required: newBankRequired,
        category: categoryName,
        order: maxOrder + 1
      });
      setNewBankText('');
      setActionSuccess('Question successfully added to bank!');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(`Failed to add question: ${err.message || err}`);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question from the Question Bank?")) {
      return;
    }
    try {
      await deleteQuestionBankQuestion(id);
      setActionSuccess('Question deleted successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(`Failed to delete question: ${err.message || err}`);
    }
  };

  const handleStartEditing = (q: any) => {
    setEditingQuestionId(q.id);
    setEditingText(q.text);
    setEditingType(q.type || 'Rating 1-5');
    setEditingRequired(q.required || 'Yes');
    setEditingCategory(q.category || 'General');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await updateQuestionBankQuestion(id, {
        text: editingText.trim(),
        type: editingType,
        required: editingRequired,
        category: editingCategory.trim() || 'General'
      });
      setEditingQuestionId(null);
      setActionSuccess('Question updated successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(`Failed to update question: ${err.message || err}`);
    }
  };

  const handleMoveQuestion = async (question: any, direction: 'UP' | 'DOWN') => {
    const categoryQuestions = questionBank
      .filter(q => q.category === question.category)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = categoryQuestions.findIndex(q => q.id === question.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categoryQuestions.length) return;

    const otherQuestion = categoryQuestions[targetIndex];

    const currentOrder = question.order !== undefined ? question.order : currentIndex;
    const otherOrder = otherQuestion.order !== undefined ? otherQuestion.order : targetIndex;

    try {
      const newCurrentOrder = otherOrder === currentOrder ? currentOrder + (direction === 'UP' ? -1 : 1) : otherOrder;
      const newOtherOrder = currentOrder;

      await updateQuestionBankQuestion(question.id, { order: newCurrentOrder });
      await updateQuestionBankQuestion(otherQuestion.id, { order: newOtherOrder });
    } catch (err: any) {
      console.error("Failed to reorder:", err);
    }
  };

  const handleAddCustomQuestion = () => {
    if (!newCustomQuestion.trim()) return;
    setCustomQuestions([...customQuestions, newCustomQuestion.trim()]);
    setNewCustomQuestion('');
  };

  const handleRemoveCustomQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleToggleTarget = (value: string) => {
    if (selectedTargets.includes(value)) {
      setSelectedTargets(selectedTargets.filter(t => t !== value));
    } else {
      setSelectedTargets([...selectedTargets, value]);
    }
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');

    if (!surveyTitle.trim()) {
      setActionError('Survey Title is required.');
      return;
    }
    if (questionSource === 'CUSTOM' && customQuestions.length === 0) {
      setActionError('At least one custom question must be specified.');
      return;
    }
    if (targetType !== 'ALL' && selectedTargets.length === 0) {
      setActionError(`Please select at least one applicable ${targetType.toLowerCase().slice(0, -1)}.`);
      return;
    }
    if (!openDate || !closeDate) {
      setActionError('Both Opening and Closing dates are required.');
      return;
    }
    if (openDate > closeDate) {
      setActionError('Opening date cannot be later than Closing date.');
      return;
    }

    try {
      const surveyQuestions = questionSource === 'STANDARD' ? STANDARD_QUESTIONS : customQuestions;
      
      await addSurvey({
        title: surveyTitle.trim(),
        questionSource,
        questions: surveyQuestions,
        targetType,
        targets: targetType === 'ALL' ? ['ALL'] : selectedTargets,
        openDate,
        closeDate,
        released: false,
        closedEarly: false,
        resultsSynced: false,
        createdBy: profile?.displayName || 'QPO Officer'
      });

      setActionSuccess(`Survey "${surveyTitle}" created successfully as DRAFT.`);
      
      // Reset Create Form
      setSurveyTitle('');
      setQuestionSource('STANDARD');
      setCustomQuestions([]);
      setSelectedTargets([]);
      setTargetType('ALL');
      setOpenDate('');
      setCloseDate('');
    } catch (err: any) {
      setActionError(`Failed to save survey: ${err.message || err}`);
    }
  };

  const handleReleaseSurvey = async (surveyId: string) => {
    setActionSuccess('');
    setActionError('');
    try {
      const survey = surveys.find(s => s.id === surveyId);
      if (!survey) {
        setActionError('Survey not found in local cache.');
        return;
      }

      // 1. Mark survey as released
      await updateSurvey(surveyId, { released: true });

      // 2. Fetch all student lists
      const studentLists = await getStudentListsOnce();

      // 3. Find targeted modules for this survey
      const targetModules = getModulesForSurvey(survey);

      // 4. Generate invitations
      const invitationsToCreate: any[] = [];
      let totalStudentsCount = 0;

      for (const module of targetModules) {
        // Find if this module has an uploaded student list
        const mList = studentLists.find((list: any) => list.moduleId === module.id || list.moduleCode === module.code);
        if (mList && mList.students && Array.isArray(mList.students)) {
          for (const student of mList.students) {
            // Generate a secure unique token
            const secureToken = Math.random().toString(36).substring(2, 15) + 
                                Math.random().toString(36).substring(2, 15) + 
                                Date.now().toString(36);
            
            invitationsToCreate.push({
              token: secureToken,
              surveyId: survey.id,
              surveyTitle: survey.title,
              moduleId: module.id,
              moduleCode: module.code,
              moduleName: module.name,
              studentEmail: student.email,
              studentName: student.name,
              expiresAt: survey.closeDate, // closeDate ISO string (YYYY-MM-DD)
              questions: survey.questions
            });
            totalStudentsCount++;
          }
        }
      }

      if (invitationsToCreate.length > 0) {
        await createSurveyInvitations(invitationsToCreate);
        setActionSuccess(`Survey released successfully! AegisEDU has automatically compiled recipient lists and dispatched ${totalStudentsCount} unique secure evaluation links to student email streams.`);
      } else {
        setActionSuccess('Survey released successfully! Note: No active student lists were found uploaded for the target modules, so no survey invitations could be dispatched. Upload student lists in the "My Modules" screen to automatically schedule surveys.');
      }
    } catch (err: any) {
      setActionError(`Failed to release survey: ${err.message || err}`);
    }
  };

  const handleCloseSurveyEarly = async (surveyId: string) => {
    setActionSuccess('');
    setActionError('');
    try {
      await updateSurvey(surveyId, { closedEarly: true });
      
      // Immediately trigger flow of results to student evaluation ledger
      await handleSyncResults(surveyId);
    } catch (err: any) {
      setActionError(`Failed to close survey: ${err.message || err}`);
    }
  };

  // Sync Results Flow: Converts Survey Responses to student_evaluations documents
  const handleSyncResults = async (surveyId: string) => {
    setActionSuccess('');
    setActionError('');
    
    const survey = surveys.find(s => s.id === surveyId);
    if (!survey) return;

    // Filter responses for this survey
    const responses = surveyResponses.filter(r => r.surveyId === surveyId);
    
    if (responses.length === 0) {
      await updateSurvey(surveyId, { resultsSynced: true, closedEarly: true });
      setActionSuccess(`Survey closed successfully. No responses had been logged yet, so no results were synced.`);
      return;
    }

    try {
      // Find or use a default questionnaire reference ID
      const standardQId = questionnaires[0]?.id || 'default_qpo_survey';

      // Group responses by moduleCode
      const responsesByModule: Record<string, typeof responses> = {};
      responses.forEach(r => {
        if (!responsesByModule[r.moduleCode]) {
          responsesByModule[r.moduleCode] = [];
        }
        responsesByModule[r.moduleCode].push(r);
      });

      let moduleSyncCount = 0;

      for (const [moduleCode, moduleResponses] of Object.entries(responsesByModule)) {
        // Find matching module info to resolve lecturer
        const moduleItem = modules.find(m => m.code === moduleCode);
        const lecturerName = moduleItem?.lecturerUids?.[0] || 'Unassigned Lecturer';
        const lecturerUid = moduleItem?.lecturerUids?.[0] || 'Unassigned';

        // 1. Calculate average rating per question
        const formattedRatings: Record<string, number> = {};
        survey.questions.forEach((_, idx) => {
          const ratingKey = `q${idx + 1}`;
          const ratingsForQ = moduleResponses.map(r => r.ratings[idx] !== undefined ? r.ratings[idx] : 5);
          const avgRatingForQ = ratingsForQ.reduce((sum, val) => sum + val, 0) / ratingsForQ.length;
          formattedRatings[ratingKey] = Number(avgRatingForQ.toFixed(2));
        });

        // 2. Calculate overall module score
        let totalRatingsSum = 0;
        let totalRatingsCount = 0;
        moduleResponses.forEach(r => {
          Object.values(r.ratings).forEach(val => {
            totalRatingsSum += (val as number);
            totalRatingsCount++;
          });
        });
        const overallScore = totalRatingsCount > 0 ? Number((totalRatingsSum / totalRatingsCount).toFixed(2)) : 0;

        // 3. Summarize Areas for Improvement: lowest-scoring questions + a
        // comments-review reminder if any free-text feedback was left.
        let areasForImprovement: string[] = [];
        const questionAverages = survey.questions.map((qText, idx) => {
          const ratingsForQ = moduleResponses.map(r => r.ratings[idx] !== undefined ? r.ratings[idx] : 5);
          const avg = ratingsForQ.reduce((sum, val) => sum + val, 0) / ratingsForQ.length;
          return { text: qText, avg };
        });

        const sortedQuestions = [...questionAverages].sort((a, b) => a.avg - b.avg);
        areasForImprovement = sortedQuestions
          .slice(0, 2)
          .map(q => `Enhance learning delivery and support for: "${q.text}" (Average Score: ${q.avg.toFixed(1)}/5)`);

        const commentsCount = moduleResponses.filter(r => r.comments && r.comments.trim()).length;
        if (commentsCount > 0) {
          areasForImprovement.push(`Review student focus groups regarding pacing, grading clarity, and turnaround feedback.`);
        }

        // 4. Create one SINGLE aggregate student_evaluation document for this module
        await addStudentEvaluation({
          questionnaireId: standardQId,
          moduleCode,
          lecturerUid,
          lecturerName,
          evaluatorType: 'STUDENT',
          ratings: formattedRatings,
          comments: `Evaluation processed and aggregated automatically from ${moduleResponses.length} anonymous responses. All raw comments and individual submissions have been compiled to guarantee 100% student anonymity.`,
          isAggregate: true,
          responseCount: moduleResponses.length,
          overallScore,
          areasForImprovement,
          surveyId: survey.id
        });

        // 5. Automatically pre-fill the Lecturer's Personal Development Plan for this module
        await addDevelopmentPlan({
          lecturerUid,
          lecturerName,
          moduleCode,
          areaOfImprovement: `Evaluations Overall Score: ${overallScore}/5.0\nAreas for Improvement:\n${areasForImprovement.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
          suggestedAction: 'Awaiting response and remedial action plan from lecturer.',
          commitmentDate: '',
          status: 'PROPOSED',
          updateStatement: '',
          isSystemGenerated: true
        });

        moduleSyncCount++;
      }

      // Mark survey as synced and closed
      await updateSurvey(surveyId, { resultsSynced: true, closedEarly: true });
      setActionSuccess(`Success! Closed survey responses have automatically been processed, summarized, and aggregate evaluations generated across ${moduleSyncCount} evaluated modules.`);
    } catch (err: any) {
      setActionError(`Error occurred while syncing results: ${err.message || err}`);
    }
  };

  // Student Simulation Submission
  const handleStudentSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');

    if (!simulatingSurveyId) {
      setActionError('Please select a survey to complete.');
      return;
    }
    if (!simulatingModuleCode) {
      setActionError('Please select the module you are evaluating.');
      return;
    }

    const survey = surveys.find(s => s.id === simulatingSurveyId);
    if (!survey) return;

    // Verify rating counts
    const isCompleted = survey.questions.every((_, idx) => studentRatings[idx] !== undefined);
    if (!isCompleted) {
      setActionError('Please answer all evaluation questions.');
      return;
    }

    try {
      await addSurveyResponse({
        surveyId: simulatingSurveyId,
        moduleCode: simulatingModuleCode,
        ratings: studentRatings,
        comments: studentComment.trim(),
      });

      setActionSuccess('Evaluation response submitted successfully! Thank you for your feedback.');
      
      // Reset form
      setStudentComment('');
      setStudentRatings({});
    } catch (err: any) {
      setActionError(`Failed to submit response: ${err.message || err}`);
    }
  };

  // Filters modules that belong to a survey targets definition
  const getModulesForSurvey = (survey: Survey) => {
    if (survey.targetType === 'ALL') {
      return modules;
    }
    if (survey.targetType === 'MODULES') {
      return modules.filter(m => survey.targets.includes(m.code));
    }
    if (survey.targetType === 'PROGRAMMES') {
      return modules.filter(m => {
        // Find which department/programs are mapped
        const correspondingProgs = OFFICIAL_PROGRAMMES.filter(p => survey.targets.includes(p.code));
        const allowedDepts = correspondingProgs.map(p => p.departmentId);
        return allowedDepts.includes(m.departmentId);
      });
    }
    if (survey.targetType === 'DEPARTMENTS') {
      return modules.filter(m => survey.targets.includes(m.departmentId));
    }
    return [];
  };

  // If a survey is selected for simulation, configure initial ratings
  useEffect(() => {
    if (simulatingSurveyId) {
      const survey = surveys.find(s => s.id === simulatingSurveyId);
      if (survey) {
        const defaultRatings: Record<string, number> = {};
        survey.questions.forEach((_, idx) => {
          defaultRatings[idx] = 5; // Default score of 5
        });
        setStudentRatings(defaultRatings);
        
        // Pick first available module as default
        const applicableModules = getModulesForSurvey(survey);
        if (applicableModules.length > 0) {
          setSimulatingModuleCode(applicableModules[0].code);
        } else {
          setSimulatingModuleCode('');
        }
      }
    }
  }, [simulatingSurveyId, surveys]);

  // Access Control check
  if (profile?.role !== 'QPO') {
    return (
      <div className="p-8 max-w-4xl mx-auto glass-card border border-rose-500/10 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
        <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Access Restricted</h2>
        <p className="text-muted-foreground font-semibold text-sm leading-relaxed max-w-xl mx-auto">
          The "Survey Management" console contains sensitive parameters governing the distribution and schedule of institutional questionnaires. Access is strictly limited to the Quality Promotion Officer (QPO).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 rounded">
              Governance Control Panel
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Quality Promotion & Academic Audit Unit
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight uppercase">
            Survey <span className="text-indigo-500">Management</span>
          </h2>
          <p className="text-muted-foreground font-semibold text-xs tracking-wide uppercase mt-1">
            Build and deploy student evaluation schedules, release custom campaigns & authorize ledger synchronization
          </p>
        </div>

        {/* Tab Control: QPO Console vs Student Simulation Portal */}
        <div className="flex items-center bg-surface border border-border-subtle p-1.5 rounded-2xl gap-1">
          <button 
            onClick={() => setActiveTab('qpo')}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1.5",
              activeTab === 'qpo' ? "bg-indigo-600 text-foreground shadow-md shadow-indigo-600/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            QPO Officer Panel
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('student');
              // Automatically pick first open survey for student simulation
              const openSurvey = surveys.find(s => getSurveyStatus(s) === 'OPEN');
              if (openSurvey) {
                setSimulatingSurveyId(openSurvey.id);
              }
            }}
            className={cn(
              "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1.5",
              activeTab === 'student' ? "bg-indigo-600 text-foreground shadow-md shadow-indigo-600/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Student Survey Simulator
          </button>
        </div>
      </div>

      {/* Alert logs */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wide">
          ✓ {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black uppercase tracking-wide">
          ⚠ {actionError}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs uppercase font-black tracking-widest text-subtle-foreground">Syncing Survey Frameworks...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'qpo' ? (
            <motion.div 
              key="qpo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* QPO Sub Tabs: Campaign Schedules vs Central Question Bank */}
              <div className="flex border-b border-border pb-1.5 gap-6">
                <button
                  type="button"
                  onClick={() => setQpoSubTab('campaigns')}
                  className={cn(
                    "pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer",
                    qpoSubTab === 'campaigns'
                      ? "border-indigo-500 text-foreground"
                      : "border-transparent text-subtle-foreground hover:text-foreground/80"
                  )}
                >
                  Campaign Schedules
                </button>
                <button
                  type="button"
                  onClick={() => setQpoSubTab('question_bank')}
                  className={cn(
                    "pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-1.5",
                    qpoSubTab === 'question_bank'
                      ? "border-indigo-500 text-foreground"
                      : "border-transparent text-subtle-foreground hover:text-foreground/80"
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  Central Question Bank
                </button>
              </div>

              {qpoSubTab === 'campaigns' ? (
                <div className="space-y-8">
                  {/* QPO Console Bento Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Panel 1: Create Questionnaire */}
                <div className="lg:col-span-7 glass-card p-6 md:p-8 space-y-6">
                  <div className="border-b border-border-subtle pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-400" /> Draft New Student Survey
                      </h3>
                      <p className="text-xs text-subtle-foreground font-semibold uppercase tracking-widest mt-0.5">Configure campaign questions & metrics</p>
                    </div>
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>

                  <form onSubmit={handleCreateSurvey} className="space-y-6">
                    {/* Survey Title */}
                    <div>
                      <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Survey Title / Campaign Identifier</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. 2026 SEMESTER 1 COMPREHENSIVE SCHOOL OF IT EVALUATION"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Question Source Options */}
                    <div>
                      <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-2">Question Parameters Configuration</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setQuestionSource('STANDARD')}
                          className={cn(
                            "p-3.5 border rounded-xl text-left transition cursor-pointer flex flex-col justify-between h-24",
                            questionSource === 'STANDARD' 
                              ? "bg-indigo-600/15 border-indigo-500 text-foreground" 
                              : "bg-surface-tint border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <CheckCircle2 className={cn("w-4 h-4", questionSource === 'STANDARD' ? "text-indigo-400" : "text-subtle-foreground")} />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block">Standard Template</span>
                            <span className="text-[9px] text-subtle-foreground font-bold block mt-0.5">Use universal 4-criteria CQPA layout</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuestionSource('CUSTOM')}
                          className={cn(
                            "p-3.5 border rounded-xl text-left transition cursor-pointer flex flex-col justify-between h-24",
                            questionSource === 'CUSTOM' 
                              ? "bg-indigo-600/15 border-indigo-500 text-foreground" 
                              : "bg-surface-tint border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Sparkles className={cn("w-4 h-4", questionSource === 'CUSTOM' ? "text-indigo-400" : "text-subtle-foreground")} />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block">Custom Questions</span>
                            <span className="text-[9px] text-subtle-foreground font-bold block mt-0.5">Construct ad-hoc indicators</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Custom questions construction panel with Question Bank picker */}
                    {questionSource === 'CUSTOM' && (
                      <div className="p-4 bg-surface-sunken border border-border-subtle rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          
                          {/* Left Column: Active Survey Questions */}
                          <div className="md:col-span-6 space-y-3">
                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Survey Questions ({customQuestions.length})</label>
                            
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                              {customQuestions.map((q, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-surface-sunken border border-border-subtle rounded-xl text-xs">
                                  <span className="font-bold text-foreground/80 truncate max-w-[85%]">{idx + 1}. {q}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomQuestion(idx)}
                                    className="text-subtle-foreground hover:text-rose-400 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}

                              {customQuestions.length === 0 && (
                                <p className="text-[10px] uppercase font-black text-subtle-foreground text-center py-8">
                                  No questions selected yet.<br/>Type below or pick from the bank on the right.
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Add custom question wording..."
                                value={newCustomQuestion}
                                onChange={(e) => setNewCustomQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomQuestion();
                                  }
                                }}
                                className="flex-1 bg-surface-tint border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-subtle-foreground focus:outline-none text-[11px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomQuestion}
                                className="bg-indigo-600 hover:bg-indigo-500 text-foreground px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          {/* Right Column: Pick from Question Bank */}
                          <div className="md:col-span-6 border-t md:border-t-0 md:border-l border-border-subtle pt-4 md:pt-0 md:pl-4 space-y-3">
                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pick From Question Bank</label>
                            
                            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                              {(() => {
                                const categoriesMap: Record<string, any[]> = {};
                                questionBank.forEach(q => {
                                  const cat = q.category || 'General';
                                  if (!categoriesMap[cat]) categoriesMap[cat] = [];
                                  categoriesMap[cat].push(q);
                                });

                                const sortedCategories = Object.keys(categoriesMap).sort();

                                if (sortedCategories.length === 0) {
                                  return (
                                    <p className="text-[9px] uppercase font-black text-subtle-foreground text-center py-8">
                                      Question bank is empty.<br/>Upload questions in the Question Bank tab first.
                                    </p>
                                  );
                                }

                                return sortedCategories.map(cat => {
                                  const sortedQs = [...categoriesMap[cat]].sort((a, b) => (a.order || 0) - (b.order || 0));
                                  return (
                                    <div key={cat} className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[9px] text-subtle-foreground font-bold uppercase tracking-wider bg-foreground/[0.02] px-2 py-1 rounded">
                                        <span>{cat}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const questionsToAdd = sortedQs
                                              .map(q => q.text)
                                              .filter(text => !customQuestions.includes(text));
                                            if (questionsToAdd.length > 0) {
                                              setCustomQuestions([...customQuestions, ...questionsToAdd]);
                                            }
                                          }}
                                          className="text-[8px] text-indigo-400 hover:text-indigo-300 uppercase font-black cursor-pointer"
                                        >
                                          + Add All
                                        </button>
                                      </div>

                                      <div className="space-y-1 pl-1">
                                        {sortedQs.map(q => {
                                          const isSelected = customQuestions.includes(q.text);
                                          return (
                                            <button
                                              key={q.id}
                                              type="button"
                                              onClick={() => {
                                                if (isSelected) {
                                                  setCustomQuestions(customQuestions.filter(text => text !== q.text));
                                                } else {
                                                  setCustomQuestions([...customQuestions, q.text]);
                                                }
                                              }}
                                              className={cn(
                                                "w-full text-left p-1.5 rounded text-[10px] font-semibold transition leading-normal flex items-start gap-1.5 cursor-pointer",
                                                isSelected
                                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                                                  : "bg-foreground/[0.01] text-muted-foreground hover:text-foreground border border-transparent"
                                              )}
                                            >
                                              <span className="shrink-0 font-bold">{isSelected ? '✓' : '+'}</span>
                                              <span className="truncate block flex-1">{q.text}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* Survey Targets Selector */}
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest">Target Scope Alignment</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'ALL', label: 'All Modules' },
                          { id: 'DEPARTMENTS', label: 'By Departments' },
                          { id: 'PROGRAMMES', label: 'By Programmes' },
                          { id: 'MODULES', label: 'By Modules' }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTargetType(t.id as any);
                              setSelectedTargets([]);
                            }}
                            className={cn(
                              "px-3 py-1.5 text-[9px] uppercase font-black tracking-widest rounded-lg border transition",
                              targetType === t.id 
                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                                : "bg-surface-tint border-border text-muted-foreground"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {targetType !== 'ALL' && (
                        <div className="p-4 bg-surface-sunken border border-border-subtle rounded-2xl space-y-3">
                          <span className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Select Scope Targets:</span>
                          <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar text-[10px]">
                            {getTargetOptions().map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleToggleTarget(opt.value)}
                                className={cn(
                                  "p-2 rounded-lg text-left transition truncate block",
                                  selectedTargets.includes(opt.value)
                                    ? "bg-indigo-500/20 border border-indigo-500/30 text-foreground font-bold"
                                    : "bg-surface-tint border border-transparent text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {selectedTargets.includes(opt.value) ? '✓ ' : ''}{opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Open & Close Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Opening Date</label>
                        <div className="relative">
                          <input 
                            type="date"
                            required
                            value={openDate}
                            onChange={(e) => setOpenDate(e.target.value)}
                            className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Closing Date</label>
                        <div className="relative">
                          <input 
                            type="date"
                            required
                            value={closeDate}
                            onChange={(e) => setCloseDate(e.target.value)}
                            className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action trigger button */}
                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-98 h-12 flex items-center justify-center border border-border"
                    >
                      Draft Evaluation Campaign Sheet
                    </button>
                  </form>
                </div>

                {/* Panel 2: Guidelines and stats context */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="p-6 bg-gradient-to-br from-indigo-950/40 to-surface border border-indigo-500/20 rounded-3xl space-y-4">
                    <ClipboardList className="w-8 h-8 text-indigo-400" />
                    <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Campaign Directives</h4>
                    <p className="text-xs text-foreground/80 leading-relaxed font-semibold">
                      Student evaluations must be deployed systematically to ensure objective metrics can flow transparently to lecturers and heads of department.
                    </p>
                    <div className="space-y-2 text-[11px] text-muted-foreground font-medium">
                      <div className="flex gap-2 items-start">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Releasing a survey schedules it for immediate active student evaluation responses.</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Closed surveys automatically compile responses and push standard evaluations to the respective registries.</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Closing surveys early instantly halts response reception and fires result calculations.</span>
                      </div>
                    </div>
                  </div>

                  {/* Institutional Stats Summary */}
                  <div className="glass-card p-6 space-y-4">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="text-indigo-400 w-4 h-4" /> Real-time campaign stats
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-surface-tint border border-border-subtle p-3 rounded-xl">
                        <p className="text-[8px] uppercase font-black text-subtle-foreground tracking-wider">Total Campaigns</p>
                        <p className="text-lg font-black text-foreground mt-1">{surveys.length}</p>
                      </div>

                      <div className="bg-surface-tint border border-border-subtle p-3 rounded-xl">
                        <p className="text-[8px] uppercase font-black text-subtle-foreground tracking-wider">Active open</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">
                          {surveys.filter(s => getSurveyStatus(s) === 'OPEN').length}
                        </p>
                      </div>

                      <div className="bg-surface-tint border border-border-subtle p-3 rounded-xl">
                        <p className="text-[8px] uppercase font-black text-subtle-foreground tracking-wider">Draft queue</p>
                        <p className="text-lg font-black text-foreground/80 mt-1">
                          {surveys.filter(s => getSurveyStatus(s) === 'DRAFT').length}
                        </p>
                      </div>

                      <div className="bg-surface-tint border border-border-subtle p-3 rounded-xl">
                        <p className="text-[8px] uppercase font-black text-subtle-foreground tracking-wider">Closed synced</p>
                        <p className="text-lg font-black text-indigo-400 mt-1">
                          {surveys.filter(s => getSurveyStatus(s) === 'CLOSED').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status List of all Surveys */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-base font-black text-foreground uppercase tracking-wider">Student Evaluation Survey registries</h3>
                      <p className="text-xs text-subtle-foreground font-semibold uppercase tracking-widest mt-0.5">Comprehensive audit and status tracking for all campaigns</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium text-foreground/80 border-collapse">
                    <thead>
                      <tr className="border-b border-border text-subtle-foreground text-[10px] font-black uppercase tracking-widest">
                        <th className="py-3 px-4">Campaign Title</th>
                        <th className="py-3 px-4">Target Alignment</th>
                        <th className="py-3 px-4 text-center">Timetable</th>
                        <th className="py-3 px-4 text-center">Responses</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveys.map((survey) => {
                        const status = getSurveyStatus(survey);
                        const responses = surveyResponses.filter(r => r.surveyId === survey.id);
                        
                        return (
                          <tr key={survey.id} className="border-b border-border-subtle hover:bg-foreground/[0.01] transition-all">
                            <td className="py-4 px-4 font-bold text-foreground uppercase tracking-tight max-w-[240px] truncate">
                              {survey.title}
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded inline-block">
                                  {survey.targetType}
                                </span>
                                {survey.targetType !== 'ALL' && (
                                  <p className="text-[10px] text-subtle-foreground font-semibold truncate max-w-[200px]">
                                    {survey.targets.join(', ')}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <p className="text-[10px] font-bold text-muted-foreground">{survey.openDate}</p>
                              <p className="text-[9px] text-subtle-foreground font-black tracking-wider uppercase mt-0.5">To {survey.closeDate}</p>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-3 py-1 bg-surface border border-border-subtle text-foreground/80 font-bold rounded-lg text-[11px]">
                                {responses.length} logs
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={cn(
                                "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border",
                                status === 'OPEN' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" :
                                status === 'CLOSED' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                "bg-slate-500/10 text-muted-foreground border-slate-500/20"
                              )}>
                                {status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {!survey.released && (
                                  <button
                                    onClick={() => handleReleaseSurvey(survey.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                                  >
                                    <Play className="w-3 h-3" /> Release
                                  </button>
                                )}

                                {status === 'OPEN' && (
                                  <button
                                    onClick={() => handleCloseSurveyEarly(survey.id)}
                                    className="px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-transparent text-rose-400 hover:text-foreground rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                                  >
                                    <Square className="w-3 h-3" /> Close Early
                                  </button>
                                )}

                                {status === 'CLOSED' && !survey.resultsSynced && (
                                  <button
                                    onClick={() => handleSyncResults(survey.id)}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 hover:border-transparent text-amber-400 hover:text-foreground rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                                  >
                                    <Check className="w-3 h-3" /> Sync Ledger
                                  </button>
                                )}

                                {survey.resultsSynced && (
                                  <span className="text-[10px] text-subtle-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Synced
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {surveys.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-subtle-foreground font-bold uppercase tracking-widest text-[10px]">
                            No campaigns recorded. Use the creator block above to deploy.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* Question Bank Header & Action bar with Excel Template + Bulk Upload */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT: On-screen Add Question & Excel Import */}
                    <div className="lg:col-span-6 space-y-6">
                      {/* On-screen Single Question Form */}
                      <div className="glass-card p-6 md:p-8 space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                          <h3 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-400" /> Add Single Question
                          </h3>
                          <p className="text-xs text-subtle-foreground font-semibold uppercase tracking-widest mt-0.5">Create a brand new question on screen</p>
                        </div>

                        <form onSubmit={handleAddSingleQuestion} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Question Text / Wording</label>
                            <textarea
                              required
                              rows={2}
                              placeholder="e.g. The lecturer explains complex topics clearly."
                              value={newBankText}
                              onChange={(e) => setNewBankText(e.target.value)}
                              className="w-full bg-surface-tint border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground placeholder:text-subtle-foreground focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Question Type</label>
                              <select
                                value={newBankType}
                                onChange={(e) => setNewBankType(e.target.value as any)}
                                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="Rating 1-5">Rating 1-5</option>
                                <option value="Yes/No">Yes/No</option>
                                <option value="Open Text">Open Text</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Required</label>
                              <select
                                value={newBankRequired}
                                onChange={(e) => setNewBankRequired(e.target.value as any)}
                                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                              >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-subtle-foreground uppercase tracking-widest mb-1.5">Category</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Teaching Quality, Communication, Module Content"
                              value={newBankCategory}
                              onChange={(e) => setNewBankCategory(e.target.value)}
                              className="w-full bg-surface-tint border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-foreground placeholder:text-subtle-foreground focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer active:scale-[0.98]"
                          >
                            Add to Question Bank
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* RIGHT: Bulk Upload Template & Dropzone */}
                    <div className="lg:col-span-6 space-y-6">
                      <div className="glass-card p-6 md:p-8 space-y-5">
                        <div className="border-b border-border-subtle pb-3">
                          <h3 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Upload className="w-5 h-5 text-indigo-400" /> Excel Bulk Upload
                          </h3>
                          <p className="text-xs text-subtle-foreground font-semibold uppercase tracking-widest mt-0.5">Quickly import batch questions via spreadsheet</p>
                        </div>

                        <div className="space-y-4">
                          <button
                            type="button"
                            onClick={handleDownloadQuestionTemplate}
                            className="w-full py-3 bg-surface-tint border border-border hover:border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                          >
                            <Download className="w-4 h-4" /> Download Excel Template (.xlsx)
                          </button>

                          <div 
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleQBFileUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            onClick={() => qbFileInputRef.current?.click()}
                            className="border-2 border-dashed border-border hover:border-indigo-500/30 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition p-8 rounded-2xl text-center cursor-pointer space-y-2"
                          >
                            <FileSpreadsheet className="w-8 h-8 text-subtle-foreground mx-auto" />
                            <p className="text-xs font-black uppercase tracking-wider text-foreground/80">Drag & Drop .xlsx template here</p>
                            <p className="text-[10px] text-subtle-foreground font-bold uppercase tracking-widest">or click to browse local files</p>
                            <input
                              type="file"
                              ref={qbFileInputRef}
                              accept=".xlsx"
                              className="hidden"
                              onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleQBFileUpload(e.target.files[0]);
                                  }
                              }}
                            />
                          </div>

                          {bulkQBError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] font-bold uppercase tracking-wide">
                              ⚠ {bulkQBError}
                            </div>
                          )}

                          {bulkQBSuccess && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold uppercase tracking-wide">
                              ✓ {bulkQBSuccess}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PART 2: Screen Editor Organized by Category */}
                  <div className="glass-card p-6 md:p-8 space-y-6">
                    <div className="border-b border-border-subtle pb-4">
                      <h3 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-400" /> Current Question Bank Registers
                      </h3>
                      <p className="text-xs text-subtle-foreground font-semibold uppercase tracking-widest mt-0.5">Manage, edit, reorder, and refine bank questions by category</p>
                    </div>

                    {(() => {
                      const categoriesMap: Record<string, any[]> = {};
                      questionBank.forEach(q => {
                        const cat = q.category || 'General';
                        if (!categoriesMap[cat]) {
                          categoriesMap[cat] = [];
                        }
                        categoriesMap[cat].push(q);
                      });

                      const sortedCategories = Object.keys(categoriesMap).sort();

                      if (sortedCategories.length === 0) {
                        return (
                          <div className="text-center py-12 text-subtle-foreground font-bold uppercase tracking-widest text-[11px]">
                            The Question Bank is currently empty. Use the forms above or bulk upload to begin.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-8">
                          {sortedCategories.map(cat => {
                            const sortedQuestions = [...categoriesMap[cat]].sort((a, b) => (a.order || 0) - (b.order || 0));

                            return (
                              <div key={cat} className="space-y-3 bg-surface-sunken p-4 md:p-6 rounded-2xl border border-border-subtle animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                                  <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">{cat}</span>
                                  <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded">
                                    {sortedQuestions.length} Questions
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {sortedQuestions.map((q, qIdx) => {
                                    const isEditing = editingQuestionId === q.id;

                                    return (
                                      <div key={q.id} className="p-3 bg-surface-sunken border border-border-subtle rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                                        {isEditing ? (
                                          <div className="flex-1 space-y-3 w-full">
                                            <div className="flex flex-col gap-1.5">
                                              <label className="text-[9px] text-subtle-foreground font-bold uppercase tracking-wider">Question text</label>
                                              <textarea
                                                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground font-bold focus:outline-none"
                                                rows={2}
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                              />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] text-subtle-foreground font-bold uppercase tracking-wider">Type</label>
                                                <select
                                                  className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                                                  value={editingType}
                                                  onChange={(e) => setEditingType(e.target.value as any)}
                                                >
                                                  <option value="Rating 1-5">Rating 1-5</option>
                                                  <option value="Yes/No">Yes/No</option>
                                                  <option value="Open Text">Open Text</option>
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] text-subtle-foreground font-bold uppercase tracking-wider">Required</label>
                                                <select
                                                  className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                                                  value={editingRequired}
                                                  onChange={(e) => setEditingRequired(e.target.value as any)}
                                                >
                                                  <option value="Yes">Yes</option>
                                                  <option value="No">No</option>
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] text-subtle-foreground font-bold uppercase tracking-wider">Category</label>
                                                <input
                                                  type="text"
                                                  className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground font-bold focus:outline-none"
                                                  value={editingCategory}
                                                  onChange={(e) => setEditingCategory(e.target.value)}
                                                />
                                              </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                              <button
                                                type="button"
                                                onClick={() => setEditingQuestionId(null)}
                                                className="px-3 py-1.5 bg-surface hover:bg-surface-2 text-muted-foreground hover:text-foreground rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleSaveEdit(q.id)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-lg text-[9px] font-black uppercase tracking-widest transition flex items-center gap-1 cursor-pointer"
                                              >
                                                <Save className="w-3 h-3" /> Save Changes
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex-1 space-y-1">
                                              <p className="font-bold text-foreground tracking-tight uppercase leading-relaxed">{q.text}</p>
                                              <div className="flex flex-wrap gap-2 text-[9px] uppercase font-black tracking-wider text-subtle-foreground">
                                                <span className="px-1.5 py-0.5 bg-surface-tint rounded border border-border-subtle">Type: {q.type || 'Rating 1-5'}</span>
                                                <span className="px-1.5 py-0.5 bg-surface-tint rounded border border-border-subtle">Required: {q.required || 'Yes'}</span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-center">
                                              <button
                                                type="button"
                                                disabled={qIdx === 0}
                                                onClick={() => handleMoveQuestion(q, 'UP')}
                                                className="p-1.5 bg-background border border-border-subtle rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition cursor-pointer"
                                                title="Move Up"
                                              >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                disabled={qIdx === sortedQuestions.length - 1}
                                                onClick={() => handleMoveQuestion(q, 'DOWN')}
                                                className="p-1.5 bg-background border border-border-subtle rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition cursor-pointer"
                                                title="Move Down"
                                              >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleStartEditing(q)}
                                                className="p-1.5 bg-background border border-border-subtle rounded-lg text-muted-foreground hover:text-indigo-400 transition cursor-pointer"
                                                title="Edit"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-1.5 bg-background border border-border-subtle rounded-lg text-muted-foreground hover:text-rose-400 transition cursor-pointer"
                                                title="Delete"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="student"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <AnimatePresence mode="wait">
                {activeSimulationToken ? (
                  <motion.div
                    key="inline-evaluation"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveSimulationToken(null)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-foreground/80 hover:text-foreground transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Exit Survey Sandbox
                      </button>

                      <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/5 px-3 py-1.5 border border-emerald-500/15 rounded-xl">
                        <ShieldCheck className="w-4 h-4 animate-pulse" /> Sandbox Simulation Mode
                      </div>
                    </div>

                    <div className="border border-border-subtle rounded-3xl overflow-hidden shadow-2xl">
                      <PublicSurveyResponse token={activeSimulationToken} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="simulation-inbox"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card p-6 md:p-8 space-y-6"
                  >
                    {/* Header */}
                    <div className="border-b border-border-subtle pb-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-400" /> Student Simulation Inbox (Sandbox)
                          </h3>
                          <p className="text-xs text-muted-foreground leading-normal mt-1">
                            AegisEDU mimics institutional SMTP pipelines. Below, view emails sent to students containing their secure evaluation links.
                          </p>
                        </div>
                        <div className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-center shrink-0">
                          Total Invites: {invitations.length}
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Select Campaign Filter */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Filter by Campaign</label>
                        <select
                          value={simulatingSurveyId}
                          onChange={(e) => setSimulatingSurveyId(e.target.value)}
                          className="w-full bg-surface p-3 rounded-xl border border-border text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value="">-- All Campaigns --</option>
                          {surveys.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Module Filter */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Filter by Module</label>
                        <select
                          value={simulatingModuleCode}
                          onChange={(e) => setSimulatingModuleCode(e.target.value)}
                          className="w-full bg-surface p-3 rounded-xl border border-border text-xs font-bold text-foreground focus:outline-none"
                        >
                          <option value="">-- All Modules --</option>
                          {Array.from(new Set(invitations.map(i => i.moduleCode))).map(code => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </div>

                      {/* Search Student Name/Email */}
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-subtle-foreground uppercase tracking-widest">Search Student / Recipient</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search email, name..."
                            value={studentComment} // Reusing studentComment state as a simple search query
                            onChange={(e) => setStudentComment(e.target.value)}
                            className="w-full bg-surface p-3 pl-9 rounded-xl border border-border text-xs font-bold text-foreground focus:outline-none"
                          />
                          <Search className="w-3.5 h-3.5 text-subtle-foreground absolute left-3 top-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Enforced Anonymity Warning */}
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3 items-start text-xs">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <p className="font-black text-foreground uppercase tracking-wider">Secure Double-Blind Architecture Enforced</p>
                        <p className="text-muted-foreground font-semibold leading-relaxed">
                          Even though administrators can trace invitations here, <strong>submitted responses</strong> do not contain tokens, student references, or keys. De-activating an invitation and writing a response are processed as isolated writes.
                        </p>
                      </div>
                    </div>

                    {/* Email Stream */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {invitations
                        .filter(inv => !simulatingSurveyId || inv.surveyId === simulatingSurveyId)
                        .filter(inv => !simulatingModuleCode || inv.moduleCode === simulatingModuleCode)
                        .filter(inv => {
                          const query = studentComment.toLowerCase().trim();
                          if (!query) return true;
                          return inv.studentName?.toLowerCase().includes(query) || inv.studentEmail?.toLowerCase().includes(query);
                        })
                        .map((inv) => {
                          const closeDate = new Date(inv.expiresAt);
                          closeDate.setHours(23, 59, 59, 999);
                          const isExpired = new Date() > closeDate;
                          const isUsed = inv.used;

                          return (
                            <div 
                              key={inv.id} 
                              className={cn(
                                "p-5 border rounded-2xl transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
                                isUsed ? "bg-surface-sunken border-border-subtle opacity-75" : 
                                isExpired ? "bg-rose-950/5 border-rose-900/10" : 
                                "bg-surface-sunken border-border hover:border-indigo-500/20 shadow-sm"
                              )}
                            >
                              {/* Left status vertical ribbon */}
                              <div className={cn(
                                "absolute top-0 bottom-0 left-0 w-1",
                                isUsed ? "bg-slate-600" : 
                                isExpired ? "bg-rose-500" : 
                                "bg-gradient-to-b from-emerald-500 to-indigo-500"
                              )} />

                              {/* Student & Invitation details */}
                              <div className="space-y-3 pl-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase">
                                    {inv.studentName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || 'ST'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-foreground">{inv.studentName}</p>
                                    <p className="text-[10px] text-subtle-foreground font-bold">{inv.studentEmail}</p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wide">
                                    Subject: Academic Survey Invitation — {inv.moduleCode}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                                    Please evaluate: <strong className="text-foreground/80">{inv.moduleName}</strong> under campaign "{inv.surveyTitle}".
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                  {/* Status Indicator Badge */}
                                  {isUsed ? (
                                    <span className="px-2 py-0.5 bg-surface-tint border border-border text-subtle-foreground text-[8px] font-black uppercase tracking-widest rounded">
                                      Deactivated (Used)
                                    </span>
                                  ) : isExpired ? (
                                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-widest rounded">
                                      Deactivated (Expired)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded animate-pulse">
                                      Active Link
                                    </span>
                                  )}

                                  <span className="text-[9px] text-subtle-foreground font-bold flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Closes: {inv.expiresAt}
                                  </span>
                                </div>
                              </div>

                              {/* Simulation CTA Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {/* Simulated action to open in simulator */}
                                <button
                                  type="button"
                                  disabled={isUsed || isExpired}
                                  onClick={() => setActiveSimulationToken(inv.token)}
                                  className={cn(
                                    "px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1 border",
                                    isUsed || isExpired 
                                      ? "bg-surface border-border-subtle text-subtle-foreground cursor-not-allowed" 
                                      : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500/20 text-foreground shadow"
                                  )}
                                >
                                  Open Link Inline
                                </button>

                                {/* Real anchor link to open in new browser tab bypassing LoginPage */}
                                <a
                                  href={`/?token=${inv.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-2 rounded-xl border transition flex items-center justify-center text-muted-foreground hover:text-foreground",
                                    isUsed || isExpired 
                                      ? "border-border-subtle bg-surface-sunken cursor-not-allowed pointer-events-none text-subtle-foreground/70" 
                                      : "bg-surface hover:bg-surface-2 border-border"
                                  )}
                                  title="Test URL Query Parameter Link in New Tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}

                      {invitations.length === 0 && (
                        <div className="text-center py-12 bg-surface-sunken border border-dashed border-border-subtle rounded-2xl space-y-2">
                          <Mail className="w-10 h-10 text-subtle-foreground mx-auto" />
                          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">No invitations generated</h4>
                          <p className="text-[11px] text-subtle-foreground max-w-sm mx-auto font-medium leading-normal">
                            When QPO releases a draft campaign from the "Survey Registry" panel, invitations are automatically compiled and queued for every student uploaded to targeted modules.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
