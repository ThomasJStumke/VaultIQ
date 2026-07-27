import { supabase } from '../lib/supabase';
import { Module, Evidence } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Supabase Error:', JSON.stringify({ error: message, operationType, path }));
  throw error instanceof Error ? error : new Error(message);
}

// ---------------------------------------------------------------------------
// camelCase <-> snake_case row mapping. Shallow only -- nested JSONB column
// values (ratings, questions, students, fields, styles, ...) pass through
// untouched, since their internal keys aren't DB columns.
// ---------------------------------------------------------------------------

const toSnake = (k: string) => k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function rowToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) continue;
    out[toSnake(k)] = obj[k];
  }
  return out;
}

function rowToCamel<T = any>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    out[toCamel(k)] = row[k];
  }
  return out as T;
}

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Shared realtime helper. Supabase Realtime doesn't replay existing rows the
// way Firestore's onSnapshot does, so every subscribe* does an initial fetch
// plus a postgres_changes channel subscription, and returns a plain
// () => void unsubscribe to preserve the calling convention every component
// already uses (`useEffect(() => subscribeToX(cb), [])`).
// ---------------------------------------------------------------------------

function subscribeTable<T>(
  table: string,
  mapRow: (row: any) => T,
  callback: (rows: T[]) => void,
  options: {
    orderBy?: { column: string; ascending: boolean };
    filter?: { column: string; value: string };
    onError?: (error: unknown) => void;
  } = {}
): () => void {
  let cancelled = false;

  const fetchAndEmit = async () => {
    let q = supabase.from(table).select('*');
    if (options.filter) q = q.eq(options.filter.column, options.filter.value);
    if (options.orderBy) q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending });
    const { data, error } = await q;
    if (error) {
      options.onError?.(error);
      handleSupabaseError(error, OperationType.LIST, table);
      return;
    }
    if (!cancelled) callback((data ?? []).map(mapRow));
  };

  fetchAndEmit();

  const channelFilter = options.filter ? `${options.filter.column}=eq.${options.filter.value}` : undefined;
  const channel = supabase
    .channel(`${table}-${options.filter?.value ?? 'all'}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: channelFilter }, () => {
      fetchAndEmit();
    })
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// modules
// ---------------------------------------------------------------------------

export const subscribeToModules = (callback: (modules: Module[]) => void, onError?: (error: unknown) => void) =>
  subscribeTable('modules', rowToCamel<Module>, callback, { orderBy: { column: 'code', ascending: true }, onError });

export const addModule = async (moduleData: Omit<Module, 'id'>) => {
  const { data, error } = await supabase.from('modules').insert(rowToSnake(moduleData)).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'modules');
  return data;
};

export const updateModule = async (moduleId: string, updates: Partial<Module>) => {
  const { error } = await supabase.from('modules').update(rowToSnake(updates)).eq('id', moduleId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}`);
};

export const updateModuleCompliance = async (moduleId: string, status: Module['complianceStatus']) => {
  const { error } = await supabase
    .from('modules')
    .update({ compliance_status: status, last_audit_at: nowIso() })
    .eq('id', moduleId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}`);
};

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

export const subscribeToEvidence = (moduleId: string, callback: (evidence: Evidence[]) => void, onError?: (error: unknown) => void) =>
  subscribeTable('evidence', rowToCamel<Evidence>, callback, {
    filter: { column: 'module_id', value: moduleId },
    orderBy: { column: 'created_at', ascending: false },
    onError,
  });

export const uploadEvidenceMetadata = async (moduleId: string, evidence: Omit<Evidence, 'id' | 'createdAt'> & { id?: string }) => {
  const { data, error } = await supabase
    .from('evidence')
    .insert({ ...rowToSnake(evidence), module_id: moduleId })
    .select()
    .single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, `modules/${moduleId}/evidence`);
  return data;
};

export const updateEvidence = async (moduleId: string, evidenceId: string, updates: any) => {
  const { error } = await supabase.from('evidence').update(rowToSnake(updates)).eq('id', evidenceId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `modules/${moduleId}/evidence/${evidenceId}`);
};

export const deleteEvidence = async (moduleId: string, evidenceId: string) => {
  const { data: row } = await supabase.from('evidence').select('storage_path').eq('id', evidenceId).maybeSingle();
  const { error } = await supabase.from('evidence').delete().eq('id', evidenceId);
  if (error) return handleSupabaseError(error, OperationType.DELETE, `modules/${moduleId}/evidence/${evidenceId}`);
  if (row?.storage_path) {
    await supabase.storage.from('evidence-vault').remove([row.storage_path]);
  }
};

// ---------------------------------------------------------------------------
// users / profiles
// ---------------------------------------------------------------------------

export const subscribeToUsers = (callback: (users: any[]) => void) =>
  subscribeTable('profiles', (row) => ({ ...rowToCamel(row), uid: row.id }), callback);

export const updateUserProfile = async (uid: string, updates: any) => {
  const { error } = await supabase.from('profiles').update(rowToSnake(updates)).eq('id', uid);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `profiles/${uid}`);

  // Keep user_type (the actual RLS-checked role source) in sync when the
  // primary role changes here -- this replaces this user's role assignments
  // with just the new one, matching StaffManagement's single-role model.
  if (updates.role) {
    const { data: roleRow } = await supabase.from('roles').select('id').eq('name', updates.role).single();
    if (roleRow?.id) {
      await supabase.from('user_type').delete().eq('user_id', uid);
      await supabase.from('user_type').insert({ user_id: uid, role_id: roleRow.id });
    }
  }
};

export const addStaffMember = async (staffData: {
  displayName: string;
  email: string;
  role: any;
  departmentId: string;
  programme?: string;
  highestQualification?: string;
  dateOfAppointment?: string;
  employmentType?: string;
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ ...rowToSnake(staffData), status: 'ACTIVE', is_placeholder: true })
    .select()
    .single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'profiles');

  // Mirror the placeholder's role into user_type too -- RLS's has_role()
  // checks user_type, not profiles.role, so without this the placeholder
  // would have no effective permissions once they sign up and claim it.
  try {
    const { data: roleRow } = await supabase.from('roles').select('id').eq('name', staffData.role).single();
    if (roleRow?.id && data?.id) {
      await supabase.from('user_type').insert({ user_id: data.id, role_id: roleRow.id });
    }
  } catch (e) {
    console.warn('Failed to mirror staff role into user_type:', e);
  }

  try {
    fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staffData.email,
        displayName: staffData.displayName,
        role: staffData.role,
      }),
    }).catch((err) => console.warn('Background welcome email error:', err));
  } catch (e) {
    console.warn('Welcome email trigger failed:', e);
  }

  return data;
};

// ---------------------------------------------------------------------------
// questionnaires
// ---------------------------------------------------------------------------

export const subscribeToQuestionnaires = (callback: (questionnaires: any[]) => void) =>
  subscribeTable('questionnaires', rowToCamel, callback);

export const addQuestionnaire = async (data: any) => {
  const row = rowToSnake(data);
  delete row.created_at;
  const { data: inserted, error } = await supabase.from('questionnaires').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'questionnaires');
  return inserted;
};

// ---------------------------------------------------------------------------
// student_evaluations
// ---------------------------------------------------------------------------

export const subscribeToStudentEvaluations = (callback: (evaluations: any[]) => void) =>
  subscribeTable('student_evaluations', rowToCamel, callback);

export const addStudentEvaluation = async (data: any) => {
  const row = rowToSnake(data);
  delete row.submitted_at;
  const { data: inserted, error } = await supabase.from('student_evaluations').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'student_evaluations');
  return inserted;
};

// ---------------------------------------------------------------------------
// development_plans
// ---------------------------------------------------------------------------

export const subscribeToDevelopmentPlans = (callback: (plans: any[]) => void) =>
  subscribeTable('development_plans', rowToCamel, callback);

export const addDevelopmentPlan = async (data: any) => {
  const row = rowToSnake(data);
  delete row.updated_at; // trigger-maintained
  const { data: inserted, error } = await supabase.from('development_plans').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'development_plans');
  return inserted;
};

export const updateDevelopmentPlan = async (planId: string, data: any) => {
  const row = rowToSnake(data);
  delete row.updated_at; // trigger-maintained
  const { error } = await supabase.from('development_plans').update(row).eq('id', planId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `development_plans/${planId}`);
};

// ---------------------------------------------------------------------------
// surveys (undocumented/free-form shape -> stored whole in a jsonb `data`
// column, spread back out on read alongside the dedicated `title` column)
// ---------------------------------------------------------------------------

function mapSurveyRow(row: any) {
  return { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, ...(row.data ?? {}) };
}

export const subscribeToSurveys = (callback: (surveys: any[]) => void) =>
  subscribeTable('surveys', mapSurveyRow, callback);

export const addSurvey = async (data: any) => {
  const { data: inserted, error } = await supabase
    .from('surveys')
    .insert({ title: data?.title ?? null, data })
    .select()
    .single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'surveys');
  return inserted;
};

export const updateSurvey = async (surveyId: string, data: any) => {
  const { data: existing } = await supabase.from('surveys').select('data').eq('id', surveyId).maybeSingle();
  const merged = { ...(existing?.data ?? {}), ...data };
  const { error } = await supabase
    .from('surveys')
    .update({ title: merged.title ?? null, data: merged })
    .eq('id', surveyId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `surveys/${surveyId}`);
};

// ---------------------------------------------------------------------------
// survey_responses
// ---------------------------------------------------------------------------

export const subscribeToSurveyResponses = (callback: (responses: any[]) => void) =>
  subscribeTable('survey_responses', rowToCamel, callback);

export const addSurveyResponse = async (data: any) => {
  const row = rowToSnake(data);
  delete row.submitted_at;
  const { data: inserted, error } = await supabase.from('survey_responses').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'survey_responses');
  return inserted;
};

// ---------------------------------------------------------------------------
// survey_invitations
// The public/unauthenticated entry points (getSurveyInvitationByToken,
// useSurveyInvitationToken) are intentionally NOT direct table reads/writes
// here -- see get_survey_invitation_by_token / submit_survey_response RPCs,
// called directly from PublicSurveyResponse.tsx.
// ---------------------------------------------------------------------------

export const createSurveyInvitations = async (invitations: any[]) => {
  const rows = invitations.map((inv) => ({ ...rowToSnake(inv), used: false }));
  const { error } = await supabase.from('survey_invitations').insert(rows);
  if (error) handleSupabaseError(error, OperationType.CREATE, 'survey_invitations');
};

export const subscribeToSurveyInvitations = (callback: (invitations: any[]) => void) =>
  subscribeTable('survey_invitations', rowToCamel, callback);

// ---------------------------------------------------------------------------
// student_lists (single row per module, was doc-ID-per-module in Firestore)
// ---------------------------------------------------------------------------

export const saveStudentList = async (
  moduleId: string,
  moduleCode: string,
  students: { name: string; email: string }[],
  uploadedBy: string
) => {
  const { error } = await supabase.from('student_lists').upsert(
    {
      module_id: moduleId,
      module_code: moduleCode,
      students,
      uploaded_by: uploadedBy,
      uploaded_at: nowIso(),
    },
    { onConflict: 'module_id' }
  );
  if (error) handleSupabaseError(error, OperationType.WRITE, `student_lists/${moduleId}`);
};

export const subscribeToStudentList = (moduleId: string, callback: (data: any) => void, onError?: (error: unknown) => void) => {
  let cancelled = false;

  const fetchAndEmit = async () => {
    const { data, error } = await supabase.from('student_lists').select('*').eq('module_id', moduleId).maybeSingle();
    if (error) {
      onError?.(error);
      handleSupabaseError(error, OperationType.GET, `student_lists/${moduleId}`);
      return;
    }
    if (!cancelled) callback(data ? rowToCamel(data) : null);
  };

  fetchAndEmit();

  const channel = supabase
    .channel(`student_lists-${moduleId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_lists', filter: `module_id=eq.${moduleId}` }, fetchAndEmit)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
};

export const getStudentListsOnce = async (): Promise<any[]> => {
  const { data, error } = await supabase.from('student_lists').select('*');
  if (error) {
    handleSupabaseError(error, OperationType.GET, 'student_lists');
    return [];
  }
  return (data ?? []).map(rowToCamel);
};

// ---------------------------------------------------------------------------
// question_bank
// ---------------------------------------------------------------------------

export const subscribeToQuestionBank = (callback: (questions: any[]) => void) =>
  subscribeTable('question_bank', rowToCamel, callback);

export const addQuestionBankQuestion = async (data: any) => {
  const row = rowToSnake(data);
  delete row.created_at;
  const { data: inserted, error } = await supabase.from('question_bank').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'question_bank');
  return inserted;
};

export const updateQuestionBankQuestion = async (id: string, data: any) => {
  const { error } = await supabase
    .from('question_bank')
    .update({ ...rowToSnake(data), updated_at: nowIso() })
    .eq('id', id);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `question_bank/${id}`);
};

export const deleteQuestionBankQuestion = async (id: string) => {
  const { error } = await supabase.from('question_bank').delete().eq('id', id);
  if (error) handleSupabaseError(error, OperationType.DELETE, `question_bank/${id}`);
};

// ---------------------------------------------------------------------------
// standard_templates / policy_documents (caller-supplied id -> upsert)
// ---------------------------------------------------------------------------

export const subscribeToStandardTemplates = (callback: (templates: any[]) => void) =>
  subscribeTable('standard_templates', rowToCamel, callback);

export const uploadStandardTemplate = async (id: string, data: any) => {
  const { error } = await supabase
    .from('standard_templates')
    .upsert({ id, ...rowToSnake(data), updated_at: nowIso() });
  if (error) handleSupabaseError(error, OperationType.WRITE, `standard_templates/${id}`);
};

export const deleteStandardTemplate = async (id: string) => {
  const { error } = await supabase.from('standard_templates').delete().eq('id', id);
  if (error) handleSupabaseError(error, OperationType.DELETE, `standard_templates/${id}`);
};

export const subscribeToPolicyDocuments = (callback: (policies: any[]) => void) =>
  subscribeTable('policy_documents', rowToCamel, callback);

export const uploadPolicyDocument = async (id: string, data: any) => {
  const { error } = await supabase
    .from('policy_documents')
    .upsert({ id, ...rowToSnake(data), updated_at: nowIso() });
  if (error) handleSupabaseError(error, OperationType.WRITE, `policy_documents/${id}`);
};

export const deletePolicyDocument = async (id: string) => {
  const { error } = await supabase.from('policy_documents').delete().eq('id', id);
  if (error) handleSupabaseError(error, OperationType.DELETE, `policy_documents/${id}`);
};

// ---------------------------------------------------------------------------
// department_guidelines (doc ID = departmentId; arbitrary caller fields were
// spread at the Firestore doc's top level -> stored in a jsonb `content`
// column here, spread back out on read to preserve the original shape)
// ---------------------------------------------------------------------------

function mapDepartmentGuidelinesRow(row: any) {
  return { id: row.department_id, departmentId: row.department_id, updatedAt: row.updated_at, ...(row.content ?? {}) };
}

export const subscribeToDepartmentGuidelines = (callback: (guidelines: any[]) => void) =>
  subscribeTable('department_guidelines', mapDepartmentGuidelinesRow, callback);

export const uploadDepartmentGuidelines = async (departmentId: string, data: any) => {
  const { error } = await supabase
    .from('department_guidelines')
    .upsert({ department_id: departmentId, content: data, updated_at: nowIso() });
  if (error) handleSupabaseError(error, OperationType.WRITE, `department_guidelines/${departmentId}`);
};

export const deleteDepartmentGuidelines = async (departmentId: string) => {
  const { error } = await supabase.from('department_guidelines').delete().eq('department_id', departmentId);
  if (error) handleSupabaseError(error, OperationType.DELETE, `department_guidelines/${departmentId}`);
};

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const subscribeToNotifications = (callback: (notifications: any[]) => void) =>
  subscribeTable('notifications', rowToCamel, callback, { orderBy: { column: 'created_at', ascending: false } });

export const addNotification = async (notificationData: any) => {
  const row = rowToSnake(notificationData);
  delete row.created_at;
  const { data, error } = await supabase.from('notifications').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'notifications');
  return data;
};

// ---------------------------------------------------------------------------
// report_templates
// ---------------------------------------------------------------------------

export const subscribeToReportTemplates = (callback: (templates: any[]) => void) =>
  subscribeTable('report_templates', rowToCamel, callback, { orderBy: { column: 'name', ascending: true } });

export const addReportTemplate = async (templateData: any) => {
  const row = rowToSnake(templateData);
  delete row.created_at;
  delete row.updated_at;
  const { data, error } = await supabase.from('report_templates').insert(row).select().single();
  if (error) return handleSupabaseError(error, OperationType.CREATE, 'report_templates');
  return data;
};

export const updateReportTemplate = async (templateId: string, updates: any) => {
  const row = rowToSnake(updates);
  delete row.updated_at; // trigger-maintained
  const { error } = await supabase.from('report_templates').update(row).eq('id', templateId);
  if (error) handleSupabaseError(error, OperationType.UPDATE, `report_templates/${templateId}`);
};

export const deleteReportTemplate = async (templateId: string) => {
  const { error } = await supabase.from('report_templates').delete().eq('id', templateId);
  if (error) handleSupabaseError(error, OperationType.DELETE, `report_templates/${templateId}`);
};
