# VaultIQ: Automated Workflow & Escalation Engine

## 1. The Escalation Matrix (The "Seven-Seal" Protocol)
VaultIQ ensures academic governance through a temporal escalation engine. When a mandatory artifact (e.g., "Exam Moderation Report") misses its deadline, the following automated chain triggers:

| Time Delta | Recipient | Channel | Payload |
|------------|-----------|---------|---------|
| **Day 0** | Lecturer | Dashboard + Email | **Immediate Action Required:** Artifact overdue. |
| **Day +3** | HoD | Dashboard + Email | **Governance Alert:** Lecturer [NAME] has failed to submit. |
| **Day +7** | Dean | Email + WhatsApp | **Compliance Warning:** Department [DEPT] risk level increased. |
| **Day +14**| DVC | Executive Report | **Critical Failure:** Module [CODE] flagged for Senate review. |

---

## 2. Technical Architecture: How it Works
The workflow is powered by the **Temporal Observer Pattern** running on a 24-hour cron cycle.

### A. The "Deadline Observer"
- **Query:** Scans `module_requirements` where `status == 'MISSING'`.
- **Logic:** Compares `dueDate` vs `currentServerDate`.
- **Action:** If `currentDate > dueDate`, it increments the `escalationTier` (1-4).

### B. The Communication Dispatcher
- **Tier 1 (Lecturer):** Triggers a "Soft" notification. Simple reminder.
- **Tier 2 (HoD):** Triggers a "Tactical" notification. Includes a "Request Meeting" button.
- **Tier 3 (Dean):** Triggers a "Strategic" alert. Generates a Faculty Risk Profile.
- **Tier 4 (DVC):** Triggers a "Governance Audit". Automatically prepares a Senate Submission pack.

---

## 3. Communication Channels
### Dashboard Alerts (Real-Time)
- Persistent red banners for overdue items.
- Pulsing "Critical" markers on the module list.

### Email System (Institutional)
- **Subject:** `[VaultIQ ALERT] Critical Compliance Failure: AUDB201`
- **Body:** Contains direct upload link + Audit impact summary.

### WhatsApp Bridge (Optional)
- **Usage:** Reserved for T+7 and T+14 escalations.
- **Payload:** "Module AUDB201 is 14 days overdue. Strategic risk detected. Reply 'STATUS' for details."

---

## 4. Compliance Summaries
Every Monday at 08:00 AM, the system generates a **Monday Morning Audit**:
- **HoDs:** Status of their department.
- **Deans:** Ranking of their schools.
- **DVC:** Institutional "Compliance Yield" for the month.
