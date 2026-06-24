/**
 * permissions.config.ts
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for VaultIQ role-based access control.
 *
 * Generated from: Role_Function_Matrix_without_Function.xlsx
 *
 * HOW TO USE THIS FILE WITH GOOGLE AI STUDIO / GEMINI:
 * Paste this entire file into your prompt and ask Gemini to wire every
 * screen/component to read from `getPermission(role, screen)` and
 * `getScope(role)` rather than hardcoding role checks inline. Do not let
 * Gemini re-derive these rules from prose — point it at this file.
 *
 * DESIGN NOTES (read before editing):
 * 1. PERMISSIONS answer "can this role ever see this screen, and what can
 *    they do on it?" — static, role-level.
 * 2. SCOPE answers "which records does their query return?" — driven by
 *    the org hierarchy (Faculty > Department > Programme > Module),
 *    independent of permissions. See SCOPE_RULES below.
 * 3. GATES answer "is this specific record ready to be shown right now?"
 *    — dynamic, computed per-record at runtime, e.g. the Exams Dashboard
 *    gate. See GATE_RULES below. Gates are NOT permissions — do not encode
 *    them as access levels.
 * 4. ALERT_ESCALATION_RULES drives the System Alerts screen's reminder/
 *    escalation engine — keyed by role, not a simple access flag.
 * ----------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// 1. ROLES
// ---------------------------------------------------------------------------

export type Role =
  | 'Faculty Admin'
  | 'Lecturer'
  | 'Programme Coordinator'
  | 'HOD'
  | 'Deputy Dean'
  | 'Executive Dean'
  | 'DVC: T&L'
  | 'QPO'
  | 'CQPA'
  | 'Auditor'
  | 'Exams';

export const ROLES: Role[] = [
  'Faculty Admin', 'Lecturer', 'Programme Coordinator', 'HOD',
  'Deputy Dean', 'Executive Dean', 'DVC: T&L', 'QPO', 'CQPA',
  'Auditor', 'Exams',
];

// ---------------------------------------------------------------------------
// 2. SCREENS
// ---------------------------------------------------------------------------

export type Screen =
  | 'Dashboard'
  | 'My Modules'
  | 'File Vault'
  | 'Exam Vault'
  | 'Student Evaluations'
  | 'System Alerts'
  | 'Compliance Engine'
  | 'Module Mapping'
  | 'Staff & Roles Management'
  | 'Executive Analytics'
  | 'Student Evaluations (Aggregate)'
  | 'Exam Vault Control'
  | 'Status Management'
  | 'Location Association'
  | 'Strategic Dashboard'
  | 'Student Survey Reviews'
  | 'Compliance Portfolios';

export const SCREENS: Screen[] = [
  'Dashboard',
  'My Modules',
  'File Vault',
  'Exam Vault',
  'Student Evaluations',
  'System Alerts',
  'Compliance Engine',
  'Module Mapping',
  'Staff & Roles Management',
  'Executive Analytics',
  'Student Evaluations (Aggregate)',
  'Exam Vault Control',
  'Status Management',
  'Location Association',
  'Strategic Dashboard',
  'Student Survey Reviews',
  'Compliance Portfolios',
];

// ---------------------------------------------------------------------------
// 3. ACCESS LEVELS
//    Mirrors the "Level of access" row in the matrix (row 2 of the Excel),
//    plus 'none' for cells left blank.
// ---------------------------------------------------------------------------

export type AccessLevel =
  | 'none'
  | 'view'
  | 'view_print'
  | 'upload_view'
  | 'assign_view';

// ---------------------------------------------------------------------------
// 4. DATA VISIBILITY SCOPES (DATA VISIBILITY RULES)
//    Defines precisely which records/modules each role can see:
//    - Lecturer: only modules they have personally been assigned to teach.
//    - Programme Coordinator: only modules assigned to them by HOD.
//    - HOD: all modules within their own department.
//    - Everyone else: all modules within the Faculty.
// ---------------------------------------------------------------------------

export type Scope = 'own' | 'assigned' | 'department' | 'faculty';

export const SCOPE_RULES: Record<Role, Scope> = {
  'Lecturer': 'own',                 // only modules they have personally been assigned to teach
  'Programme Coordinator': 'assigned', // only modules assigned to them by HOD
  'HOD': 'department',               // all modules within their own department
  
  // Everyone else can see all modules within the Faculty
  'Faculty Admin': 'faculty',
  'Deputy Dean': 'faculty',
  'Executive Dean': 'faculty',
  'DVC: T&L': 'faculty',
  'QPO': 'faculty',
  'CQPA': 'faculty',
  'Auditor': 'faculty',
  'Exams': 'faculty',
};

// ---------------------------------------------------------------------------
// 5. PERMISSION MATRIX
//    One entry per (screen, role) pair that has access. Omitted role keys
//    on a screen default to 'none'. `note` carries the qualifier text from
//    the Excel cell so nothing is lost in translation.
// ---------------------------------------------------------------------------

export interface PermissionEntry {
  access: AccessLevel;
  note?: string;
}

export type ScreenPermissions = Partial<Record<Role, PermissionEntry>>;

export const PERMISSIONS: Record<Screen, ScreenPermissions> = {

  'Dashboard': {
    'Lecturer':         { access: 'view' },
    'HOD':               { access: 'view' },
    'Deputy Dean':        { access: 'view' },
    'Executive Dean':      { access: 'view' },
    'DVC: T&L':            { access: 'view' },
    'QPO':                  { access: 'view' },
    'CQPA':                  { access: 'view' },
    'Auditor':                { access: 'view' },
    'Exams': {
      access: 'view_print',
      note: 'GATED — see GATE_RULES["Dashboard"]. Only visible once module ' +
            'file uploads AND the exam paper upload are both complete. ' +
            'Do not show even if the paper itself has been uploaded, until ' +
            'both prerequisites are satisfied.',
    },
  },

  'My Modules': {
    'Lecturer': { access: 'upload_view' },
    'HOD':       { access: 'assign_view' },
  },

  'File Vault': {
    'Faculty Admin': {
      access: 'assign_view',
      note: 'Ensure accuracy and consistency of QPO upload.',
    },
    'Lecturer':              { access: 'upload_view' },
    'Programme Coordinator':  { access: 'assign_view' },
    'HOD':                     { access: 'assign_view' },
    'QPO': {
      access: 'view',
      note: 'Updates what should be submitted based on CQPA guidelines, ' +
            'to ensure consistency across the institution.',
    },
  },

  'Exam Vault': {
    'Lecturer':             { access: 'upload_view' },
    'Programme Coordinator': { access: 'assign_view' },
    'HOD':                    { access: 'assign_view' },
    'Exams':                   { access: 'view_print' },
  },

  'Student Evaluations': {
    'Lecturer':             { access: 'upload_view' },
    'Programme Coordinator': { access: 'assign_view' },
    'HOD':                    { access: 'assign_view' },
  },

  // NOTE: System Alerts access here governs who can VIEW/CONFIGURE the
  // alert screen. The actual escalation timing logic lives in
  // ALERT_ESCALATION_RULES below — keep the two in sync if you edit one.
  'System Alerts': {
    'Lecturer':             { access: 'upload_view', note: 'Sends reminders/alerts: 2 weeks prior, 1 week prior, 2 days prior, then daily once overdue.' },
    'Programme Coordinator': { access: 'assign_view', note: 'Sends alerts: 2 days prior, then daily once overdue.' },
    'HOD':                    { access: 'assign_view', note: 'Sends alerts at 1 week overdue.' },
    'Deputy Dean':             { access: 'view', note: 'Sends alerts at 2 weeks overdue.' },
    'Executive Dean':           { access: 'view', note: 'Sends alerts at 4 weeks overdue.' },
    'DVC: T&L':                   { access: 'view', note: 'Sends alerts at 6 weeks overdue.' },
  },

  'Compliance Engine': {
    'Faculty Admin':          { access: 'assign_view' },
    'Programme Coordinator':   { access: 'assign_view' },
    'HOD':                       { access: 'assign_view' },
  },

  'Module Mapping': {
    'Faculty Admin':          { access: 'assign_view' },
    'Programme Coordinator':   { access: 'assign_view' },
    'HOD':                       { access: 'assign_view' },
  },

  'Staff & Roles Management': {
    'Faculty Admin':          { access: 'assign_view' },
    'Programme Coordinator':   { access: 'assign_view' },
    'HOD':                       { access: 'assign_view' },
  },

  'Executive Analytics': {
    'Programme Coordinator': { access: 'assign_view' },
    'HOD':                    { access: 'assign_view' },
    'Deputy Dean':             { access: 'view' },
    'Executive Dean':          { access: 'view' },
    'DVC: T&L':                  { access: 'view' },
    'QPO':                        { access: 'view' },
    'CQPA':                        { access: 'view' },
    'Auditor':                      { access: 'view' },
  },

  'Student Evaluations (Aggregate)': {
    'Lecturer': {
      access: 'view',
      note: 'View results only; completes own Personal Development Plan.',
    },
    'Programme Coordinator': {
      access: 'view',
      note: 'View only; views Personal Development Plan.',
    },
    'HOD': {
      access: 'view',
      note: 'View only; signs off on Personal Development Plan.',
    },
    'Deputy Dean':     { access: 'view' },
    'Executive Dean':  { access: 'view' },
    'DVC: T&L':          { access: 'view' },
    'QPO': {
      access: 'upload_view',
      note: 'Uploads template and views results.',
    },
    'CQPA':   { access: 'view' },
    'Auditor': { access: 'view' },
  },

  'Exam Vault Control': {
    'Exams': { access: 'view_print' },
  },

  'Status Management': {
    'Exams': { access: 'view_print' },
  },

  'Location Association': {
    'Exams': {
      access: 'view_print',
      note: 'DEPRECATION FLAG: marked in source matrix as "Think this can ' +
            'be deleted…" — confirm with Olive before removing this screen ' +
            'from navigation.',
    },
  },

  'Strategic Dashboard': {
    'Lecturer':             { access: 'view' },
    'Programme Coordinator': { access: 'view' },
    'HOD':                    { access: 'view' },
    'Deputy Dean':             { access: 'view' },
    'Executive Dean':           { access: 'view' },
    'DVC: T&L':                   { access: 'view' },
    'QPO':                         { access: 'view' },
    'CQPA':                         { access: 'view' },
    'Auditor':                       { access: 'view' },
    'Exams':                          { access: 'view_print' },
  },

  'Student Survey Reviews': {
    'Lecturer':             { access: 'view' },
    'Programme Coordinator': { access: 'view' },
    'HOD':                    { access: 'view' },
    'Deputy Dean':             { access: 'view' },
    'Executive Dean':           { access: 'view' },
    'DVC: T&L':                   { access: 'view' },
    'QPO':                         { access: 'view' },
    'CQPA':                         { access: 'view' },
    'Auditor':                       { access: 'view' },
  },

  'Compliance Portfolios': {
    'HOD':           { access: 'view' },
    'Deputy Dean':     { access: 'view' },
    'Executive Dean':   { access: 'view' },
    'DVC: T&L':            { access: 'view' },
    'QPO':                   { access: 'view' },
    'CQPA':                   { access: 'view' },
    'Auditor':                 { access: 'view' },
    'Exams':                    { access: 'view_print' },
  },
};

// ---------------------------------------------------------------------------
// 6. GATES
//    Per-record readiness checks that sit IN FRONT OF a permission check.
//    A role can have full screen permission and still see nothing/blocked
//    content until the gate condition passes for that specific record.
// ---------------------------------------------------------------------------

export interface GateRule {
  screen: Screen;
  appliesToRole: Role;
  description: string;
  // Pseudocode contract Gemini should implement as an actual function,
  // e.g. (module: Module) => boolean
  condition: string;
}

export const GATE_RULES: GateRule[] = [
  {
    screen: 'Dashboard',
    appliesToRole: 'Exams',
    description:
      'Exams cannot see/access an exam paper, even if it has been ' +
      'uploaded, until the module file requirements AND the exam paper ' +
      'upload are both marked complete for that module.',
    condition:
      'moduleFile.status === "complete" && examPaper.status === "uploaded"',
  },
];

// ---------------------------------------------------------------------------
// 7. ALERT ESCALATION ENGINE
//    Drives the "System Alerts" / "Unified Alert Center" screen. Each role
//    has a distinct trigger offset relative to a due date. Implement as a
//    scheduled job that walks open items and fires the right tier.
// ---------------------------------------------------------------------------

export interface EscalationRule {
  role: Role;
  tier: number;
  trigger: string; // human-readable offset from due date
}

export const ALERT_ESCALATION_RULES: EscalationRule[] = [
  { role: 'Lecturer',             tier: 1, trigger: '2 weeks prior, 1 week prior, 2 days prior, then daily once overdue' },
  { role: 'Programme Coordinator', tier: 1, trigger: '2 days prior, then daily once overdue' },
  { role: 'HOD',                    tier: 2, trigger: '1 week overdue' },
  { role: 'Deputy Dean',              tier: 3, trigger: '2 weeks overdue' },
  { role: 'Executive Dean',            tier: 3, trigger: '4 weeks overdue' },
  { role: 'DVC: T&L',                    tier: 4, trigger: '6 weeks overdue' },
];

// ---------------------------------------------------------------------------
// 8. ORG-STRUCTURE ASSIGNMENT (admin subsystem, not a permission)
//    Captures the matrix footnotes on what Faculty Admin/HOD must be able
//    to assign elsewhere in the app. This is data entry that CREATES the
//    hierarchy SCOPE_RULES filters against — model as its own admin screen,
//    not as an access-matrix row.
// ---------------------------------------------------------------------------

export const ASSIGNABLE_ENTITIES = [
  'Faculty',
  'Department',
  'Programme',
  'Module',
  'HOD',
  'Programme Coordinator',
  'Due Dates',
  'Authorised Exam Department',
] as const;

// ---------------------------------------------------------------------------
// 9. AI-POPULATED METADATA (Gemini enrichment, not a permission)
//    One-way enrichment fields Gemini derives from the module descriptor.
//    Not access-gated by role — surfaced wherever module metadata renders.
// ---------------------------------------------------------------------------

export const AI_ENRICHED_FIELDS = [
  'Learning Outcomes',
  'Type of Assessment',
  'NQF Level',
  'Programme',
  'Module Code',
  'Module Name',
] as const;

// ---------------------------------------------------------------------------
// 10. LOOKUP HELPERS
//     What every screen component should actually call.
// ---------------------------------------------------------------------------

export function getPermission(role: Role, screen: Screen): PermissionEntry {
  return PERMISSIONS[screen]?.[role] ?? { access: 'none' };
}

export function canAccess(role: Role, screen: Screen): boolean {
  return getPermission(role, screen).access !== 'none';
}

export function canUpload(role: Role, screen: Screen): boolean {
  return getPermission(role, screen).access === 'upload_view';
}

export function canAssign(role: Role, screen: Screen): boolean {
  return getPermission(role, screen).access === 'assign_view';
}

export function canPrint(role: Role, screen: Screen): boolean {
  return getPermission(role, screen).access === 'view_print';
}

export function getScope(role: Role): Scope {
  return SCOPE_RULES[role];
}

export function getGatesFor(screen: Screen): GateRule[] {
  return GATE_RULES.filter((g) => g.screen === screen);
}

export function getEscalationRule(role: Role): EscalationRule | undefined {
  return ALERT_ESCALATION_RULES.find((r) => r.role === role);
}

// ---------------------------------------------------------------------------
// 11. NAVIGATION VISIBILITY
//     Convenience export for building the sidebar dynamically per role,
//     matching the VaultIQ left-nav (Dashboard, My Modules, File Vault,
//     Alerts, Compliance Engine, Module Mapping, Staff & Roles,
//     Architecture & Stats, Secure Exit).
// ---------------------------------------------------------------------------

export function getVisibleScreensForRole(role: Role): Screen[] {
  return (Object.keys(PERMISSIONS) as Screen[]).filter((screen) =>
    canAccess(role, screen)
  );
}

// ---------------------------------------------------------------------------
// 12. ROLE MAPPING HELPER
//     Maps developer-facing UserRole enum from types.ts to the xlsx schema roles.
// ---------------------------------------------------------------------------

export function mapUserRoleToRole(userRole: string): Role {
  switch (userRole) {
    case 'LECTURER':
    case 'INTERNAL_MODERATOR':
    case 'EXTERNAL_MODERATOR':
      return 'Lecturer';
    case 'HOD':
      return 'HOD';
    case 'FACULTY_ADMIN':
      return 'Faculty Admin';
    case 'DEPUTY_DEAN':
      return 'Deputy Dean';
    case 'EXECUTIVE_DEAN':
      return 'Executive Dean';
    case 'DVC_TL':
      return 'DVC: T&L';
    case 'CQPA':
      return 'CQPA';
    case 'QPO':
      return 'QPO';
    case 'AUDITOR':
      return 'Auditor';
    case 'EXAMS':
      return 'Exams';
    case 'PROGRAMME_COORDINATOR':
      return 'Programme Coordinator';
    default:
      // Try exact string match if possible, fallback to Lecturer
      return (ROLES.includes(userRole as Role) ? (userRole as Role) : 'Lecturer');
  }
}

export function filterModulesByScope(modules: any[], profile: any): any[] {
  if (!profile) return [];
  const role = mapUserRoleToRole(profile.role);
  const scope = getScope(role);
  
  if (scope === 'own') {
    return modules.filter(m => 
      m.lecturerUids?.includes(profile.displayName) || 
      m.lecturerUids?.includes(profile.uid) || 
      m.lecturerUids?.includes(profile.email)
    );
  }
  if (scope === 'assigned') {
    return modules.filter(m => 
      profile.assignedModules?.includes(m.id) || 
      profile.assignedModules?.includes(m.code) ||
      m.lecturerUids?.includes(profile.displayName)
    );
  }
  if (scope === 'department') {
    return modules.filter(m => m.departmentId === profile.departmentId);
  }
  // 'faculty'
  return modules;
}

