# VaultIQ: Secure Examination Management Protocol

## 1. Cryptographic Security & Storage
Exams are classified as **Level 4: Critical Assets**. They are stored using a "Zero-Trust" isolation model.

### Storage Isolation
- **Physical Separation:** Exams are NOT stored in the general evidence bucket. They reside in a specialized **Encrypted Exam Vault** with no public ingress.
- **Encryption at Rest:** AES-256 GCM (Galois/Counter Mode) with keys managed by a Hardware Security Module (HSM).
- **Double Envelope:** Each exam is individually encrypted with a uniquely generated "Artifact Key" which is then encrypted by the master "Vault Key".

---

## 2. Access Control & Timed Release
Access is governed by the **Temporal RBAC** (Role-Based Access Control) engine.

- **Pre-Exam Phase:** Only the Lecturer and HoD can access for drafting.
- **Moderation Phase:** Moderator access is granted via a T-minus relative trigger (e.g., Exam Date - 21 Days).
- **Exam Window:** Access is strictly locked 2 hours before the start to prevent last-minute digital leaks.
- **Signed URLs:** Users never get a permanent link. They receive a **Single-Use Signed URL** that expires in 300 seconds.

---

## 3. Leak Prevention & Defensive Watermarking
VaultIQ implements **Dynamic Identity Projection** on all viewed PDF artifacts.

- **Traceable Watermarking:** Every page of a downloaded exam is overlayed with the **Accessor's Name, Email, IP Address, and Timestamp** in semi-transparent text.
- **Digital Fingerprinting:** An invisible cryptographic "bait" is embedded in the PDF metadata. If the file is shared elsewhere, the system can trace the exact source of the leak based on the embedded ID.
- **Screenshot Protection:** The web-viewing component uses CSS/JS hooks to blur content if it detects standard screen-recording or snapshot tools (where browser permits).

---

## 4. Audit Logging (Immutable Ledger)
Every interaction with an exam is recorded in the **Governance Audit Log**.

| Action | Logged Data | Integrity |
|--------|-------------|-----------|
| `VIEW` | User ID, Device ID, Geo-Location, Duration | SHA-256 Hashed |
| `DOWNLOAD` | User ID, Client IP, Watermark ID | SHA-256 Hashed |
| `UPLOAD` | Version ID, Pre-Hash, Post-Hash | SHA-256 Hashed |

- **Rule:** Audit logs cannot be modified, even by the DVC or System Admin.
- **Rule:** Any "Download" action triggers a real-time notification to the Faculty Dean and HoD.

---

## 5. Cybersecurity Best Practices
- **Least Privilege:** Access is revoked immediately after the exam paper is finalized and sent to print.
- **Multi-Factor Authentication (MFA):** Re-authentication is required to initiate an Exam Download.
- **Threat Detection:** System flags "Unusual Access Patterns" (e.g., an HoD downloading 10 exams at 3:00 AM from a new IP).
