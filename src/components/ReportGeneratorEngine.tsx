import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Star, 
  Calendar, 
  Users, 
  Layers, 
  Printer, 
  ChevronRight,
  ShieldAlert,
  Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface ReportGeneratorEngineProps {
  templates: any[];
  modules: any[];
  allEvidence: Record<string, any[]>;
  evaluations: any[];
  developmentPlans: any[];
  selectedTemplateId?: string;
}

const DEPARTMENTS = [
  { id: 'IT', name: 'Information Technology', hod: 'Dr. Olive Stumke' },
  { id: 'IS', name: 'Information Systems', hod: 'Dr. Fatima Patel' },
  { id: 'ACC', name: 'Financial Accounting', hod: 'Professor S. Govender' },
  { id: 'AUD', name: 'Auditing & Taxation', hod: 'Dr. Fatima Patel' }
];

export default function ReportGeneratorEngine({ 
  templates, 
  modules, 
  allEvidence, 
  evaluations, 
  developmentPlans,
  selectedTemplateId
}: ReportGeneratorEngineProps) {
  const { profile } = useAuth();

  // Active Selected Template & Target Entity
  const [activeTemplateId, setActiveTemplateId] = useState<string>(selectedTemplateId || '');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('IT');
  const [selectedFacultyName, setSelectedFacultyName] = useState<string>('Faculty of Accounting & Informatics');

  // Load the active template
  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === activeTemplateId) || templates[0] || null;
  }, [templates, activeTemplateId]);

  // Sync state if prop changes
  React.useEffect(() => {
    if (selectedTemplateId) {
      setActiveTemplateId(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  // Pre-select first module if none selected
  React.useEffect(() => {
    if (modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  // Helper resolvers for dynamic data
  const getLecturerNames = (uids: string[]) => {
    if (!uids || uids.length === 0) return 'Professor S. Govender';
    return uids.map(uid => {
      if (uid === profile?.uid) return profile.displayName || profile.email;
      if (uid === 'lecturer_1') return 'Professor S. Govender';
      if (uid === 'lecturer_2') return 'Dr. Olive Stumke';
      if (uid === 'lecturer_3') return 'Dr. Fatima Patel';
      return uid;
    }).join(', ');
  };

  const getProgrammeName = (code: string) => {
    if (!code) return 'Diploma in Information & Communications Technology';
    if (code.startsWith('IT_')) return 'Diploma in Information & Communications Technology';
    if (code.startsWith('ACC_')) return 'Bachelor of Commerce in Financial Accounting';
    if (code.startsWith('TAX_')) return 'Advanced Diploma in Taxation';
    return 'Bachelor of Applied Science in Management';
  };

  // Compile active data payload depending on template entity target
  const compiledData = useMemo(() => {
    if (!activeTemplate) return null;

    if (activeTemplate.entityType === 'module') {
      const mod = modules.find(m => m.id === selectedModuleId) || modules[0];
      if (!mod) return null;

      const evList = allEvidence[mod.id] || [];
      const evCount = evList.length;

      // Evaluation Ratings
      const matchingEval = evaluations.find(e => e.moduleCode === mod.code || e.moduleId === mod.id);
      const ratings = matchingEval?.ratings ? Object.values(matchingEval.ratings) as number[] : [];
      const avgScore = ratings.length > 0 
        ? (ratings.reduce((s, r) => s + r, 0) / ratings.length)
        : 4.15;

      const isCompliant = mod.complianceStatus === 'COMPLIANT';

      return {
        code: mod.code,
        name: mod.name,
        complianceStatus: mod.complianceStatus || 'PENDING',
        assessmentMode: mod.assessmentMode || 'EXAM_BASED',
        lecturerNames: getLecturerNames(mod.lecturerUids),
        programmeName: getProgrammeName(mod.code),
        lastAuditAt: mod.lastAuditAt || new Date().toISOString(),
        averageRating: avgScore,
        evidenceCount: evCount,
        isExitLevel: mod.code.includes('3') || mod.code.includes('4'),
        cheCode: `CHE-ACC-${mod.code.toUpperCase()}-2026`,
        exitLevelAudit: isCompliant ? 'ACCREDITED' : 'REVIEW_PENDING',
        cqiActionCount: mod.complianceStatus === 'NON_COMPLIANT' ? 3 : mod.complianceStatus === 'PENDING' ? 1 : 0
      };
    }

    if (activeTemplate.entityType === 'department') {
      const dept = DEPARTMENTS.find(d => d.id === selectedDepartmentId) || DEPARTMENTS[0];
      const deptModules = modules.filter(m => m.departmentId === dept.id);
      const total = deptModules.length;
      const compliant = deptModules.filter(m => m.complianceStatus === 'COMPLIANT').length;
      const pending = deptModules.filter(m => m.complianceStatus === 'PENDING').length;
      const nonCompliant = deptModules.filter(m => m.complianceStatus === 'NON_COMPLIANT').length;
      const compRate = total > 0 ? Math.round((compliant / total) * 100) : 100;

      return {
        code: dept.id,
        name: dept.name,
        complianceRate: compRate,
        totalModules: total,
        compliantCount: compliant,
        pendingCount: pending,
        nonCompliantCount: nonCompliant,
        hodName: dept.hod,
        auditRating: compRate > 80 ? 'EXCELLENT' : compRate > 60 ? 'SATISFACTORY' : 'NEEDS_IMPROVEMENT',
        lastAuditOfficer: 'Dr. Olive Stumke'
      };
    }

    if (activeTemplate.entityType === 'faculty') {
      const totalDepts = DEPARTMENTS.length;
      const totalMods = modules.length;
      const compliantMods = modules.filter(m => m.complianceStatus === 'COMPLIANT').length;
      const compRate = totalMods > 0 ? Math.round((compliantMods / totalMods) * 100) : 100;

      return {
        name: selectedFacultyName,
        complianceRate: compRate,
        totalDepartments: totalDepts,
        totalModules: totalMods,
        riskLevel: compRate > 80 ? 'LOW' : compRate > 60 ? 'MEDIUM' : 'HIGH',
        deanName: 'Professor S. Govender (Executive Dean)',
        cheAccreditedPrograms: 14,
        strategicEnrollment: 96,
        performanceIndex: 4.8,
        strategicPriority: 'Enhance Academic Portfolios & Continuous Quality Improvement'
      };
    }

    return null;
  }, [activeTemplate, selectedModuleId, selectedDepartmentId, selectedFacultyName, modules, allEvidence, evaluations]);

  // Formatter execution mapping
  const formatValue = (val: any, formatter: string) => {
    if (val === undefined || val === null) return 'N/A';

    switch (formatter) {
      case 'uppercase':
        return String(val).toUpperCase();
      case 'percentage':
        return `${val}%`;
      case 'date':
        return new Date(val).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
      case 'text_clean':
        return String(val).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      case 'boolean_check':
        return val ? '✓ YES' : '✗ NO';
      case 'star_rating':
        return `${Number(val).toFixed(2)} / 5.0`;
      case 'number':
        return Number(val).toLocaleString();
      case 'badge':
        return String(val).toUpperCase();
      case 'list_join':
        return Array.isArray(val) ? val.join(', ') : String(val);
      default:
        return String(val);
    }
  };

  // Helper style resolvers
  const getPrimaryColor = () => activeTemplate?.styles?.primaryColor || '#1e3a8a';
  const getSecondaryColor = () => activeTemplate?.styles?.secondaryColor || '#4f46e5';

  // EXPORT 1: PDF PRINT SCREEN IN A NEW TAB
  const handleExportPDF = () => {
    if (!activeTemplate || !compiledData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const primaryColor = getPrimaryColor();
    const secondaryColor = getSecondaryColor();
    const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();

    let recordContentHtml = '';

    if (activeTemplate.layout === 'scorecard') {
      recordContentHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px;">
          ${activeTemplate.fields.map((f: any) => `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; tracking-wider; margin-bottom: 8px;">
                ${f.label}
              </div>
              <div style="font-size: 28px; font-weight: 900; color: ${primaryColor};">
                ${formatValue(compiledData[f.key], f.formatter)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      recordContentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: ${primaryColor}; color: #ffffff;">
              <th colspan="2" style="padding: 14px 18px; text-align: left; font-size: 12px; font-weight: 800; uppercase; tracking-wider;">
                REGISTRY SPECIFICATION DETAILS
              </th>
            </tr>
          </thead>
          <tbody>
            ${activeTemplate.fields.map((f: any, idx: number) => `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 14px 18px; width: 40%; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
                  ${f.label}
                </td>
                <td style="padding: 14px 18px; font-size: 11px; font-weight: 800; color: #1e293b;">
                  ${f.formatter === 'badge' ? `
                    <span style="background: ${compiledData[f.key] === 'COMPLIANT' || compiledData[f.key] > 80 ? '#d1fae5' : '#fee2e2'}; 
                                 color: ${compiledData[f.key] === 'COMPLIANT' || compiledData[f.key] > 80 ? '#065f46' : '#991b1b'}; 
                                 padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; border: 1px solid currentColor;">
                      ${formatValue(compiledData[f.key], f.formatter)}
                    </span>
                  ` : formatValue(compiledData[f.key], f.formatter)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeTemplate.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          .header-banner {
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-title h1 {
            font-size: 18px;
            margin: 0;
            font-weight: 900;
            color: ${primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-title p {
            font-size: 10px;
            margin: 4px 0 0 0;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-stamp {
            border: 2px dashed ${secondaryColor};
            border-radius: 6px;
            padding: 6px 12px;
            color: ${secondaryColor};
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
            transform: rotate(-3deg);
          }
          .meta-box {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 15px;
            font-size: 10px;
            margin-bottom: 25px;
            border-left: 4px solid ${primaryColor};
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .meta-item {
            color: #475569;
          }
          .meta-item strong {
            color: #1e293b;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
          }
          .signature-line {
            width: 220px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            text-align: center;
            color: #64748b;
            font-weight: 600;
          }
          .footer {
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="header-title">
            <h1>Durban University of Technology</h1>
            <p>${activeTemplate.name}</p>
          </div>
          <div class="badge-stamp">
            DUT QA SEALED
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-grid">
            <div class="meta-item"><strong>Generated On:</strong> ${dateStr}</div>
            <div class="meta-item"><strong>Origin Workspace:</strong> Dynamic Compliance Engine</div>
            <div class="meta-item"><strong>Authorized User:</strong> ${profile?.displayName || profile?.email || 'Dr. Olive Stumke'}</div>
            <div class="meta-item"><strong>Template Reference:</strong> ID_${activeTemplate.id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        <div>
          <h3 style="font-size: 12px; font-weight: 800; color: ${primaryColor}; margin-bottom: 5px; text-transform: uppercase;">
            Report Summary Mapping:
          </h3>
          <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.6;">
            ${activeTemplate.description || 'Flexible institutional data mapping.'}
          </p>
        </div>

        ${recordContentHtml}

        <div class="signature-section">
          <div class="signature-line">
            Prepared By: Quality Promotion Officer
          </div>
          <div class="signature-line">
            Approved: Academic Senate Board
          </div>
        </div>

        <div class="footer">
          ${activeTemplate.styles?.footerText || 'DUT Quality Registry'}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // EXPORT 2: WORD DOCUMENT AS AN HTML COMPATIBLE BLOB
  const handleExportWord = () => {
    if (!activeTemplate || !compiledData) return;

    const primaryColor = getPrimaryColor();
    const dateStr = new Date().toLocaleDateString();

    const tableRows = activeTemplate.fields.map((f: any) => `
      <tr style="border-bottom: 1px solid #cccccc;">
        <td style="padding: 10px; font-weight: bold; background-color: #f3f4f6; color: #333333;">${f.label}</td>
        <td style="padding: 10px; color: #000000;">${formatValue(compiledData[f.key], f.formatter)}</td>
      </tr>
    `).join('');

    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>${activeTemplate.name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; }
          .header { border-bottom: 3px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 16pt; font-weight: bold; color: ${primaryColor}; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: ${primaryColor}; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #cccccc; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Durban University of Technology</div>
          <div>${activeTemplate.name}</div>
          <div style="font-size: 9pt; color: #666666;">Exported: ${dateStr}</div>
        </div>
        <p>${activeTemplate.description || ''}</p>
        <table>
          <thead>
            <tr>
              <th colspan="2">Quality Specification Mappings</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <p style="margin-top: 40px; font-size: 9pt; text-align: center; color: #999999;">
          ${activeTemplate.styles?.footerText || ''}
        </p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT 3: EXCEL SHEET TABLE BLOB
  const handleExportExcel = () => {
    if (!activeTemplate || !compiledData) return;

    const primaryColor = getPrimaryColor();
    const tableRows = activeTemplate.fields.map((f: any) => `
      <tr>
        <td style="font-weight: bold; background-color: #f3f4f6; border: 1px solid #cbd5e1;">${f.label}</td>
        <td style="border: 1px solid #cbd5e1;">${formatValue(compiledData[f.key], f.formatter)}</td>
      </tr>
    `).join('');

    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th colspan="2" style="background-color: ${primaryColor}; color: white; font-weight: bold; text-align: center;">
                ${activeTemplate.name.toUpperCase()}
              </th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. SELECTION BAR */}
      <div className="p-5 rounded-2xl bg-surface-tint border border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Template selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Choose Dynamic Template Mapping
          </label>
          <select
            value={activeTemplateId}
            onChange={(e) => setActiveTemplateId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>-- Select Report Template --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.entityType})</option>
            ))}
          </select>
        </div>

        {/* Dynamic target selector depending on entity scope */}
        {activeTemplate && (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Choose Target Record ({activeTemplate.entityType})
            </label>
            
            {activeTemplate.entityType === 'module' && (
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
                ))}
              </select>
            )}

            {activeTemplate.entityType === 'department' && (
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                ))}
              </select>
            )}

            {activeTemplate.entityType === 'faculty' && (
              <select
                value={selectedFacultyName}
                onChange={(e) => setSelectedFacultyName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-xl text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
              >
                <option value="Faculty of Accounting & Informatics">Faculty of Accounting & Informatics</option>
                <option value="Faculty of Management Sciences">Faculty of Management Sciences</option>
                <option value="Faculty of Engineering & Built Environment">Faculty of Engineering & Built Environment</option>
              </select>
            )}
          </div>
        )}
      </div>

      {activeTemplate && compiledData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PREVIEW INTERACTIVE PORTFOLIO SHEET */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-400" /> Interactive Report Visualizer
              </h4>
              <span className="text-[10px] text-subtle-foreground font-bold uppercase">Dynamic Output</span>
            </div>

            {/* Render Preview Card */}
            <div 
              className="rounded-2xl border border-border p-6 space-y-6 relative overflow-hidden bg-surface-sunken"
              style={{ borderLeft: `5px solid ${getPrimaryColor()}` }}
            >
              {/* Header block */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b pb-4 border-border-subtle">
                <div className="space-y-1">
                  <div className="font-extrabold text-foreground text-sm tracking-wide uppercase">
                    DURBAN UNIVERSITY OF TECHNOLOGY
                  </div>
                  <h3 className="text-xs font-black uppercase text-muted-foreground">
                    {activeTemplate.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-subtle-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Generated: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div 
                  className="px-3 py-1 border border-dashed rounded text-[10px] font-bold uppercase tracking-wider text-center shrink-0"
                  style={{ borderColor: getSecondaryColor(), color: getSecondaryColor() }}
                >
                  INSTITUTIONAL REPORT
                </div>
              </div>

              {/* Description block */}
              <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 pl-3 border-indigo-500/20">
                "{activeTemplate.description}"
              </p>

              {/* RENDER DYNAMIC LAYOUT PREVIEWS */}
              {activeTemplate.layout === 'scorecard' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeTemplate.fields.map((col: any, idx: number) => {
                    const rawVal = compiledData[col.key];
                    const val = formatValue(rawVal, col.formatter);
                    return (
                      <div 
                        key={idx} 
                        className="p-5 bg-foreground/[0.02] border border-border-subtle rounded-2xl text-center space-y-1.5 hover:border-border transition"
                      >
                        <span className="text-[9px] font-black text-subtle-foreground uppercase tracking-wider block">
                          {col.label}
                        </span>
                        <div className="text-2xl font-black text-foreground">
                          {col.formatter === 'badge' ? (
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-black uppercase border",
                              rawVal === 'COMPLIANT' || rawVal > 80 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            )}>
                              {val}
                            </span>
                          ) : val}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeTemplate.layout === 'academic_dossier' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-surface-sunken border border-border-subtle rounded-xl space-y-3">
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-400" /> Senate Validation Record
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      This formal academic dossier provides central quality compliance scores mapped directly to dynamic parameters recorded by Faculty Administrators and Heads of Departments.
                    </p>
                  </div>

                  <table className="w-full text-left text-xs border border-border-subtle rounded-xl overflow-hidden">
                    <thead className="bg-surface-tint text-muted-foreground font-bold uppercase text-[9px] tracking-wider">
                      <tr className="border-b border-border-subtle">
                        <th className="p-3">Requirement</th>
                        <th className="p-3">Registry Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeTemplate.fields.map((col: any, idx: number) => {
                        const rawVal = compiledData[col.key];
                        return (
                          <tr key={idx} className="hover:bg-surface-tint">
                            <td className="p-3 text-muted-foreground font-semibold uppercase text-[10px]">{col.label}</td>
                            <td className="p-3 font-bold text-foreground">
                              {col.formatter === 'badge' ? (
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded text-[9px] font-black uppercase border",
                                  rawVal === 'COMPLIANT' || rawVal > 80 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                )}>
                                  {formatValue(rawVal, col.formatter)}
                                </span>
                              ) : formatValue(rawVal, col.formatter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* TABULAR LIST LAYOUT */
                <div className="overflow-x-auto border border-border-subtle rounded-xl bg-surface-sunken">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-tint text-muted-foreground font-black uppercase text-[9px] tracking-wider">
                      <tr>
                        {activeTemplate.fields.map((col: any, idx: number) => (
                          <th key={idx} className="p-3" style={{ width: col.width || 'auto' }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-surface-tint">
                        {activeTemplate.fields.map((col: any, idx: number) => {
                          const rawVal = compiledData[col.key];
                          return (
                            <td key={idx} className="p-3 text-foreground font-bold">
                              {col.formatter === 'badge' ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                                  rawVal === 'COMPLIANT' || rawVal > 80 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                )}>
                                  {formatValue(rawVal, col.formatter)}
                                </span>
                              ) : formatValue(rawVal, col.formatter)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signatures placeholder */}
              <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between text-[10px] text-subtle-foreground font-bold uppercase gap-4">
                <span>COMPILED BY: QUALITY PROMOTION OFFICE</span>
                <span>DUT ACADEMIC REGISTRY &bull; REGISTERED</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS & SPECIFICATIONS PANEL */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-5 rounded-2xl bg-surface-tint border border-border-subtle space-y-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border-subtle pb-2">
                <Printer className="w-4 h-4 text-indigo-400" /> Print & Export Options
              </h4>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Render the compiled data payload of your chosen target record directly into standard layouts for board meetings and audits.
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleExportPDF}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-foreground border border-rose-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-rose-400" /> Export PDF Printout
                </button>

                <button
                  onClick={handleExportWord}
                  className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-foreground border border-blue-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-blue-400" /> Export Microsoft Word
                </button>

                <button
                  onClick={handleExportExcel}
                  className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-foreground border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Microsoft Excel
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface-tint border border-border-subtle space-y-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border-subtle pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Dynamic Registry Payload
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between text-[11px] border-b border-foreground/[0.03] pb-1.5">
                  <span className="text-subtle-foreground font-bold">Scope Target:</span>
                  <span className="text-foreground/80 font-extrabold uppercase">{activeTemplate.entityType}</span>
                </div>
                <div className="flex justify-between text-[11px] border-b border-foreground/[0.03] pb-1.5">
                  <span className="text-subtle-foreground font-bold">Layout Blueprint:</span>
                  <span className="text-indigo-400 font-bold uppercase">{activeTemplate.layout}</span>
                </div>
                <div className="flex justify-between text-[11px] border-b border-foreground/[0.03] pb-1.5">
                  <span className="text-subtle-foreground font-bold">Primary Signature:</span>
                  <span className="text-foreground/80 font-bold">{compiledData.hodName || compiledData.deanName || compiledData.lecturerNames?.split(',')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-surface-tint border border-border-subtle text-xs text-muted-foreground font-medium">
          Please select a Dynamic Report Template above to render quality audit data.
        </div>
      )}
    </div>
  );
}
