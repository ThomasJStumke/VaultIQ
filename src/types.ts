export type DocCategory = 'CURRICULUM' | 'ASSESSMENTS' | 'MODERATION' | 'EVIDENCE' | 'COMPLIANCE';

export type AssessmentMode = 'EXAM_BASED' | 'CONTINUOUS_ASSESSMENT' | 'PROJECT_BASED';
export type DeliveryMode = 'FACE_TO_FACE' | 'ONLINE' | 'HYBRID';
export type ComplianceLevel = 'COMPLIANT' | 'PENDING' | 'AT_RISK' | 'NON_COMPLIANT';

export interface ComplianceRequirement {
  id: string;
  label: string;
  category: DocCategory;
  isMandatory: boolean;
  status: 'MISSING' | 'UPLOADED' | 'VALIDATED';
  deadlineOffsetDays: number; // Relative to Semester Start
  description: string;
}

export interface ModuleAuditStatus {
  moduleId: string;
  score: number;
  level: ComplianceLevel;
  lastEvaluatedAt: string;
  missingRequirements: ComplianceRequirement[];
}

export interface AIValidationResult {
  isCorrectType: boolean;
  confidence: number;
  hasSignature: boolean;
  extractedCode: string;
  feedback: string[];
  handwrittenNotesDetected: boolean;
  status: 'APPROVED' | 'PARTIAL' | 'REJECTED';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'REMINDER' | 'WARNING' | 'ESCALATION' | 'AUDIT';
  status: 'UNREAD' | 'READ';
  createdAt: string;
  moduleCode?: string;
  escalationTier?: number;
}

export interface ExamMetadata {
  id: string;
  moduleId: string;
  version: number;
  releaseDate: string; // ISO String
  isEncrypted: boolean;
  passwordProtected: boolean;
  accessLog: SecureAuditEntry[];
  status: 'DRAFT' | 'MODERATION' | 'FINAL_LOCKED';
}

export interface SecureAuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: 'UPLOAD' | 'VIEW' | 'DOWNLOAD' | 'DECRYPT';
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface AnalyticsStats {
  totalModules: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  compliancePercentage: number;
  overdueItems: number;
  pendingModeration: number;
}

export interface FacultyStats {
  id: string;
  name: string;
  complianceRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  departments: {
    id: string;
    name: string;
    complianceRate: number;
  }[];
}

export interface FileMetadata {
  id: string;
  moduleId: string;
  category: DocCategory;
  version: number;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
  faculty: string;
  department: string;
  programme: string;
  year: number;
  semester: 1 | 2;
  size: number;
  hash: string;
}

export type UserRole = 
  | 'LECTURER' 
  | 'HOD' 
  | 'PROGRAMME_COORDINATOR'
  | 'FACULTY_ADMIN' 
  | 'DEPUTY_DEAN'
  | 'EXECUTIVE_DEAN'
  | 'DVC_TL'
  | 'CQPA'
  | 'QPO'
  | 'INTERNAL_MODERATOR' 
  | 'EXTERNAL_MODERATOR' 
  | 'AUDITOR'
  | 'EXAMS';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  facultyId?: string;
  departmentId?: string;
  assignedModules?: string[];
}

export interface Module {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  lecturerUids: string[];
  complianceStatus: 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT';
  lastAuditAt?: string;
  assessmentMode?: AssessmentMode;
  isExitLevel?: boolean;
}

export interface Evidence {
  id: string;
  moduleId: string;
  type: 'STUDY_GUIDE' | 'ASSESSMENT_TASK' | 'MODERATION_REPORT' | 'EXAM_PAPER' | 'PRE_REVIEW';
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  aiValidationStatus: 'VALID' | 'INVALID' | 'PENDING';
  aiFeedback?: string;
  name?: string;
  category?: DocCategory;
  subCategory?: 'INTERNAL_MOD' | 'EXTERNAL_MOD' | 'OTHER';
  isExamRelated?: boolean;
  size?: string;
  version?: number;
  questionnaire?: {
    examinerName: string;
    internalModeratorName: string;
    externalModeratorName?: string;
    examDate: string;
    totalMarks: number;
    timeAllowed: string;
    venue: string;
    specialInstructions: string;
  } | null;
  frontPageGenerated?: boolean;
  frontPageData?: {
    generatedAt: string;
    institution: string;
    faculty: string;
    department: string;
  } | null;
}

export interface Faculty {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  facultyId: string;
  name: string;
}
