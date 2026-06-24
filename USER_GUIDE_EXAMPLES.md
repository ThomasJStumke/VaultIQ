# VaultIQ: Global Scenario Walkthroughs

This document provides concrete "Input/Output" examples for every core system process in VaultIQ.

---

## Scenario A: The Lecturer Upload (Evidence Ingress)
**User:** Dr. Sarah Jenkins (Lecturer)
**Module:** ENG101 (Software Engineering)

### 1. Input: File Selection
- **Action:** Dr. Jenkins drags `My_Study_Guide_v2.docx` into the uploader.
- **Category Selected:** `CURRICULUM`.

### 2. The VaultIQ Automated Naming & Pathing
- **Engine Input:** `{FACULTY: 'SCIENCE', DEPT: 'CS', PROG: 'BSC_CS', MODULE: 'ENG101', YEAR: 2026, SEM: 1}`
- **System Output:** 
  - **Storage Path:** `vault://SCIENCE/CS/BSC_CS/ENG101/2026/S1/CURRICULUM/`
  - **New Filename:** `ENG101_2026_S1_CURRIC_v2_1684152000.pdf` (Auto-converted to PDF).

### 3. Gemini AI Validation Logic
- **AI Prompt:** "Validate if this is an NQF Level 7 Study Guide for ENG101."
- **AI Internal Output (JSON):**
```json
{
  "isCorrectType": true,
  "confidence": 94,
  "hasSignature": false,
  "extractedCode": "ENG101",
  "feedback": [
    "Module code match confirmed.",
    "NQF Level 7 descriptors found.",
    "WARNING: Mandatory 'Assessment Weighting' table not detected in Chapter 4."
  ],
  "status": "PARTIAL"
}
```
- **User Feedback UI:** "⚠️ **Partial Approval.** Document recognized as ENG101 Study Guide, but the Assessment Table is missing. Status set to PENDING."

---

## Scenario B: The HoD Escalation (Governance)
**User:** Prof. Michael Chen (HoD: Computer Science)

### 1. Input: The Departmental Heatmap
- **Visual Input:** Prof. Chen sees a **Red Cell** for module `MAT202` under the `MODERATION` column.
- **Drill-down Action:** Clicks the cell.

### 2. System Intelligence Output
- **Audit Detail:** "Module MAT202 is 14 days overdue for 'Internal Moderator Report'. Lecturer has been notified 3 times. No response detected (Stagnant Risk)."
- **HoD Action:** Clicks "Trigger Governance Citation".

### 3. Automated Output
- **Result:** An official **Level 2 Non-Compliance Citation** is PDF-generated and emailed to the Faculty Dean and the Lecturer.

---

## Scenario C: The Executive Audit (DVC)
**User:** DVC: Teaching & Learning

### 1. Strategic Request
- **Input:** "Generate institutional health report for the 2026 S1 Audit."

### 2. Analytics Aggregation
- **Data Input:** Aggregates 1,200 modules across 8 faculties.
- **Analytics Output:**
  - **Global Score:** 78.4%
  - **Risk Heatmap:** Faculty of Law is at 45% (High Risk) due to missing External Moderation reports in 4th-year modules.
  - **Predictive Insight:** "AI predicts Law Faculty will fail national accreditation in June if the current upload velocity does not double."

---

## Scenario D: Document Retention (Maintenance)
**Trigger:** Academic Year End (Dec 2026)

### 1. Policy Evaluation
- **Input:** Every file in the `2023` directory (3 years old).
- **Rule:** Check if `ACTIVE_AUDIT` flag is `false`.

### 2. Execution
- **System Action:** Move files from `Active` storage to `Cold Glacier` archives with a "Restricted" access token.
- **Log Entry:** "3,402 artifacts from 2023 purged from hot storage. SHA-256 hashes archived for integrity."
