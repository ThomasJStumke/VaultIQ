# VaultIQ

## What it is
VaultIQ is an academic compliance and governance platform for university faculties. It tracks whether every teaching module has the evidence artifacts (study guides, marking rubrics, moderation reports, exam papers, attendance registers, etc.) required by institutional policy, and automates the workflow of collecting, validating, and escalating that evidence.

## Core domains (from `src/`)
- **Compliance Rules Engine** (`ComplianceEngine.tsx`, `COMPLIANCE_ENGINE.md`) — a requirement matrix that derives mandatory artifacts per module from attributes (level, assessment type, delivery mode, credit weight) and drives status (`AT_RISK`, escalation, etc.) off relative academic-calendar offsets.
- **RBAC** (`RBAC_DESIGN.md`) — Zero-Trust/ABAC tiered roles: Lecturer → HOD → Faculty Administrator → Executive Dean → DVC/CQPA (governance admin), each with different view/upload/approval/reporting rights.
- **Evidence Uploader / File Vault / Exam Vault** (`EvidenceUploader.tsx`, `FileVault.tsx`, `ExamVault.tsx`) — artifact upload, cryptographic-hash-gated exam paper storage, module-level document management.
- **Staff Management** (`StaffManagement.tsx`) — provisioning academic staff accounts, roles, bulk import via CSV/XLSX.
- **Student Evaluations** (`StudentEvaluations.tsx`) — module evaluation questionnaires and corrective/developmental action tracking (CQPA mandates).
- **Executive Analytics** (`ExecutiveAnalytics.tsx`) — faculty-wide compliance/risk dashboards for leadership.
- **Report Generation** (`AutomatedReportingEngine.tsx`, `ReportGeneratorEngine.tsx`, `lib/reportGenerators.ts`) — audit-readiness report generation (PDF/Excel).
- **Survey Management** (`SurveyManagement.tsx`, `PublicSurveyResponse.tsx`) — QPO-restricted distribution of institutional questionnaires.
- **Admin Governance** (`ADMIN_GOVERNANCE.md`) — no-code editing of requirement templates by DVC/CQPA roles.

## Audience
University academics and administrators across the compliance hierarchy — not a general SaaS audience. Copy and UI density should read as institutional/governance tooling, not a generic consumer dashboard.

## Non-goals of this pass
This document describes what already exists; it does not propose new features. RBAC, compliance rule logic, and data layer are out of scope for presentation-only work.
