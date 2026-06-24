# VaultIQ: AI Document Validation System

## 1. AI Workflow & Pipeline
VaultIQ multi-modal AI pipeline uses Gemini to perform deep structural and semantic analysis of academic artifacts.

### The Pipeline:
1. **Ingress:** File is uploaded via `EvidenceUploader`.
2. **Preprocessing:** PDF/Word/Image is converted to base64 or passed directly to Gemini if within token limits.
3. **Multi-Modal Analysis:** Gemini 3 Flash analyzes the content (OCR + Visual Layout + NLP).
4. **Validation:** 
   - **Type Check:** Is this a "Module Outline" or just a syllabus?
   - **Entity Extraction:** Does it reference the correct Module Code (e.g., `ENG101`) and Year (`2026`)?
   - **Integrity Check:** Is it a blank page? Is it a duplicate of another file (hash check)?
   - **Structural Analysis:** Are mandatory sections (Learning Outcomes, Assessment Breakdown, Bibliography) present?
   - **Signature Detection:** Does the Moderation Report contain a handwritten or digital signature?
5. **Scoring:** AI returns a Confidence Score (0-100) and an Approval Status.
6. **Feedback:** Instant, actionable feedback is returned to the Lecturer.

---

## 2. Confidence Scoring Logic
The system does not simply return "Yes/No". It provides a Weighted Confidence Score:

- **Identity (40%):** Correct Module Code, Faculty, and Year.
- **Completeness (30%):** Presence of all required regulatory sections.
- **Authenticity (30%):** Detects signatures, timestamps, and professional formatting.

**Thresholds:**
- **> 90%:** Auto-Approved and moved to `COMPLIANT`.
- **70 - 89%:** `NEEDS_REVIEW` - Flagged for HoD to check specific missing sections.
- **< 70%:** `REJECTED` - Instant feedback list generated for the Lecturer.

---

## 3. Example Prompts for Gemini AI

### Prompt: Moderation Report Validation
```text
You are an expert academic auditor. Analyze the attached document for Module [CODE].
1. Identify if this is a "Moderation Report".
2. Is there a visible signature in the "Internal Moderator" section?
3. What is the moderation outcome? (Pass/Fail/Corrections)
4. Are there handwritten comments in the margins?
5. Verify that the module code mentioned in the text matches [CODE].

Return JSON: 
{ 
  "is_correct_type": boolean, 
  "confidence": number, 
  "has_signature": boolean, 
  "extracted_code": string, 
  "feedback": string[],
  "handwritten_notes_detected": boolean
}
```

### Prompt: Exam Paper Security Check
```text
Analyze this Exam Paper.
1. Does it contain the University logo?
2. Is the date for the 2026 academic year?
3. Is information missing in the "Instructions to Candidates" block?
4. Does this match a previously seen exam for this module? (Look for high semantic similarity).
5. Detect if the file is a blank submission or purely placeholder text.
```

---

## 4. User Feedback Examples

### Success:
> "✅ AI Validation Successful (98%). Module ENG101 Syllabus confirmed. All 12 mandatory sections detected. Signed by Department Head."

### Warning:
> "⚠️ Minor Issues (74%). This looks like a project brief, but the 'Rubric' section is missing. Please ensure your assessment includes a marking breakdown before final submission."

### Critical Failure:
> "❌ Rejected (22%). This document appears to be an empty template. Module code 'MAT202' was expected, but 'ABC_TEMPLATE' was found. Please upload the finalized version."
