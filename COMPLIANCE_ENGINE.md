# VaultIQ: Compliance Rules Engine (CRE)

## 1. Compliance Logic Architecture
The CRE operates as a state machine that evaluates the "Academic Health" of a module by comparing current artifacts against a dynamic requirement matrix.

### Requirement Matrix
Requirements are determined by a combination of attributes:

| Attribute | Impact on Requirements |
|-----------|------------------------|
| **Module Level** | UG requires 1 moderation report; PG requires 2 (Internal + External). |
| **Assessment Type** | `EXAM_BASED` mandates Secure Exam Script upload; `CONTINUOUS` mandates Rubric upload. |
| **Delivery Mode** | `ONLINE` mandates a "Digital Engagement Report"; `F2F` mandates "Attendance Register". |
| **Credit Weight** | >20 Credits mandates a "Formal Variance Analysis". |

---

## 2. Workflow Automation
VaultIQ automates the progression of an artifact through its lifecycle.

1. **Trigger:** Module metadata update (e.g., changing from S1 to S2).
2. **Analysis:** CRE identifies $N$ mandatory slots (e.g., "Study Guide", "Marking Rubric").
3. **Notification:** Lecturer receives a tailored task list.
4. **Validation:** Upon upload, AI validates if the document "looks like" a Study Guide (NLP check).
5. **Auto-Escalation:** If a document is missing T-14 days from the semester start, the status shifts to `AT_RISK`.

---

## 3. Deadline Handling & Temporal Logic
VaultIQ uses **Relative Academic Offsets** rather than fixed dates.

- **Baseline:** `SEMESTER_START_DATE` (SSD)
- **T-30:** Deadline for Study Guide & Syllabus.
- **T-14:** Deadline for First Assessment Task.
- **E-7:** (Exam Start - 7 Days) Deadline for Moderated Exam Paper.
- **P+14:** (Post Exam + 14 Days) Deadline for Final Moderated Results.

---

## 4. Escalation Hierarchy
When a compliance rule is violated, VaultIQ triggers a multi-stage escalation:

1. **Level 0 (Warning):** In-app notification to Lecturer (Daily).
2. **Level 1 (Notice of Non-Compliance):** Email to Lecturer + HoD (T+2 after deadline).
3. **Level 2 (Compliance Citation):** Automated report sent to Faculty Admin + Dean (T+7).
4. **Level 3 (Governance Block):** Module results are "Blocked" from publishing until resolved (T+14).

---

## 5. Compliance Scores
Scores are calculated out of 100 per module:
- **Foundational (40%):** Syllabus, Study Guide, Staff Allocation.
- **Assessment (30%):** Validated rubrics and task briefs.
- **Quality (30%):** Signed moderation reports and variance logs.

**Example Calculation:**
- Module ENG101: Has Syllabus (10), Study Guide (10), Rubrics (20), but MISSING Moderation (-30).
- **Current Score: 60 (PENDING)**
