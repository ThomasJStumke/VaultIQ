# VaultIQ: Admin Governance & Dynamic Rule Management

## 1. Governance Configuration
VaultIQ decouples academic policy from application logic. All compliance requirements are stored in the `requirement_templates` collection in Firestore.

### How to Modify Requirements (No-Code)
Administrators with the `DVC` or `CQPA` role can use the **Governance Settings** panel to:
1. **CREATE**: Add a new requirement (e.g., "COVID-19 Safety Protocol").
2. **TAG**: Assign metadata tags (e.g., `Category: CURRICULUM`, `Type: MANDATORY`).
3. **EXPIRE**: Flag old requirements as "Legacy" (they remain in the database for historical audits but aren't required for new modules).
4. **OFFSET**: Change deadlines relative to the Academic Calendar (e.g., moving "Study Guide" deadline from T-30 to T-14).

---

## 2. Dynamic Requirement Slots
When a module is created, the **Compliance Engine** joins the `module_metadata` with the `requirement_templates`.

**Example SQL-Logic (Abstracted):**
```sql
SELECT * FROM requirement_templates 
WHERE applies_to = 'ALL' 
OR (applies_to = 'EXIT_LEVEL' AND module.is_exit = true)
OR (applies_to = 'LAB_BASED' AND module.type = 'PHYSICAL_SCIENCE')
```

---

## 3. Mandatory Artifacts (Directly from University Records)
The following documents are now part of the global baseline template:

### General & Teaching
- **Weekly Schedule**: Visible on office door / Staff-Student timetable.
- **Consultation Proof**: Evidence of 2x face-to-face consultation days.
- **Communication Plans**: Proof of student communication channels.
- **Resource Adequacy**: Assessment of online platforms and tools.

### Moderation & Quality
- **Moderator Registry**: Name, affiliation, and contact of Internal/External moderators.
- **Moderated Scripts**: Exemplars of Good, Average, and Below Average work.
- **Handwritten Feedback**: OCR detection enabled for handwritten moderation comments.

### Results & Completion
- **DP List**: Excel export of student "Duly Performed" status.
- **Final Marks Gradebook**: Full class list with results and averages.
