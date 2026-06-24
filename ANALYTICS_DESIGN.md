# VaultIQ: Analytics & Reporting Ecosystem

## 1. Role-Based Analytics Architecture
VaultIQ provides specialized viewpoints for each tier of the academic hierarchy.

### A. The Lecturer Dashboard (Tactical)
**Goal:** personal pipeline management and deadline mitigation.
- **My Compliance %:** Average across all modules assigned.
- **Action Queue:** Direct links to missing artifacts (e.g., "Upload Study Guide for ENG101 - Due in 2 days").
- **AI Feedback Feed:** Recent rejects with specific "Fix" instructions.

### B. The HoD Dashboard (Operational)
**Goal:** Departmental health and moderation oversight.
- **Compliance Heatmap:** Grid view of all modules vs. all requirements.
  - Green check = Compliant.
  - Amber clock = Pending/Moderation.
  - Red X = Overdue.
- **Moderation Velocity:** Rate at which scripts are being reviewed.
- **Risk Table:** Modules with <50% compliance as we approach Exam Season.

### C. The Executive Dean / Deputy Dean (Strategic)
**Goal:** Faculty performance and inter-departmental ranking.
- **Faculty Rankings:** Scorecard comparing School of Engineering vs. School of IT.
- **Aggregate Risk Count:** Total number of non-compliant modules in the faculty.
- **DVC-Readiness:** % of modules ready for the final PRE-review audit.

### D. Central Governance (CQPA / QPO / DVC)
**Goal:** Institutional audit readiness and policy effectiveness.
- **Institutional Compliance Index:** Single score for the whole university.
- **Systemic Bottlenecks:** Identification of "Most Failed Requirement" (e.g., "70% of modules fail at Communication Plans").
- **Audit Logging:** Tamper-proof trail of who approved what and when.

---

## 2. Reporting Workflows

### The PRE-Review Pack Generation
A "PRE-review Pack" is a consolidated digital dossier required before an academic committee review.
- **Auto-Assembly:** The system zips all "APPROVED" artifacts for a specific module.
- **Cover Page:** AI generates a summary of the compliance journey (Audit trail + AI Confidence averages).
- **Watermarking:** Every page is digitally signed with the Artifact Token.

### Predictive Risk Analytics
The system tracks "Compliance Velocity" (speed of uploads over time).
- **Risk Indicators:**
  - **The "Stagnant" Flag:** No uploads for 14 days on a non-compliant module.
  - **The "High-Reject" Flag:** Module has >3 consecutive AI rejections.
  - **The "Deadline Drift":** Historical data suggests this lecturer usually misses the Exam Moderation deadline.

---

## 3. Implementation Plan
1. **Dynamic Stats Service:** A service to calculate percentages from the Firestore collections.
2. **Heatmap Component:** A visual grid using colored cells for department views.
3. **Role-Switching UI:** Allow admins to see "As HoD" or "As Dean" view.
