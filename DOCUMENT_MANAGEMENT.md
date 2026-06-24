# VaultIQ: Document Management & File Topology

## 1. Automated Folder Hierarchy
VaultIQ enforces a strict, logical directory structure to ensure audit readiness. Folders are automatically provisioned based on the academic metadata.

### Root Path Structure
`vault://{FACULTY}/{DEPARTMENT}/{PROGRAMME}/{MODULE_CODE}/{YEAR}/{SEMESTER}/{CATEGORY}/`

### Canonical Example
`vault://SCIENCE/CS/BSC_CS/ENG101/2026/S1/ASSESSMENTS/ENG101_2026_S1_EXAM_v1_FINAL.pdf`

---

## 2. Document Categorization
Files are tagged with metadata and sorted into specific functional categories:

| Category | Primary Content | Retention Policy | Access Level |
|----------|-----------------|------------------|--------------|
| `CURRICULUM` | Syllabi, Study Guides, Learning Material | 5 Years | All Stakeholders |
| `ASSESSMENTS` | Exam Papers, Tests, Project Briefs | 3 Years (Immutable) | Staff + Internal Moderators |
| `MODERATION` | Quality Reports, Variance Analysis | 7 Years | Global Governance Roles |
| `EVIDENCE` | Samples of Student Work / Scripts | 3 Years | External Moderators |
| `COMPLIANCE` | Signed certificates, Audit trail exports | Permanent | Auditors |

---

## 3. Version Control & Naming Conventions
VaultIQ uses a **Sequential Versioning Pattern**.

### Naming Pattern:
`{MODULE}_{YEAR}_{SEM}_{CAT}_{VERSION}_{TIMESTAMP}.{EXT}`

- **Rule:** Users cannot "overwrite" files. Every upload creates a new version (e.g., `_v1`, `_v2`).
- **Rule:** The system automatically marks the latest successful PDF conversion as the `PRIMARY_ARTIFACT`.

---

## 4. Retention & Archiving Workflow
1. **Active Phase (Current Sem):** Read/Write access for Lecturers.
2. **Read-Only Phase (Sem + 1):** Locked for moderation and audit prep.
3. **Archived Phase (Sem + 2 to 3 Years):** Moved to Cold Storage (IA).
4. **Purge Phase (Year 4):** Automated cryptographic shredding unless flagged for an active audit.

---

## 5. Security & Encryption
- **Encryption at Rest:** AES-256 via Cloud Storage benchmarks.
- **Access Control:** Storage buckets utilize "Fine-grained Access" controlled via unique tokens (Signed URLs).
- **Integrity Checks:** SHA-256 hashing on upload to verify file hasn't been tampered with since creation.
- **Isolation:** Exam papers are stored in a physically separate "High-Security" bucket with no public internet ingress.
