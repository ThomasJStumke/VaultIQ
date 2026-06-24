# VaultIQ: Role-Based Access Control (RBAC) Design

## 1. Security Philosophy
VaultIQ utilizes a **Zero Trust** architecture combined with **Attribute-Based Access Control (ABAC)**. Identity is validated at every node, and access is revoked instantly if compliance invariants are violated.

---

## 2. Role Definitions & Permissions

### LECTURER (Identity Tier 1)
- **View Rights:** Restricted to assigned modules (`assignedModules[]`).
- **Upload Rights:** Formal evidence artifacts (Syllabi, Study Guides, Assessment Tasks).
- **Approval Rights:** None.
- **Reporting:** Direct compliance status of their own modules.

### HOD (Head of Department - Tier 2)
- **View Rights:** All modules within their department ID.
- **Upload Rights:** Dept-level policy and moderation guidelines.
- **Approval Rights:** Can approve internal moderation results for the department.
- **Reporting:** Departmental risk scores and compliance aggregated views.

### FACULTY ADMINISTRATOR (Tier 3)
- **View Rights:** Cross-departmental view of faculty artifacts.
- **Upload Rights:** Official faculty calendars and administrative prerequisites.
- **Approval Rights:** Workflow progression (can manually trigger re-validation).
- **Reporting:** Faculty-wide audit readiness reports.

### EXECUTIVE DEAN (Tier 4)
- **View Rights:** High-level strategic dashboards.
- **Upload Rights:** None (Consumer of intelligence).
- **Approval Rights:** Final sign-off on faculty annual compliance reports.
- **Reporting:** Strategic risk assessment and year-on-year quality metrics.

### DVC: TEACHING & LEARNING (Tier 5)
- **View Rights:** Institutional-wide visibility (University Level).
- **Upload Rights:** National institutional policies.
- **Approval Rights:** Institutional-level governance reports.
- **Reporting:** Global university ranking metrics and national compliance audits.

### INTERNAL MODERATOR (Specialist Tier)
- **View Rights:** assigned modules + **Secure Exam Storage** access.
- **Upload Rights:** Moderation reports and variance analysis.
- **Approval Rights:** Determination of assessment validity (Pass/Fail moderation).
- **Reporting:** Student success variance vs assessment difficulty.

### EXTERNAL MODERATOR (Specialist Tier)
- **View Rights:** Final sample scripts and summative exam papers.
- **Upload Rights:** External Quality Assurance (EQA) Reports.
- **Approval Rights:** Certification of final moderation outcomes for external bodies.
- **Reporting:** Benchmarking reports against national standards.

### AUDITOR (Governance Tier)
- **View Rights:** Complete read-only access to all artifacts + **Audit Logs**.
- **Upload Rights:** Audit findings and non-compliance citations.
- **Approval Rights:** None.
- **Reporting:** Compliance exception reporting.

---

## 3. Secure Workflows

### Secure Exam Storage
Exam papers are encrypted and restricted to the **Lecturer** (Creator), **HoD** (Department Head), and **Moderators**. Access is logged with a mandatory justification field.

### Moderation Access Restrictions
Moderation records are immutable. Once an Internal Moderator uploads a report, the Lecturer can view but NOT edit the report. Only the HoD can resolve disputes by triggering a "Variance Review" workflow.

### Audit Visibility
Every single action (Logon, View Document, Download, Upload, Status Change) triggers an immutable entry in the `audit_logs` table. This provides a cryptographically verifiable trail for external accreditation bodies.

### Document Approval Workflow
1. **Upload** (Lecturer)
2. **AI Validation** (VaultIQ Agent) -> Status: `PENDING_REVIEW`
3. **Internal Review** (Moderator) -> Status: `MODERATED`
4. **Final Sign-off** (HoD) -> Status: `COMPLIANT`
