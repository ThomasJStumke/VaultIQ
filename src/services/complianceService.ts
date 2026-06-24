import { 
  Module, 
  ComplianceRequirement, 
  ComplianceLevel, 
  ModuleAuditStatus,
  DocCategory
} from '../types';

/**
 * VaultIQ Compliance Rules Engine Service
 */

const INSTITUTIONAL_REQUIREMENTS: ComplianceRequirement[] = [
  // General / Curriculum
  { id: 'study-guide', label: 'Study Guide (NQF Aligned)', category: 'CURRICULUM', isMandatory: true, status: 'MISSING', deadlineOffsetDays: -30, description: 'Aligned to module descriptor, outcomes, and CQPA template.' },
  { id: 'module-descriptor', label: 'Module Descriptor', category: 'CURRICULUM', isMandatory: true, status: 'MISSING', deadlineOffsetDays: -30, description: 'Including synopsis of CESM code.' },
  { id: 'lecture-schedule', label: 'Lecture Schedule / Work Plan', category: 'CURRICULUM', isMandatory: true, status: 'MISSING', deadlineOffsetDays: -30, description: 'Lectures, labs, field trips, and tutorials.' },
  { id: 'comm-plans', label: 'Communication Plans & Proof', category: 'CURRICULUM', isMandatory: true, status: 'MISSING', deadlineOffsetDays: -14, description: 'Proof of student communication channels.' },
  { id: 'resource-adequacy', label: 'Adequacy of Resources', category: 'CURRICULUM', isMandatory: true, status: 'MISSING', deadlineOffsetDays: -14, description: 'Including online platforms and tools.' },
  
  // Assessments
  { id: 'internal-moderator-details', label: 'Internal Moderator Details', category: 'MODERATION', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 30, description: 'Details of the assigned internal moderator.' },
  { id: 'moderated-assessment', label: 'Moderated Assessment (v1)', category: 'ASSESSMENTS', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 45, description: 'Assessment with moderator comments (electronic or handwritten).' },
  { id: 'assessment-rubric', label: 'Marking Memo / Rubric', category: 'ASSESSMENTS', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 45, description: 'Final rubric for the assessment.' },
  { id: 'student-exemplars', label: 'Student Work Exemplars', category: 'EVIDENCE', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 120, description: '1x Good, 1x Average, 1x Below Average sample scripts.' },
  
  // Exams (Conditional)
  { id: 'exam-moderation-report', label: 'Exams: Moderator Report', category: 'MODERATION', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 130, description: 'Combined internal & external moderator report for exams.' },
  { id: 'final-marks-excel', label: 'Final Marks (Excel)', category: 'COMPLIANCE', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 140, description: 'Final marks as average % including results of assessments.' },
  { id: 'dp-list', label: 'Final List of DPs in Excel', category: 'COMPLIANCE', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 140, description: 'Final list of Duly Performed students.' },

  // Feedback
  { id: 'student-feedback-response', label: 'Student Feedback Response', category: 'COMPLIANCE', isMandatory: true, status: 'MISSING', deadlineOffsetDays: 150, description: 'Evidence of changes made in response to MEQ & LEQ feedback.' },
];

export const determineRequirements = (module: Module): ComplianceRequirement[] => {
  // In a production app, this would fetch from a 'requirement_templates' collection
  return [...INSTITUTIONAL_REQUIREMENTS];
};

export const evaluateCompliance = (
  moduleId: string, 
  requirements: ComplianceRequirement[],
  uploadedDocs: any[]
): ModuleAuditStatus => {
  const missing = requirements.filter(req => {
    const hasDoc = uploadedDocs.some(doc => doc.category === req.category);
    return !hasDoc;
  });

  const uploadedCount = requirements.length - missing.length;
  const score = (uploadedCount / requirements.length) * 100;

  let level: ComplianceLevel = 'COMPLIANT';
  if (score < 100) level = 'PENDING';
  if (score < 70) level = 'AT_RISK';
  if (score < 40) level = 'NON_COMPLIANT';

  return {
    moduleId,
    score: Math.round(score),
    level,
    lastEvaluatedAt: new Date().toISOString(),
    missingRequirements: missing
  };
};

export const getEscalationLevel = (status: ModuleAuditStatus): number => {
  if (status.level === 'COMPLIANT') return 0;
  if (status.level === 'PENDING') return 1;
  if (status.level === 'AT_RISK') return 2;
  return 3;
};
