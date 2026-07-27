import { supabase } from '../lib/supabase';
import { snakeToCamel, camelToSnake } from '../lib/caseConvert';
import { Module, Evidence } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleSupabaseError(error: unknown, operationType: OperationType, path: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Supabase Error:', JSON.stringify({ error: message, operationType, path }));
  throw new Error(message);
}

// Subscribes to a table with an initial fetch + realtime refetch-on-change.
// Returns an unsubscribe function, mirroring the old Firestore onSnapshot API.
function subscribeToTable<T>(
  table: string,
  callback: (rows: T[]) => void,
  opts: { orderBy?: string; ascending?: boolean; filter?: { column: string; value: string } } = {}
) {
  const fetchAndEmit = async () => {
    let query = supabase.from(table).select('*');
    if (opts.filter) query = query.eq(opts.filter.column, opts.filter.value);
    if (opts.orderBy) query = query.order(opts.orderBy, { ascending: opts.ascending ?? true });

    const { data, error } = await query;
    if (error) {
      handleSupabaseError(error, OperationType.LIST, table);
      return;
    }
    callback((data ?? []).map((row) => snakeToCamel<T>(row)));
  };

  fetchAndEmit();

  const channel = supabase
    .channel(`${table}-${opts.filter?.value ?? 'all'}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, fetchAndEmit)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export const subscribeToModules = (callback: (modules: Module[]) => void) => {
  return subscribeToTable<Module>('modules', callback, { orderBy: 'code', ascending: true });
};

export const addModule = async (moduleData: Omit<Module, 'id'>) => {
  try {
    return await supabase.from('modules').insert(camelToSnake(moduleData));
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'modules');
  }
};

export const updateModule = async (moduleId: string, updates: Partial<Module>) => {
  try {
    return await supabase.from('modules').update(camelToSnake(updates)).eq('id', moduleId);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}`);
  }
};

export const updateModuleCompliance = async (moduleId: string, status: Module['complianceStatus']) => {
  try {
    return await supabase
      .from('modules')
      .update({ compliance_status: status, last_audit_at: new Date().toISOString() })
      .eq('id', moduleId);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}`);
  }
};

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export const subscribeToEvidence = (moduleId: string, callback: (evidence: Evidence[]) => void) => {
  return subscribeToTable<Evidence>('evidence', callback, {
    orderBy: 'created_at',
    ascending: false,
    filter: { column: 'module_id', value: moduleId },
  });
};

export const uploadEvidenceMetadata = async (moduleId: string, evidence: Omit<Evidence, 'id' | 'createdAt'>) => {
  try {
    return await supabase.from('evidence').insert({ ...camelToSnake(evidence), module_id: moduleId });
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, `modules/${moduleId}/evidence`);
  }
};

export const updateEvidence = async (moduleId: string, evidenceId: string, updates: any) => {
  try {
    return await supabase.from('evidence').update(camelToSnake(updates)).eq('id', evidenceId);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}/evidence/${evidenceId}`);
  }
};

export const deleteEvidence = async (moduleId: string, evidenceId: string) => {
  try {
    await supabase.from('evidence').delete().eq('id', evidenceId);
  } catch (error) {
    handleSupabaseError(error, OperationType.DELETE, `modules/${moduleId}/evidence/${evidenceId}`);
  }
};

// ---------------------------------------------------------------------------
// Staff directory (formerly the Firestore `users` collection)
// ---------------------------------------------------------------------------

export const subscribeToUsers = (callback: (users: any[]) => void) => {
  return subscribeToTable<any>('staff', callback);
};

export const updateUserProfile = async (uid: string, updates: any) => {
  try {
    return await supabase.from('staff').update(camelToSnake(updates)).eq('id', uid);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `staff/${uid}`);
  }
};

export const addStaffMember = async (staffData: { displayName: string; email: string; role: any; departmentId: string }) => {
  try {
    return await supabase.from('staff').insert({ ...camelToSnake(staffData), status: 'ACTIVE' });
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'staff');
  }
};

// ---------------------------------------------------------------------------
// Questionnaires
// ---------------------------------------------------------------------------

export const subscribeToQuestionnaires = (callback: (questionnaires: any[]) => void) => {
  return subscribeToTable<any>('questionnaires', callback);
};

export const addQuestionnaire = async (data: any) => {
  try {
    return await supabase.from('questionnaires').insert(camelToSnake(data));
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'questionnaires');
  }
};

// ---------------------------------------------------------------------------
// Student evaluations
// ---------------------------------------------------------------------------

export const subscribeToStudentEvaluations = (callback: (evaluations: any[]) => void) => {
  return subscribeToTable<any>('student_evaluations', callback);
};

export const addStudentEvaluation = async (data: any) => {
  try {
    return await supabase.from('student_evaluations').insert(camelToSnake(data));
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'student_evaluations');
  }
};

// ---------------------------------------------------------------------------
// Development plans
// ---------------------------------------------------------------------------

export const subscribeToDevelopmentPlans = (callback: (plans: any[]) => void) => {
  return subscribeToTable<any>('development_plans', callback);
};

export const addDevelopmentPlan = async (data: any) => {
  try {
    return await supabase.from('development_plans').insert({ ...camelToSnake(data), updated_at: new Date().toISOString() });
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'development_plans');
  }
};

export const updateDevelopmentPlan = async (planId: string, data: any) => {
  try {
    return await supabase
      .from('development_plans')
      .update({ ...camelToSnake(data), updated_at: new Date().toISOString() })
      .eq('id', planId);
  } catch (error) {
    handleSupabaseError(error, OperationType.UPDATE, `development_plans/${planId}`);
  }
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const subscribeToNotifications = (callback: (notifications: any[]) => void) => {
  return subscribeToTable<any>('notifications', callback, { orderBy: 'created_at', ascending: false });
};

export const addNotification = async (notificationData: any) => {
  try {
    return await supabase.from('notifications').insert(camelToSnake(notificationData));
  } catch (error) {
    handleSupabaseError(error, OperationType.CREATE, 'notifications');
  }
};

// ---------------------------------------------------------------------------
// Seed data (idempotent — only inserts if a table is empty)
// ---------------------------------------------------------------------------

export const initializeSeedData = async () => {
  try {
    const { count: moduleCount } = await supabase.from('modules').select('*', { count: 'exact', head: true });
    if (!moduleCount) {
      const seedModules = [
        { code: 'AUDB201', name: 'Auditing Fundamentals', department_id: 'FAI_AUD_TAX', lecturer_uids: ['Mr. A'], compliance_status: 'PENDING', assessment_mode: 'EXAM_BASED' },
        { code: 'PRG201', name: 'Technical Programming 2', department_id: 'FAI_IT', lecturer_uids: ['Prof. B'], compliance_status: 'PENDING', assessment_mode: 'CONTINUOUS_ASSESSMENT' },
        { code: 'SYS111', name: 'Systems Analysis 1', department_id: 'FAI_IS', lecturer_uids: [], compliance_status: 'COMPLIANT', assessment_mode: 'PROJECT_BASED' },
      ];
      await supabase.from('modules').insert(seedModules);
    }

    const { count: staffCount } = await supabase.from('staff').select('*', { count: 'exact', head: true });
    if (!staffCount) {
      const seedStaff = [
        { email: 'mr.a@university.edu', display_name: 'Mr. A', role: 'LECTURER', department_id: 'FAI_AUD_TAX' },
        { email: 'prof.b@university.edu', display_name: 'Prof. B', role: 'LECTURER', department_id: 'FAI_IT' },
        { email: 's.jenkins@university.edu', display_name: 'Dr. Sarah Jenkins', role: 'LECTURER', department_id: 'FAI_FIN_ACC' },
        { email: 'admin@university.edu', display_name: 'James Wilson', role: 'FACULTY_ADMIN', department_id: 'FAI' },
      ];
      await supabase.from('staff').insert(seedStaff);
    }

    const { data: existingQ } = await supabase.from('questionnaires').select('id').limit(1);
    let defaultQId = existingQ?.[0]?.id as string | undefined;
    if (!defaultQId) {
      const masterQ = {
        title: 'CQPA Institutional Module & Lecturer Evaluation Questionnaire',
        type: 'UNIVERSAL',
        questions: [
          { id: 'q1', text: 'Lecturer starts lectures on time and displays professional punctuality', type: 'RATING' },
          { id: 'q2', text: 'Module outcomes and materials are clearly articulated and aligned with higher education standards', type: 'RATING' },
          { id: 'q3', text: 'Assessments are graded with constructive feedback and objective transparency', type: 'RATING' },
          { id: 'q4', text: 'Quality and relevance of the text, slides, and supplementary guidelines', type: 'RATING' },
        ],
        created_by: 'CQPA Unit Master',
      };
      const { data: inserted } = await supabase.from('questionnaires').insert(masterQ).select('id').single();
      defaultQId = inserted?.id;
    }

    const { count: evalCount } = await supabase.from('student_evaluations').select('*', { count: 'exact', head: true });
    if (!evalCount && defaultQId) {
      const seedEvaluations = [
        { questionnaire_id: defaultQId, module_code: 'AUDB201', lecturer_uid: 'Mr. A', lecturer_name: 'Mr. A', evaluator_type: 'STUDENT', ratings: { q1: 4, q2: 5, q3: 3, q4: 4 }, comments: 'Great delivery, but grade turnaround takes too long.' },
        { questionnaire_id: defaultQId, module_code: 'AUDB201', lecturer_uid: 'Mr. A', lecturer_name: 'Mr. A', evaluator_type: 'STUDENT', ratings: { q1: 5, q2: 4, q3: 4, q4: 5 }, comments: 'Very thorough auditee examples, very well connected.' },
        { questionnaire_id: defaultQId, module_code: 'PRG201', lecturer_uid: 'Prof. B', lecturer_name: 'Prof. B', evaluator_type: 'STUDENT', ratings: { q1: 3, q2: 3, q3: 4, q4: 3 }, comments: 'Tough programming syllabus, needs more tutorial worksheets.' },
        { questionnaire_id: defaultQId, module_code: 'PRG201', lecturer_uid: 'Prof. B', lecturer_name: 'Prof. B', evaluator_type: 'STUDENT', ratings: { q1: 5, q2: 5, q3: 5, q4: 4 }, comments: 'Brilliant coder, really inspires his students!' },
      ];
      await supabase.from('student_evaluations').insert(seedEvaluations);
    }

    const { count: devCount } = await supabase.from('development_plans').select('*', { count: 'exact', head: true });
    if (!devCount) {
      const seedDevPlans = [
        {
          lecturer_uid: 'Mr. A',
          lecturer_name: 'Mr. A',
          module_code: 'AUDB201',
          area_of_improvement: 'Assessments constructive grading & objective feedback turnaround times (Evaluation q3 factor)',
          suggested_action: 'Establish standard 14-day grading cycle with detailed digital rubric transparency for each student test.',
          commitment_date: '2026-07-15',
          status: 'COMMITTED',
          update_statement: 'Rubric checklists configured. Implementation begins immediately on semester diagnostics.',
        },
        {
          lecturer_uid: 'Prof. B',
          lecturer_name: 'Prof. B',
          module_code: 'PRG201',
          area_of_improvement: 'Module syllabus presentation clarity & supplementary tutorial worksheets (Evaluation q4 factor)',
          suggested_action: 'Create visual workspace examples and publish 3 supportive tutorial worksheets answering nested code criteria.',
          commitment_date: '',
          status: 'PROPOSED',
          update_statement: '',
        },
      ];
      await supabase.from('development_plans').insert(seedDevPlans);
    }
  } catch (error) {
    handleSupabaseError(error, OperationType.GET, 'seed');
  }
};
