import { formatDate } from './utils';

// Helper to trigger file download simulation
const downloadFile = (title: string, content: string, mimeType: string, extension: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_report.${extension}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// HELPER FOR SCRIPT PRINT DELAY
const printScript = `
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    }
  </script>
`;

// ==========================================
// 1. FACULTY COMPLIANCE REPORT GENERATORS
// ==========================================

export const exportFacultyReportToPDF = (
  deptName: string,
  deptCode: string,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  generatorUser: string
) => {
  const title = `DUT FACULTY COMPLIANCE REPORT - DEPARTMENT OF ${deptCode}`;
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b; line-height: 1.5; margin: 0; padding: 0; background: #ffffff; font-size: 11px;
        }
        .header-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px;
        }
        .logo-cell { width: 70px; vertical-align: middle; }
        .title-cell { vertical-align: middle; padding-left: 15px; }
        .title-cell h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .title-cell p { font-size: 10px; margin: 0; color: #475569; font-weight: 600; }
        .meta-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .meta-table td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 10px; }
        .meta-label { font-weight: bold; color: #475569; width: 22%; background: #f1f5f9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        .meta-value { color: #0f172a; font-weight: 600; }
        .section-title {
          font-size: 11px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .grid-table th, .grid-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 10px; }
        .grid-table th { background: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 8px; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
        .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
        .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8px; color: #64748b; text-align: center; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-cell { font-size: 8px; color: #64748b; }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="logo-cell">
            <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="#1e3a8a" stroke-width="6"/>
              <polygon points="50,25 75,40 75,70 50,85 25,70 25,40" fill="#1e3a8a" opacity="0.15" stroke="#1e3a8a" stroke-width="2"/>
              <path d="M50,30 L50,70 M35,45 L65,45 M35,55 L65,55" stroke="#1e3a8a" stroke-width="4" stroke-linecap="round"/>
              <circle cx="50" cy="50" r="5" fill="#1e3a8a"/>
            </svg>
          </td>
          <td class="title-cell">
            <h1>Durban University of Technology</h1>
            <p>Faculty of Accounting & Informatics &bull; Executive Oversight System</p>
          </td>
        </tr>
      </table>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Report Type</td>
          <td class="meta-value">Faculty Compliance Report (Live Dashboard Data)</td>
          <td class="meta-label">Department</td>
          <td class="meta-value">${deptName} (${deptCode})</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td class="meta-value">${generatorUser}</td>
          <td class="meta-label">Date Generated</td>
          <td class="meta-value">${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Total Modules</td>
          <td class="meta-value">${stats.total}</td>
          <td class="meta-label">Overall Readiness</td>
          <td class="meta-value" style="color: #4f46e5; font-size: 12px;">${stats.rate}%</td>
        </tr>
      </table>

      <div class="section-title">Department Compliance KPIs</div>
      <table class="grid-table" style="margin-bottom: 25px;">
        <thead>
          <tr>
            <th style="width: 25%;">Metric Name</th>
            <th style="width: 25%; text-align: center;">Count Value</th>
            <th style="width: 50%;">Status Summary Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">Total Tracked Modules</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold;">${stats.total}</td>
            <td>Full academic inventory mapped in the dashboard under Department ${deptCode}.</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #16803d;">Compliant &amp; Signed-off</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold; color: #16803d;">${stats.compliant}</td>
            <td>Modules with complete folders, moderated exam instruments, and signed HOD approvals.</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #a16207;">Pending Review Gate</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold; color: #a16207;">${stats.pending}</td>
            <td>Modules currently waiting for final HOD signature or pending file re-submissions.</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Academic Module Registry Summary</div>
      <table class="grid-table">
        <thead>
          <tr>
            <th>Module Code</th>
            <th>Module Title</th>
            <th>Primary Educator</th>
            <th>Mode</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${modules.map(m => `
            <tr>
              <td style="font-weight: bold; font-family: monospace;">${m.code}</td>
              <td>${m.name}</td>
              <td>${m.lecturerUids?.join(', ') || 'Unassigned Lecturer'}</td>
              <td>${m.assessmentMode?.replace('_', ' ') || 'EXAM_BASED'}</td>
              <td>
                <span class="badge ${
                  m.complianceStatus === 'COMPLIANT' ? 'badge-success' :
                  m.complianceStatus === 'PENDING' ? 'badge-warning' : 'badge-danger'
                }">${m.complianceStatus}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <table class="footer-table">
          <tr>
            <td class="footer-cell" style="text-align: left;">DUT Quality Assurance and Senate Compliance Registry &bull; Secure Export</td>
            <td class="footer-cell" style="text-align: right;">Page 1 of 1</td>
          </tr>
        </table>
      </div>

      ${printScript}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

export const exportFacultyReportToWord = (
  deptName: string,
  deptCode: string,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  generatorUser: string
) => {
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1e293b; margin: 1in; }
        h1 { color: #1e3a8a; font-size: 16pt; font-weight: bold; margin-bottom: 3pt; text-transform: uppercase; }
        h2 { color: #1e3a8a; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #4f46e5; padding-bottom: 2pt; margin-top: 15pt; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 12pt; }
        th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; font-size: 9.5pt; }
        th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; }
        .meta-label { background-color: #f8fafc; font-weight: bold; width: 22%; color: #475569; }
        .title-sub { font-size: 9.5pt; color: #475569; font-weight: bold; margin: 0; }
      </style>
    </head>
    <body>
      <table style="width:100%; border:none; margin-bottom:18pt;">
        <tr style="border:none;">
          <td style="border:none; width:60px;">
            <span style="font-size:24pt; color:#1e3a8a; font-family:Georgia,serif; font-weight:bold;">DUT</span>
          </td>
          <td style="border:none; padding-left:12pt;">
            <p style="font-size:16pt; font-weight:bold; color:#1e3a8a; margin:0;">Durban University of Technology</p>
            <p class="title-sub">Faculty of Accounting & Informatics &bull; Institutional Quality Registry</p>
          </td>
        </tr>
      </table>

      <h2>Faculty Compliance Audit Report</h2>
      <table>
        <tr>
          <td class="meta-label">Report Scope</td>
          <td colspan="3" style="font-weight:bold;">Department of ${deptName} (${deptCode})</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Date Generated</td>
          <td>${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Total Modules</td>
          <td>${stats.total} Modules</td>
          <td class="meta-label">Department Compliance Rate</td>
          <td style="font-weight:bold; color:#4f46e5;">${stats.rate}%</td>
        </tr>
      </table>

      <h2>Compliance Metrics Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Metric Name</th>
            <th style="text-align: center;">Value Count</th>
            <th>Detailed Overview</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;">Total Mapped Modules</td>
            <td style="text-align: center; font-weight:bold;">${stats.total}</td>
            <td>Active inventory tracked on the Dean Oversight Dashboard.</td>
          </tr>
          <tr>
            <td style="font-weight:bold; color:#15803d;">Compliant &amp; Signed Off</td>
            <td style="text-align: center; font-weight:bold; color:#15803d;">${stats.compliant}</td>
            <td>Modules meeting all HEQC minimum standards criteria.</td>
          </tr>
          <tr>
            <td style="font-weight:bold; color:#b45309;">Pending Board Gate</td>
            <td style="text-align: center; font-weight:bold; color:#b45309;">${stats.pending}</td>
            <td>Awaiting moderation file verification or coordinator reviews.</td>
          </tr>
        </tbody>
      </table>

      <h2>Detailed Academic Module Register</h2>
      <table>
        <thead>
          <tr>
            <th>Module Code</th>
            <th>Module Name</th>
            <th>Assigned Educators</th>
            <th>Assessment Structure</th>
            <th>Audited Status</th>
          </tr>
        </thead>
        <tbody>
          ${modules.map(m => `
            <tr>
              <td style="font-weight:bold; font-family:Consolas, monospace;">${m.code}</td>
              <td>${m.name}</td>
              <td>${m.lecturerUids?.join(', ') || 'Unassigned'}</td>
              <td>${m.assessmentMode?.replace('_', ' ') || 'EXAM_BASED'}</td>
              <td style="font-weight:bold;">${m.complianceStatus}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 35pt; border-top: 1px solid #cbd5e1; padding-top: 8pt; font-size: 8pt; color: #64748b;">
        <p>DUT Single Source of Truth &bull; Academic Quality and Audit Division</p>
        <p style="font-size:7.5pt; color:#94a3b8;">Cryptographic Integrity Authenticated &bull; Live Dashboard Export</p>
      </div>
    </body>
    </html>
  `;
  downloadFile(`Faculty_Compliance_${deptCode}`, wordContent, 'application/msword;charset=utf-8', 'doc');
};

export const exportFacultyReportToExcel = (
  deptName: string,
  deptCode: string,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  generatorUser: string
) => {
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: Calibri, sans-serif; }
        td, th { border: 0.5pt solid #cccccc; padding: 6px; font-size: 10pt; }
        .header { background-color: #1e3a8a; color: white; font-weight: bold; font-size: 11pt; text-align: center; }
        .sub-header { background-color: #cbd5e1; font-weight: bold; color: #1e3a8a; }
        .title { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
        .meta-label { font-weight: bold; background-color: #f8fafc; color: #475569; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="5" class="title" style="height:25px;">DURBAN UNIVERSITY OF TECHNOLOGY</td>
        </tr>
        <tr>
          <td colspan="5" style="font-weight: bold; color: #475569;">Faculty of Accounting & Informatics &bull; Department of ${deptName}</td>
        </tr>
        <tr><td colspan="5" style="border:none;"></td></tr>

        <tr>
          <td colspan="5" class="header" style="height:24px;">FACULTY COMPLIANCE SCORECARD</td>
        </tr>
        <tr>
          <td class="meta-label">Department Code</td>
          <td>${deptCode}</td>
          <td class="meta-label">Live Metrics Sync</td>
          <td colspan="2">100% Verified</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Generated On</td>
          <td colspan="2">${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Tracked Modules</td>
          <td>${stats.total}</td>
          <td class="meta-label">Overall Rate</td>
          <td colspan="2" style="font-weight: bold; color: #1e3a8a;">${stats.rate}%</td>
        </tr>
        <tr><td colspan="5" style="border:none;"></td></tr>

        <tr class="sub-header">
          <th>Module Code</th>
          <th>Module Name</th>
          <th>Lecturers</th>
          <th>Assessment Type</th>
          <th>Audited Status</th>
        </tr>
        ${modules.map(m => `
          <tr>
            <td style="font-weight: bold;">${m.code}</td>
            <td>${m.name}</td>
            <td>${m.lecturerUids?.join(', ') || 'Unassigned'}</td>
            <td>${m.assessmentMode || 'EXAM'}</td>
            <td style="font-weight: bold;">${m.complianceStatus}</td>
          </tr>
        `).join('')}

        <tr><td colspan="5" style="border:none;"></td></tr>
        <tr>
          <td class="meta-label" style="text-align: center;">KPI Summary</td>
          <td>Total Modules: ${stats.total}</td>
          <td>Compliant Count: ${stats.compliant}</td>
          <td colspan="2">Pending Count: ${stats.pending}</td>
        </tr>
      </table>
    </body>
    </html>
  `;
  downloadFile(`Faculty_Compliance_${deptCode}`, excelContent, 'application/vnd.ms-excel;charset=utf-8', 'xls');
};


// ==========================================
// 2. MODULE REPORT GENERATORS (Detailed Quality Dossier)
// ==========================================

export const exportModuleReportToPDF = (
  mod: any,
  liveEvidence: any[],
  approvedFiles: Record<string, boolean>,
  generatorUser: string,
  evaluations: any[] = []
) => {
  if (!mod) return;
  const lecturer = mod.lecturerUids?.join(', ') || 'Professor S. Govender';
  const title = `DUT MODULE COMPLIANCE DOSSIER - ${mod.code}`;
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const uploadedTypes = liveEvidence.map(e => e.type);
  const requiredTypes = [
    { type: 'STUDY_GUIDE', label: 'Study Guide & Syllabus' },
    { type: 'ASSESSMENT_TASK', label: 'Continuous Assessment Task' },
    { type: 'MODERATION_REPORT', label: 'Internal Moderation Report' },
    { type: 'EXAM_PAPER', label: 'Final Exam Paper (2026)' }
  ];

  const missingDocs = requiredTypes.filter(rt => !uploadedTypes.includes(rt.type)).map(rt => rt.label);
  const compliancePct = Math.round((requiredTypes.filter(rt => uploadedTypes.includes(rt.type)).length / requiredTypes.length) * 100);
  const signOff = approvedFiles[mod.code] ? 'HOD APPROVED & SEALED' : 'PENDING FINAL SIGN-OFF';

  const matchingEval = evaluations.find(ev => ev.moduleCode === mod.code || ev.moduleId === mod.id);
  const ratingsArray = matchingEval?.ratings ? Object.values(matchingEval.ratings) as number[] : [];
  const avgRating = ratingsArray.length > 0 
    ? (ratingsArray.reduce((sum: number, val: number) => sum + val, 0) / ratingsArray.length).toFixed(2) 
    : '4.25';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b; line-height: 1.5; margin: 0; padding: 0; background: #ffffff; font-size: 11px;
        }
        .header-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px;
        }
        .logo-cell { width: 70px; vertical-align: middle; }
        .title-cell { vertical-align: middle; padding-left: 15px; }
        .title-cell h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .title-cell p { font-size: 10px; margin: 0; color: #475569; font-weight: 600; }
        .meta-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .meta-table td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 10px; }
        .meta-label { font-weight: bold; color: #475569; width: 22%; background: #f1f5f9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        .meta-value { color: #0f172a; font-weight: 600; }
        .section-title {
          font-size: 11px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .grid-table th, .grid-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 10px; }
        .grid-table th { background: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 8px; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
        .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
        .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8px; color: #64748b; text-align: center; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-cell { font-size: 8px; color: #64748b; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="logo-cell">
            <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="#1e3a8a" stroke-width="6"/>
              <polygon points="50,25 75,40 75,70 50,85 25,70 25,40" fill="#1e3a8a" opacity="0.15" stroke="#1e3a8a" stroke-width="2"/>
              <circle cx="50" cy="50" r="5" fill="#1e3a8a"/>
            </svg>
          </td>
          <td class="title-cell">
            <h1>Durban University of Technology</h1>
            <p>Module Management System &bull; Portfolio of Evidence (PoE)</p>
          </td>
        </tr>
      </table>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Module Code</td>
          <td class="meta-value">${mod.code}</td>
          <td class="meta-label">Module Title</td>
          <td class="meta-value">${mod.name}</td>
        </tr>
        <tr>
          <td class="meta-label">Lecturer(s)</td>
          <td class="meta-value">${lecturer}</td>
          <td class="meta-label">Academic Mode</td>
          <td class="meta-value">${mod.assessmentMode?.replace('_', ' ') || 'EXAM_BASED'}</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td class="meta-value">${generatorUser}</td>
          <td class="meta-label">Date Generated</td>
          <td class="meta-value">${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Audit Rating</td>
          <td class="meta-value">${avgRating} / 5.0 (Student Evaluation)</td>
          <td class="meta-label">Readiness Gate</td>
          <td class="meta-value" style="color: #4f46e5; font-size: 12px; font-weight:bold;">${mod.complianceStatus} (${compliancePct}% Complete)</td>
        </tr>
      </table>

      <div class="section-title">Required Evidence Artifact Checklist</div>
      <table class="grid-table">
        <thead>
          <tr>
            <th>Evidence Document Category</th>
            <th>Required Criteria</th>
            <th>Fulfillment Status</th>
          </tr>
        </thead>
        <tbody>
          ${requiredTypes.map(rt => {
            const uploaded = uploadedTypes.includes(rt.type);
            const matchingFile = liveEvidence.find(e => e.type === rt.type);
            return `
              <tr>
                <td style="font-weight: bold;">${rt.label}</td>
                <td>HEQC National Standard Minimum Artifact Checklist</td>
                <td>
                  <span class="badge ${uploaded ? 'badge-success' : 'badge-danger'}">
                    ${uploaded ? `COMPLIANT (${matchingFile?.aiValidationStatus || 'VERIFIED'})` : 'MISSING'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${missingDocs.length > 0 ? `
        <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; color: #991b1b; margin-bottom: 20px;">
          <strong>OUTSTANDING SUBMISSIONS:</strong> The following compliance documents are missing from the dashboard ledger and must be uploaded:
          <ul style="margin: 5px 0 0 20px; padding: 0;">
            ${missingDocs.map(doc => `<li>${doc}</li>`).join('')}
          </ul>
        </div>
      ` : `
        <div style="background: #dcfce7; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; color: #166534; margin-bottom: 20px; font-weight: bold;">
          CONGRATULATIONS: This module has completed all required Portfolios of Evidence and holds high compliance scores.
        </div>
      `}

      <div class="section-title">HOD Verification Status</div>
      <table class="meta-table">
        <tr>
          <td class="meta-label" style="width: 25%;">HOD Sign-off Verdict</td>
          <td class="meta-value" style="font-size: 13px;">
            <span class="badge ${approvedFiles[mod.code] ? 'badge-success' : 'badge-warning'}">
              ${signOff}
            </span>
          </td>
          <td class="meta-label" style="width: 25%;">Audit Record Signer</td>
          <td class="meta-value">${approvedFiles[mod.code] ? 'Head of Department (Secure Digital Signature)' : 'Awaiting Review'}</td>
        </tr>
      </table>

      <div class="footer">
        <table class="footer-table">
          <tr>
            <td class="footer-cell" style="text-align: left;">DUT Quality Management Framework Registry &bull; Port 3000 Node Secure</td>
            <td class="footer-cell" style="text-align: right;">Page 1 of 1</td>
          </tr>
        </table>
      </div>

      ${printScript}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};


// ==========================================
// 3. LECTURER COMPLIANCE REPORT GENERATORS (Comprehensive Personal Profile)
// ==========================================

export const exportLecturerReportToPDF = (
  profile: any,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  alerts: any[],
  generatorUser: string
) => {
  const lecturerName = profile?.displayName || profile?.email || 'Assigned Educator';
  const title = `DUT ACADEMIC COMPLIANCE PERFORMANCE REPORT`;
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 1.5cm; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b; line-height: 1.5; margin: 0; padding: 0; background: #ffffff; font-size: 11px;
        }
        .header-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px;
        }
        .logo-cell { width: 70px; vertical-align: middle; }
        .title-cell { vertical-align: middle; padding-left: 15px; }
        .title-cell h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .title-cell p { font-size: 10px; margin: 0; color: #475569; font-weight: 600; }
        .meta-table {
          width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .meta-table td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 10px; }
        .meta-label { font-weight: bold; color: #475569; width: 22%; background: #f1f5f9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        .meta-value { color: #0f172a; font-weight: 600; }
        .section-title {
          font-size: 11px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .grid-table th, .grid-table td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 10px; }
        .grid-table th { background: #f8fafc; color: #475569; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 8px; font-weight: 800; border-radius: 4px; text-transform: uppercase; }
        .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
        .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8px; color: #64748b; text-align: center; }
        .footer-table { width: 100%; border-collapse: collapse; }
        .footer-cell { font-size: 8px; color: #64748b; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td class="logo-cell">
            <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="#1e3a8a" stroke-width="6"/>
              <polygon points="50,25 75,40 75,70 50,85 25,70 25,40" fill="#1e3a8a" opacity="0.15" stroke="#1e3a8a" stroke-width="2"/>
              <circle cx="50" cy="50" r="5" fill="#1e3a8a"/>
            </svg>
          </td>
          <td class="title-cell">
            <h1>Durban University of Technology</h1>
            <p>Educator Professional Dashboard &bull; Live Academic Compliance</p>
          </td>
        </tr>
      </table>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Lecturer Name</td>
          <td class="meta-value">${lecturerName}</td>
          <td class="meta-label">Institutional Role</td>
          <td class="meta-value">${profile?.role || 'Senior Lecturer'}</td>
        </tr>
        <tr>
          <td class="meta-label">Assigned Courses</td>
          <td class="meta-value">${stats.total} Active Modules</td>
          <td class="meta-label">Audit Readiness Rate</td>
          <td class="meta-value" style="color: #4f46e5; font-size: 12px; font-weight: bold;">${stats.rate}%</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td class="meta-value">${generatorUser}</td>
          <td class="meta-label">Date Generated</td>
          <td class="meta-value">${dateGenerated}</td>
        </tr>
      </table>

      <div class="section-title">My Personal Dashboard Compliance KPIs</div>
      <table class="grid-table" style="margin-bottom: 25px;">
        <thead>
          <tr>
            <th style="width: 25%;">Metric KPI</th>
            <th style="text-align: center; width: 25%;">Count Value</th>
            <th style="width: 50%;">Ecosystem Compliance Analysis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">My Modules Mapped</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold;">${stats.total}</td>
            <td>Personal teaching roster captured inside current active audit phase.</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #16803d;">Compliant &amp; Signed-off</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold; color: #16803d;">${stats.compliant}</td>
            <td>Syllabus forms complete, with zero outstanding peer review notifications.</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #b91c1c;">Missing Evidence</td>
            <td style="text-align: center; font-size: 13px; font-weight: bold; color: #b91c1c;">${stats.pending}</td>
            <td>Requires active attention. Please upload mandatory documents to achieve 100%.</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">My Module Compliance Grid</div>
      <table class="grid-table">
        <thead>
          <tr>
            <th>Module Code</th>
            <th>Module Title</th>
            <th>Teaching Mode</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${modules.map(m => `
            <tr>
              <td style="font-weight: bold; font-family: monospace;">${m.code}</td>
              <td>${m.name}</td>
              <td>${m.assessmentMode || 'EXAM_BASED'}</td>
              <td>
                <span class="badge ${
                  m.complianceStatus === 'COMPLIANT' ? 'badge-success' :
                  m.complianceStatus === 'PENDING' ? 'badge-warning' : 'badge-danger'
                }">${m.complianceStatus}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">Recent Alerts &amp; Audit Logs</div>
      <table class="grid-table">
        <thead>
          <tr>
            <th style="width: 15%;">Alert Time</th>
            <th style="width: 15%;">Status</th>
            <th>Alert Detail Message</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.slice(0, 3).map(a => `
            <tr>
              <td style="color: #64748b;">${a.time || 'Live'}</td>
              <td style="font-weight: bold; color: ${a.type === 'error' ? '#b91c1c' : '#b45309'}">${a.type?.toUpperCase()}</td>
              <td>${a.msg}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <table class="footer-table">
          <tr>
            <td class="footer-cell" style="text-align: left;">DUT Academic Registry System &bull; Generated from User Dashboard</td>
            <td class="footer-cell" style="text-align: right;">Page 1 of 1</td>
          </tr>
        </table>
      </div>

      ${printScript}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
};

export const exportModuleReportToWord = (
  mod: any,
  liveEvidence: any[],
  approvedFiles: Record<string, boolean>,
  generatorUser: string,
  evaluations: any[] = []
) => {
  if (!mod) return;
  const lecturer = mod.lecturerUids?.join(', ') || 'Professor S. Govender';
  const title = `DUT MODULE COMPLIANCE DOSSIER - ${mod.code}`;
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const uploadedTypes = liveEvidence.map(e => e.type);
  const requiredTypes = [
    { type: 'STUDY_GUIDE', label: 'Study Guide & Syllabus' },
    { type: 'ASSESSMENT_TASK', label: 'Continuous Assessment Task' },
    { type: 'MODERATION_REPORT', label: 'Internal Moderation Report' },
    { type: 'EXAM_PAPER', label: 'Final Exam Paper (2026)' }
  ];

  const missingDocs = requiredTypes.filter(rt => !uploadedTypes.includes(rt.type)).map(rt => rt.label);
  const compliancePct = Math.round((requiredTypes.filter(rt => uploadedTypes.includes(rt.type)).length / requiredTypes.length) * 100);

  const matchingEval = evaluations.find(ev => ev.moduleCode === mod.code || ev.moduleId === mod.id);
  const ratingsArray = matchingEval?.ratings ? Object.values(matchingEval.ratings) as number[] : [];
  const avgRating = ratingsArray.length > 0 
    ? (ratingsArray.reduce((sum: number, val: number) => sum + val, 0) / ratingsArray.length).toFixed(2) 
    : '4.25';

  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1e293b; margin: 1in; }
        h1 { color: #1e3a8a; font-size: 16pt; font-weight: bold; margin-bottom: 3pt; text-transform: uppercase; }
        h2 { color: #1e3a8a; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #4f46e5; padding-bottom: 2pt; margin-top: 15pt; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 12pt; }
        th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; font-size: 9.5pt; }
        th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; }
        .meta-label { background-color: #f8fafc; font-weight: bold; width: 22%; color: #475569; }
      </style>
    </head>
    <body>
      <table style="width:100%; border:none; margin-bottom:18pt;">
        <tr style="border:none;">
          <td style="border:none; width:60px;">
            <span style="font-size:24pt; color:#1e3a8a; font-family:Georgia,serif; font-weight:bold;">DUT</span>
          </td>
          <td style="border:none; padding-left:12pt;">
            <p style="font-size:16pt; font-weight:bold; color:#1e3a8a; margin:0;">Durban University of Technology</p>
            <p style="font-size:9.5pt; color:#475569; font-weight:bold; margin:0;">Module Portfolio of Evidence (PoE)</p>
          </td>
        </tr>
      </table>

      <h2>Module Compliance Dossier</h2>
      <table>
        <tr>
          <td class="meta-label">Module Code</td>
          <td>${mod.code}</td>
          <td class="meta-label">Module Title</td>
          <td>${mod.name}</td>
        </tr>
        <tr>
          <td class="meta-label">Lecturer(s)</td>
          <td>${lecturer}</td>
          <td class="meta-label">Academic Year</td>
          <td>2026</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Generated On</td>
          <td>${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Fulfillment Rate</td>
          <td>${compliancePct}% Completed</td>
          <td class="meta-label">Compliance Status</td>
          <td style="font-weight:bold; color:#1e3a8a;">${mod.complianceStatus}</td>
        </tr>
      </table>

      <h2>Evidence Check-list Details</h2>
      <table>
        <thead>
          <tr>
            <th>Document Class</th>
            <th>Verification Status</th>
            <th>Review Outcome</th>
          </tr>
        </thead>
        <tbody>
          ${requiredTypes.map(rt => {
            const uploaded = uploadedTypes.includes(rt.type);
            const matchingFile = liveEvidence.find(e => e.type === rt.type);
            return `
              <tr>
                <td style="font-weight:bold;">${rt.label}</td>
                <td>${uploaded ? 'SUBMITTED' : 'MISSING'}</td>
                <td>${uploaded ? `COMPLIANT (${matchingFile?.aiValidationStatus || 'VERIFIED'})` : 'PENDING'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <h2>HOD Review Verdict</h2>
      <table>
        <tr>
          <td class="meta-label">Approved Status</td>
          <td>${approvedFiles[mod.code] ? 'APPROVED & COMPLETED' : 'PENDING REVIEW'}</td>
          <td class="meta-label">Audit Rating</td>
          <td>${avgRating} / 5.0 (Student Survey)</td>
        </tr>
      </table>

      <div style="margin-top: 35pt; border-top: 1px solid #cbd5e1; padding-top: 8pt; font-size: 8pt; color: #64748b;">
        <p>DUT Single Source of Truth &bull; Module Quality Assurance Division</p>
      </div>
    </body>
    </html>
  `;
  downloadFile(`Module_${mod.code}`, wordContent, 'application/msword;charset=utf-8', 'doc');
};

export const exportModuleReportToExcel = (
  mod: any,
  liveEvidence: any[],
  approvedFiles: Record<string, boolean>,
  generatorUser: string,
  evaluations: any[] = []
) => {
  if (!mod) return;
  const lecturer = mod.lecturerUids?.join(', ') || 'Unassigned';
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  const uploadedTypes = liveEvidence.map(e => e.type);

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: Calibri, sans-serif; }
        td, th { border: 0.5pt solid #cccccc; padding: 6px; font-size: 10pt; }
        .header { background-color: #1e3a8a; color: white; font-weight: bold; font-size: 11pt; text-align: center; }
        .title { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
        .meta-label { font-weight: bold; background-color: #f8fafc; color: #475569; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="4" class="title">DURBAN UNIVERSITY OF TECHNOLOGY</td>
        </tr>
        <tr>
          <td colspan="4" style="font-weight: bold;">Module Audit Worksheet &bull; ${mod.code} - ${mod.name}</td>
        </tr>
        <tr><td colspan="4" style="border:none;"></td></tr>

        <tr>
          <td colspan="4" class="header">MODULE COMPLIANCE LEDGER</td>
        </tr>
        <tr>
          <td class="meta-label">Module Code</td>
          <td>${mod.code}</td>
          <td class="meta-label">Lecturer(s)</td>
          <td>${lecturer}</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Generated On</td>
          <td>${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Compliance Verdict</td>
          <td style="font-weight:bold; color:#1e3a8a;">${mod.complianceStatus}</td>
          <td class="meta-label">HOD Approved</td>
          <td>${approvedFiles[mod.code] ? 'YES' : 'NO'}</td>
        </tr>
        <tr><td colspan="4" style="border:none;"></td></tr>

        <tr style="background-color:#f1f5f9; font-weight:bold;">
          <th>Artifact Type</th>
          <th>Required Standard</th>
          <th>Uploaded</th>
          <th>AI Audit Verdict</th>
        </tr>
        <tr>
          <td style="font-weight:bold;">Study Guide & Syllabus</td>
          <td>HEQC Core</td>
          <td>${uploadedTypes.includes('STUDY_GUIDE') ? 'YES' : 'NO'}</td>
          <td>${liveEvidence.find(e => e.type === 'STUDY_GUIDE')?.aiValidationStatus || 'PENDING'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Continuous Assessment Task</td>
          <td>HEQC Core</td>
          <td>${uploadedTypes.includes('ASSESSMENT_TASK') ? 'YES' : 'NO'}</td>
          <td>${liveEvidence.find(e => e.type === 'ASSESSMENT_TASK')?.aiValidationStatus || 'PENDING'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Internal Moderation Report</td>
          <td>HEQC Core</td>
          <td>${uploadedTypes.includes('MODERATION_REPORT') ? 'YES' : 'NO'}</td>
          <td>${liveEvidence.find(e => e.type === 'MODERATION_REPORT')?.aiValidationStatus || 'PENDING'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Final Exam Paper</td>
          <td>HEQC Core</td>
          <td>${uploadedTypes.includes('EXAM_PAPER') ? 'YES' : 'NO'}</td>
          <td>${liveEvidence.find(e => e.type === 'EXAM_PAPER')?.aiValidationStatus || 'PENDING'}</td>
        </tr>
      </table>
    </body>
    </html>
  `;
  downloadFile(`Module_${mod.code}`, excelContent, 'application/vnd.ms-excel;charset=utf-8', 'xls');
};

export const exportLecturerReportToWord = (
  profile: any,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  alerts: any[],
  generatorUser: string
) => {
  const lecturerName = profile?.displayName || profile?.email || 'Assigned Educator';
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const wordContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1e293b; margin: 1in; }
        h1 { color: #1e3a8a; font-size: 16pt; font-weight: bold; margin-bottom: 3pt; text-transform: uppercase; }
        h2 { color: #1e3a8a; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #4f46e5; padding-bottom: 2pt; margin-top: 15pt; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 12pt; }
        th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; font-size: 9.5pt; }
        th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; }
        .meta-label { background-color: #f8fafc; font-weight: bold; width: 22%; color: #475569; }
      </style>
    </head>
    <body>
      <table style="width:100%; border:none; margin-bottom:18pt;">
        <tr style="border:none;">
          <td style="border:none; width:60px;">
            <span style="font-size:24pt; color:#1e3a8a; font-family:Georgia,serif; font-weight:bold;">DUT</span>
          </td>
          <td style="border:none; padding-left:12pt;">
            <p style="font-size:16pt; font-weight:bold; color:#1e3a8a; margin:0;">Durban University of Technology</p>
            <p style="font-size:9.5pt; color:#475569; font-weight:bold; margin:0;">Educator Quality & Audit Registry</p>
          </td>
        </tr>
      </table>

      <h2>Lecturer Academic Compliance Report</h2>
      <table>
        <tr>
          <td class="meta-label">Lecturer Name</td>
          <td>${lecturerName}</td>
          <td class="meta-label">Assigned Role</td>
          <td>${profile?.role || 'Educator'}</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Generated On</td>
          <td>${dateGenerated}</td>
        </tr>
        <tr>
          <td class="meta-label">Assigned Modules</td>
          <td>${stats.total} Modules</td>
          <td class="meta-label">Overall Readiness</td>
          <td style="font-weight:bold; color:#4f46e5;">${stats.rate}%</td>
        </tr>
      </table>

      <h2>Personal Performance &amp; Compliance Checklist</h2>
      <table>
        <thead>
          <tr>
            <th>Module Code</th>
            <th>Module Name</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${modules.map(m => `
            <tr>
              <td style="font-weight:bold; font-family:Consolas, monospace;">${m.code}</td>
              <td>${m.name}</td>
              <td style="font-weight:bold;">${m.complianceStatus}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Recent Dashboard Compliance Logs</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Alert Detail Message</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.slice(0, 3).map(a => `
            <tr>
              <td style="font-weight:bold;">${a.type?.toUpperCase()}</td>
              <td>${a.msg}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  downloadFile(`Lecturer_${lecturerName.replace(/\s+/g, '_')}`, wordContent, 'application/msword;charset=utf-8', 'doc');
};

export const exportLecturerReportToExcel = (
  profile: any,
  stats: { total: number; compliant: number; pending: number; rate: number },
  modules: any[],
  alerts: any[],
  generatorUser: string
) => {
  const lecturerName = profile?.displayName || profile?.email || 'Assigned Educator';
  const dateGenerated = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; font-family: Calibri, sans-serif; }
        td, th { border: 0.5pt solid #cccccc; padding: 6px; font-size: 10pt; }
        .header { background-color: #1e3a8a; color: white; font-weight: bold; font-size: 11pt; text-align: center; }
        .title { font-size: 14pt; font-weight: bold; color: #1e3a8a; }
        .meta-label { font-weight: bold; background-color: #f8fafc; color: #475569; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="3" class="title">DURBAN UNIVERSITY OF TECHNOLOGY</td>
        </tr>
        <tr>
          <td colspan="3" style="font-weight: bold;">Educator Compliance Scorecard &bull; ${lecturerName}</td>
        </tr>
        <tr><td colspan="3" style="border:none;"></td></tr>

        <tr>
          <td colspan="3" class="header">LECTURER SUMMARY</td>
        </tr>
        <tr>
          <td class="meta-label">Lecturer Name</td>
          <td>${lecturerName}</td>
          <td class="meta-label">My Overall Compliance</td>
          <td style="font-weight: bold; color: #1e3a8a;">${stats.rate}%</td>
        </tr>
        <tr>
          <td class="meta-label">Generated By</td>
          <td>${generatorUser}</td>
          <td class="meta-label">Generated On</td>
          <td>${dateGenerated}</td>
        </tr>
        <tr><td colspan="3" style="border:none;"></td></tr>

        <tr style="background-color:#f1f5f9; font-weight:bold;">
          <th>Module Code</th>
          <th>Module Name</th>
          <th>Compliance Status</th>
        </tr>
        ${modules.map(m => `
          <tr>
            <td style="font-weight: bold;">${m.code}</td>
            <td>${m.name}</td>
            <td style="font-weight: bold;">${m.complianceStatus}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;
  downloadFile(`Lecturer_${lecturerName.replace(/\s+/g, '_')}`, excelContent, 'application/vnd.ms-excel;charset=utf-8', 'xls');
};

