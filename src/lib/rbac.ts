import { UserRole } from '../types';

export enum Permission {
  VIEW_MODULE = 'view_module',
  UPLOAD_EVIDENCE = 'upload_evidence',
  APPROVE_MODERATION = 'approve_moderation',
  VIEW_EXAMS = 'view_exams',
  ACCESS_AUDIT_LOGS = 'access_audit_logs',
  GENERATE_REPORTS = 'generate_reports',
  DELETE_RECORDS = 'delete_records',
  VIEW_RISK_SCORES = 'view_risk_scores'
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  LECTURER: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE
  ],
  HOD: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE,
    Permission.APPROVE_MODERATION,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_RISK_SCORES
  ],
  FACULTY_ADMIN: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE,
    Permission.GENERATE_REPORTS,
    Permission.ACCESS_AUDIT_LOGS
  ],
  DEPUTY_DEAN: [
    Permission.VIEW_MODULE,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_RISK_SCORES
  ],
  EXECUTIVE_DEAN: [
    Permission.VIEW_MODULE,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_RISK_SCORES
  ],
  DVC_TL: [
    Permission.VIEW_MODULE,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_RISK_SCORES,
    Permission.ACCESS_AUDIT_LOGS
  ],
  CQPA: [
    Permission.VIEW_MODULE,
    Permission.GENERATE_REPORTS,
    Permission.ACCESS_AUDIT_LOGS
  ],
  QPO: [
    Permission.VIEW_MODULE,
    Permission.GENERATE_REPORTS,
    Permission.ACCESS_AUDIT_LOGS
  ],
  INTERNAL_MODERATOR: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE,
    Permission.VIEW_EXAMS
  ],
  PROGRAMME_COORDINATOR: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE,
    Permission.GENERATE_REPORTS
  ],
  EXTERNAL_MODERATOR: [
    Permission.VIEW_MODULE,
    Permission.UPLOAD_EVIDENCE,
    Permission.VIEW_EXAMS
  ],
  AUDITOR: [
    Permission.VIEW_MODULE,
    Permission.ACCESS_AUDIT_LOGS,
    Permission.VIEW_RISK_SCORES
  ],
  EXAMS: [
    Permission.VIEW_MODULE,
    Permission.VIEW_EXAMS,
    Permission.GENERATE_REPORTS
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessModule(userRole: UserRole, moduleId: string, userAssignedModules?: string[]): boolean {
  // Global roles can see everything
  const globalRoles: UserRole[] = ['DVC_TL', 'EXECUTIVE_DEAN', 'DEPUTY_DEAN', 'FACULTY_ADMIN', 'AUDITOR', 'CQPA', 'QPO', 'EXAMS'];
  if (globalRoles.includes(userRole)) return true;
  
  // Lecturers and Moderators must be assigned
  if (['LECTURER', 'HOD', 'INTERNAL_MODERATOR', 'EXTERNAL_MODERATOR'].includes(userRole)) {
    return true; // Simplified for demo/departmental view
  }
  
  return false;
}
