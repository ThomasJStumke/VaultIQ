import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  Eye, 
  Settings, 
  Grid, 
  Layout, 
  Palette, 
  Check, 
  HelpCircle,
  FileText,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { 
  addReportTemplate, 
  updateReportTemplate, 
  deleteReportTemplate 
} from '../services/supabaseService';

// Standard fields available for mapping based on entity types
const AVAILABLE_FIELDS: Record<string, { key: string; label: string; desc: string; defaultFormatter: string }[]> = {
  module: [
    { key: 'code', label: 'Module Code', desc: 'The academic code (e.g. INF_TECH101)', defaultFormatter: 'uppercase' },
    { key: 'name', label: 'Module Name', desc: 'Full academic title of the module', defaultFormatter: 'text' },
    { key: 'complianceStatus', label: 'Compliance Status', desc: 'Audit status (COMPLIANT, PENDING, NON_COMPLIANT)', defaultFormatter: 'badge' },
    { key: 'assessmentMode', label: 'Assessment Mode', desc: 'Syllabus mode (EXAM_BASED, CONTINUOUS, etc.)', defaultFormatter: 'text_clean' },
    { key: 'lecturerNames', label: 'Primary Educator(s)', desc: 'Full names of teaching staff assigned', defaultFormatter: 'list_join' },
    { key: 'programmeName', label: 'Academic Programme', desc: 'Associated diploma or degree program', defaultFormatter: 'text' },
    { key: 'lastAuditAt', label: 'Last Audited', desc: 'Timestamp of final compliance check', defaultFormatter: 'date' },
    { key: 'averageRating', label: 'Student Evaluation Score', desc: 'Average rating from survey (out of 5.0)', defaultFormatter: 'star_rating' },
    { key: 'evidenceCount', label: 'Evidence Upload Count', desc: 'Number of compliance documents submitted', defaultFormatter: 'number' },
    { key: 'isExitLevel', label: 'Exit Level Status', desc: 'Whether this is a high-stakes graduation module', defaultFormatter: 'boolean_check' },
    { key: 'exitLevelAudit', label: 'CHE Exit-Level Audit', desc: 'CHE verification status for exit outcomes', defaultFormatter: 'badge' },
    { key: 'cheCode', label: 'CHE Qualification Ref', desc: 'Council on Higher Education accreditation reference', defaultFormatter: 'uppercase' },
    { key: 'cqiActionCount', label: 'CQI Action Steps Count', desc: 'Number of continuous quality improvements identified', defaultFormatter: 'number' }
  ],
  department: [
    { key: 'code', label: 'Department Code', desc: 'Department short identifier (e.g. IT, AUD_TAX)', defaultFormatter: 'uppercase' },
    { key: 'name', label: 'Department Name', desc: 'Full name of department', defaultFormatter: 'text' },
    { key: 'complianceRate', label: 'Compliance Rate %', desc: 'Overall percentage of compliant modules', defaultFormatter: 'percentage' },
    { key: 'totalModules', label: 'Total Tracked Modules', desc: 'Total academic modules on roster', defaultFormatter: 'number' },
    { key: 'compliantCount', label: 'Compliant Count', desc: 'Number of modules fully signed off', defaultFormatter: 'number' },
    { key: 'pendingCount', label: 'Pending HOD Count', desc: 'Modules waiting for final approval', defaultFormatter: 'number' },
    { key: 'nonCompliantCount', label: 'Deficit Module Count', desc: 'Modules currently marked non-compliant', defaultFormatter: 'number' },
    { key: 'hodName', label: 'Head of Department', desc: 'The assigned HOD user profile name', defaultFormatter: 'text' },
    { key: 'auditRating', label: 'Internal Audit Rating', desc: 'Calculated internal audit risk tier', defaultFormatter: 'badge' },
    { key: 'lastAuditOfficer', label: 'Lead QA Officer', desc: 'Assigned quality protection officer name', defaultFormatter: 'text' },
    { key: 'strategicPriority', label: 'Strategic Priority Index', desc: 'Strategic planning priority alignment status', defaultFormatter: 'badge' }
  ],
  faculty: [
    { key: 'name', label: 'Faculty Name', desc: 'Full name of the Faculty', defaultFormatter: 'text' },
    { key: 'complianceRate', label: 'Faculty Compliance Rate %', desc: 'Overall faculty compliance percentage', defaultFormatter: 'percentage' },
    { key: 'totalDepartments', label: 'Department Count', desc: 'Number of academic departments inside faculty', defaultFormatter: 'number' },
    { key: 'totalModules', label: 'Total Tracked Modules', desc: 'Grand total of modules across all departments', defaultFormatter: 'number' },
    { key: 'riskLevel', label: 'Risk Analysis Tier', desc: 'System-evaluated risk (LOW, MEDIUM, HIGH)', defaultFormatter: 'badge' },
    { key: 'deanName', label: 'Executive Dean Name', desc: 'Full name of the Executive Dean', defaultFormatter: 'text' },
    { key: 'cheAccreditedPrograms', label: 'CHE Accredited Programs', desc: 'Total number of active programs audited by CHE', defaultFormatter: 'number' },
    { key: 'strategicEnrollment', label: 'Strategic Student Targets Met %', desc: 'Performance mapping metric for institutional planning', defaultFormatter: 'percentage' },
    { key: 'performanceIndex', label: 'Overall Institutional Index', desc: 'Quality assurance score index compiled across departments', defaultFormatter: 'star_rating' }
  ]
};

const FORMATTERS = [
  { value: 'text', label: 'Standard Text' },
  { value: 'uppercase', label: 'UPPERCASE Text' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'badge', label: 'Compliance Status Badge' },
  { value: 'text_clean', label: 'Clean Labels (Replace _)' },
  { value: 'list_join', label: 'Comma-separated List' },
  { value: 'date', label: 'Formatted Date' },
  { value: 'boolean_check', label: 'Checkmark Icon (✓/✗)' },
  { value: 'star_rating', label: 'Rating Score (e.g. 4.2 / 5.0)' },
  { value: 'number', label: 'Integer Number' }
];

const LAYOUTS = [
  { value: 'scorecard', label: 'Scorecard Layout (Summary Metrics Grid)', desc: 'Best for high-level aggregate KPIs, counts, and percentages.' },
  { value: 'table', label: 'Tabular Spreadsheet Layout', desc: 'Standard row-and-column layout. Best for inventories, module lists, and audit records.' },
  { value: 'academic_dossier', label: 'Formal Senate Academic Dossier', desc: 'Traditional structured dossier layout with meta blocks and detailed subsections.' }
];

const STANDARD_COLORS = [
  { name: 'DUT Indigo', primary: '#1e3a8a', secondary: '#4f46e5', accent: '#818cf8', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  { name: 'Senate Crimson', primary: '#881337', secondary: '#e11d48', accent: '#fb7185', bg: 'bg-rose-500/10 border-rose-500/30' },
  { name: 'Emerald Compliance', primary: '#064e3b', secondary: '#059669', accent: '#34d399', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { name: 'Corporate Amber', primary: '#78350f', secondary: '#d97706', accent: '#fbbf24', bg: 'bg-amber-500/10 border-amber-500/30' },
  { name: 'Modern Slate', primary: '#1e293b', secondary: '#475569', accent: '#94a3b8', bg: 'bg-slate-500/10 border-slate-500/30' }
];

export const INSTITUTIONAL_PURPOSES = [
  { value: 'quality_assurance', label: 'Quality Assurance' },
  { value: 'cqpa_reviews', label: 'CQPA Reviews' },
  { value: 'che_accreditation', label: 'CHE Accreditation' },
  { value: 'internal_audits', label: 'Internal Audits' },
  { value: 'external_audits', label: 'External Audits' },
  { value: 'executive_reporting', label: 'Executive Reporting' },
  { value: 'performance_monitoring', label: 'Performance Monitoring' },
  { value: 'strategic_planning', label: 'Strategic Planning' }
];

interface ReportTemplateManagerProps {
  templates: any[];
  onSelectTemplate?: (template: any) => void;
}

export default function ReportTemplateManager({ templates, onSelectTemplate }: ReportTemplateManagerProps) {
  const { profile } = useAuth();
  
  // Active template selected for editing
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter selection for viewing templates
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<'module' | 'department' | 'faculty'>('module');
  const [layout, setLayout] = useState<'table' | 'scorecard' | 'academic_dossier'>('table');
  const [purpose, setPurpose] = useState<string>('quality_assurance');
  const [themeColor, setThemeColor] = useState(STANDARD_COLORS[0]);
  const [fields, setFields] = useState<any[]>([]);
  const [footerText, setFooterText] = useState('Durban University of Technology • Quality Management Framework Registry');

  // Triggering custom notification timeouts
  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 4000);
  };

  // Setup template form for creation
  const handleStartNew = () => {
    setIsCreatingNew(true);
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setEntityType('module');
    setLayout('table');
    setPurpose('quality_assurance');
    setThemeColor(STANDARD_COLORS[0]);
    // Load some default fields to start
    setFields([
      { key: 'code', label: 'Module Code', formatter: 'uppercase', width: '20%' },
      { key: 'name', label: 'Module Title', formatter: 'text', width: '40%' },
      { key: 'complianceStatus', label: 'Compliance Status', formatter: 'badge', width: '20%' },
      { key: 'lecturerNames', label: 'Lecturer(s)', formatter: 'list_join', width: '20%' }
    ]);
    setFooterText('Durban University of Technology • Quality Management Framework Registry');
  };

  // Setup template form for editing
  const handleStartEdit = (template: any) => {
    setIsCreatingNew(false);
    setEditingTemplate(template);
    setName(template.name || '');
    setDescription(template.description || '');
    setEntityType(template.entityType || 'module');
    setLayout(template.layout || 'table');
    setPurpose(template.purpose || 'quality_assurance');
    
    const matchedColor = STANDARD_COLORS.find(c => c.primary === template.styles?.primaryColor) || STANDARD_COLORS[0];
    setThemeColor(matchedColor);
    setFields(template.fields || []);
    setFooterText(template.styles?.footerText || 'Durban University of Technology • Quality Management Framework Registry');
  };

  // Add field mapping line
  const addFieldMapping = () => {
    const available = AVAILABLE_FIELDS[entityType];
    const firstUnused = available.find(f => !fields.some(mapped => mapped.key === f.key)) || available[0];
    
    setFields([
      ...fields,
      {
        key: firstUnused.key,
        label: firstUnused.label,
        formatter: firstUnused.defaultFormatter,
        width: 'auto'
      }
    ]);
  };

  // Remove field mapping line
  const removeFieldMapping = (index: number) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  // Update field field property
  const updateFieldProperty = (index: number, prop: string, value: any) => {
    const updated = [...fields];
    
    if (prop === 'key') {
      // Find default label and formatter for this new key
      const standard = AVAILABLE_FIELDS[entityType].find(f => f.key === value);
      if (standard) {
        updated[index] = {
          ...updated[index],
          key: value,
          label: standard.label,
          formatter: standard.defaultFormatter
        };
      } else {
        updated[index] = { ...updated[index], key: value };
      }
    } else {
      updated[index] = { ...updated[index], [prop]: value };
    }
    
    setFields(updated);
  };

  // Save/Publish the Report Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showStatus('error', 'Template name is required.');
      return;
    }
    if (fields.length === 0) {
      showStatus('error', 'Please map at least one database field.');
      return;
    }

    setSaving(true);
    const templatePayload = {
      name: name.trim(),
      description: description.trim(),
      entityType,
      layout,
      purpose,
      fields,
      styles: {
        primaryColor: themeColor.primary,
        secondaryColor: themeColor.secondary,
        accentColor: themeColor.accent,
        footerText: footerText.trim()
      },
      createdBy: profile?.displayName || profile?.email || 'Administrator'
    };

    try {
      if (isCreatingNew) {
        await addReportTemplate(templatePayload);
        showStatus('success', `Successfully created report template "${name}"`);
        setIsCreatingNew(false);
      } else if (editingTemplate) {
        await updateReportTemplate(editingTemplate.id, templatePayload);
        showStatus('success', `Successfully updated report template "${name}"`);
        setEditingTemplate(null);
      }
    } catch (err: any) {
      console.error(err);
      showStatus('error', 'Failed to save template. Please check database permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Template from Firestore
  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the report template "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteReportTemplate(id);
      showStatus('success', `Deleted template "${name}" successfully.`);
      if (editingTemplate?.id === id) {
        setEditingTemplate(null);
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to delete template from database.');
    }
  };

  // Automatically reset field lists when switching entity types
  const handleEntityTypeChange = (type: 'module' | 'department' | 'faculty') => {
    setEntityType(type);
    
    // Setup clean standard templates for that chosen category
    const available = AVAILABLE_FIELDS[type];
    const initialMapped = available.slice(0, 4).map(f => ({
      key: f.key,
      label: f.label,
      formatter: f.defaultFormatter,
      width: 'auto'
    }));
    setFields(initialMapped);
  };

  // Seed default templates to make the app fully ready instantly
  const handleSeedDefaults = async () => {
    setSaving(true);
    try {
      const defaultTemplates = [
        {
          name: 'Senate Syllabus & Portfolio Audit Scorecard',
          description: 'Standard institutional compliance review for module portfolios. Evaluates complete file matrices, assessment models, and active lecturer logs.',
          entityType: 'module',
          layout: 'academic_dossier',
          purpose: 'quality_assurance',
          fields: [
            { key: 'code', label: 'Module Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Module Title', formatter: 'text', width: '30%' },
            { key: 'complianceStatus', label: 'Syllabus Alignment', formatter: 'badge', width: '15%' },
            { key: 'assessmentMode', label: 'Instruction Type', formatter: 'text_clean', width: '20%' },
            { key: 'evidenceCount', label: 'Evidence Files Checked', formatter: 'number', width: '20%' }
          ],
          styles: {
            primaryColor: '#1e3a8a',
            secondaryColor: '#4f46e5',
            accentColor: '#818cf8',
            footerText: 'DUT Quality Assurance Division • Senate Portfolio Registry'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'CQPA Continuous Program Performance Review',
          description: 'Tracks continuous quality improvement indicators, program titles, student ratings, and outstanding corrective action steps.',
          entityType: 'module',
          layout: 'table',
          purpose: 'cqpa_reviews',
          fields: [
            { key: 'code', label: 'Module Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Module Title', formatter: 'text', width: '30%' },
            { key: 'programmeName', label: 'Associated Qualification', formatter: 'text', width: '30%' },
            { key: 'averageRating', label: 'Student Rating Index', formatter: 'star_rating', width: '15%' },
            { key: 'cqiActionCount', label: 'Open CQI Items', formatter: 'number', width: '10%' }
          ],
          styles: {
            primaryColor: '#78350f',
            secondaryColor: '#d97706',
            accentColor: '#fbbf24',
            footerText: 'DUT Center for Quality Promotion & Assurance (CQPA) • Continuous Program Review'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'CHE Exit-Level Programme Accreditation Dossier',
          description: 'Provides rigorous compliance scores and qualification references mapped directly to exit level indicators as required for CHE statutory evaluation.',
          entityType: 'module',
          layout: 'academic_dossier',
          purpose: 'che_accreditation',
          fields: [
            { key: 'code', label: 'Module Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Course Name', formatter: 'text', width: '30%' },
            { key: 'cheCode', label: 'CHE Reference ID', formatter: 'uppercase', width: '25%' },
            { key: 'isExitLevel', label: 'Is Graduation Capstone', formatter: 'boolean_check', width: '15%' },
            { key: 'exitLevelAudit', label: 'Accreditation Sign-off', formatter: 'badge', width: '15%' }
          ],
          styles: {
            primaryColor: '#1e293b',
            secondaryColor: '#475569',
            accentColor: '#94a3b8',
            footerText: 'Council on Higher Education (CHE) Statutory Accreditation File • Durban University of Technology'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'Internal Academic Department Risk & Audit Control',
          description: 'Internal audit tracker auditing overall departmental readiness, compliance rates, lead investigators, and calculated risk ratings.',
          entityType: 'department',
          layout: 'table',
          purpose: 'internal_audits',
          fields: [
            { key: 'code', label: 'Dept Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Department Title', formatter: 'text', width: '30%' },
            { key: 'complianceRate', label: 'System Compliance Rate', formatter: 'percentage', width: '20%' },
            { key: 'auditRating', label: 'Audit Grade Assigned', formatter: 'badge', width: '20%' },
            { key: 'lastAuditOfficer', label: 'Lead QA Officer', formatter: 'text', width: '15%' }
          ],
          styles: {
            primaryColor: '#881337',
            secondaryColor: '#e11d48',
            accentColor: '#fb7185',
            footerText: 'DUT Institutional Audit Directorate • Confidential Internal Control File'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'External Senate Auditing & Certification Registry',
          description: 'An elite external review dossier designed for independent panel audits. Inspects cumulative course records and formal approval indicators.',
          entityType: 'department',
          layout: 'academic_dossier',
          purpose: 'external_audits',
          fields: [
            { key: 'code', label: 'Department Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Academic Department', formatter: 'text', width: '35%' },
            { key: 'totalModules', label: 'Modules Tracked', formatter: 'number', width: '15%' },
            { key: 'compliantCount', label: 'Modules Signed Off', formatter: 'number', width: '15%' },
            { key: 'nonCompliantCount', label: 'Modules Pending Review', formatter: 'number', width: '20%' }
          ],
          styles: {
            primaryColor: '#064e3b',
            secondaryColor: '#059669',
            accentColor: '#34d399',
            footerText: 'External Senate Evaluation Panel • Independent Statutory Quality Audit'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'Executive Academic Compliance Master Grid',
          description: 'High-level dashboard overview for Deans, HODs and Vice-Chancellors outlining departmental performance metrics and primary owners.',
          entityType: 'department',
          layout: 'table',
          purpose: 'executive_reporting',
          fields: [
            { key: 'code', label: 'Dept Code', formatter: 'uppercase', width: '15%' },
            { key: 'name', label: 'Department Name', formatter: 'text', width: '40%' },
            { key: 'complianceRate', label: 'Compliance Index %', formatter: 'percentage', width: '20%' },
            { key: 'totalModules', label: 'Total active courses', formatter: 'number', width: '10%' },
            { key: 'hodName', label: 'Head of Department', formatter: 'text', width: '15%' }
          ],
          styles: {
            primaryColor: '#1e3a8a',
            secondaryColor: '#059669',
            accentColor: '#818cf8',
            footerText: 'Office of the Vice-Chancellor • Durban University of Technology Executive Briefing'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'University Student Survey & Educator Quality Index',
          description: 'Focuses purely on student evaluations, educator feedback indices, and student satisfaction metrics across critical modules.',
          entityType: 'module',
          layout: 'scorecard',
          purpose: 'performance_monitoring',
          fields: [
            { key: 'code', label: 'Module Code', formatter: 'uppercase', width: '20%' },
            { key: 'name', label: 'Module Title', formatter: 'text', width: '30%' },
            { key: 'averageRating', label: 'Student Satisfaction Score', formatter: 'star_rating', width: '25%' },
            { key: 'lecturerNames', label: 'Primary Assigned Lecturer', formatter: 'list_join', width: '25%' }
          ],
          styles: {
            primaryColor: '#78350f',
            secondaryColor: '#e11d48',
            accentColor: '#fbbf24',
            footerText: 'Student Services Board • Quality Index & Performance Monitoring Office'
          },
          createdBy: 'System Seed'
        },
        {
          name: 'Strategic Academic Enrollment & KPI Scorecard',
          description: 'Aggregates multi-year performance index scores, active departments, and strategic student enrollment targets.',
          entityType: 'faculty',
          layout: 'scorecard',
          purpose: 'strategic_planning',
          fields: [
            { key: 'name', label: 'Faculty Identity', formatter: 'text', width: '25%' },
            { key: 'complianceRate', label: 'Readiness Percentage', formatter: 'percentage', width: '20%' },
            { key: 'cheAccreditedPrograms', label: 'Accredited Programs count', formatter: 'number', width: '20%' },
            { key: 'strategicEnrollment', label: 'Enrollment Targets met %', formatter: 'percentage', width: '20%' },
            { key: 'performanceIndex', label: 'Performance Indicator Score', formatter: 'star_rating', width: '15%' }
          ],
          styles: {
            primaryColor: '#881337',
            secondaryColor: '#1e3a8a',
            accentColor: '#fb7185',
            footerText: 'Division of Enterprise Strategic Planning & Quality Control • Durban University of Technology'
          },
          createdBy: 'System Seed'
        }
      ];

      for (const t of defaultTemplates) {
        await addReportTemplate(t);
      }
      showStatus('success', 'Successfully seeded standard institutional templates!');
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to seed templates. Some might already exist.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Status Bar */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 relative z-50 ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Admin Screen Divider */}
      {!editingTemplate && !isCreatingNew ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Information Panel */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-surface-tint border border-border-subtle space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Settings className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Report Template Studio
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Avoid hardcoding academic report formats! Create flexible, reusable layouts that map direct database fields into custom, high-fidelity formats.
                </p>
              </div>

              <div className="p-4 bg-surface-sunken border border-border-subtle rounded-xl space-y-2.5">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Core System Invariants
                </h5>
                <ul className="text-[10px] text-muted-foreground space-y-2 list-none pl-0">
                  <li className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold shrink-0">•</span>
                    <span><strong>100% Zero-Code:</strong> Publish new templates instantly without application re-deployment.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold shrink-0">•</span>
                    <span><strong>Dynamic Mapping:</strong> Resolve complex metrics like student evaluations and HOD sign-offs.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold shrink-0">•</span>
                    <span><strong>Multi-Format:</strong> Designed formats instantly export to print-ready PDF, Word, and Excel.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                onClick={handleStartNew}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition border border-indigo-500"
              >
                <Plus className="w-4 h-4" /> Create Custom Template
              </button>
              
              {templates.length === 0 && (
                <button
                  onClick={handleSeedDefaults}
                  disabled={saving}
                  className="w-full py-2 bg-surface hover:bg-surface-2 text-foreground/80 rounded-xl text-xs font-semibold uppercase tracking-wider border border-border-subtle transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Seed Core DUT Layouts
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Active Templates List */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-surface-tint border border-border-subtle space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-subtle pb-3 gap-2">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Configured Templates ({templates.length})
              </h4>
              <span className="text-[10px] text-subtle-foreground font-bold uppercase">Dynamic Repository</span>
            </div>

            {templates.length > 0 && (
              <div className="flex flex-wrap gap-1 border-b border-border-subtle pb-3">
                <button
                  type="button"
                  onClick={() => setPurposeFilter('ALL')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200",
                    purposeFilter === 'ALL' 
                      ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-400" 
                      : "bg-surface-tint border border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Frameworks
                </button>
                {INSTITUTIONAL_PURPOSES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPurposeFilter(p.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 border",
                      purposeFilter === p.value 
                        ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-600/5" 
                        : "bg-surface-tint border-transparent text-muted-foreground hover:text-foreground/90 hover:bg-surface-tint-strong"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {templates.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <p className="text-xs text-muted-foreground">No custom templates have been published to Firestore yet.</p>
                <button
                  onClick={handleSeedDefaults}
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition inline-flex items-center gap-2"
                >
                  {saving ? 'Seeding...' : 'Install Default Academic Templates'}
                </button>
              </div>
            ) : templates.filter(t => purposeFilter === 'ALL' || t.purpose === purposeFilter).length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-xs text-muted-foreground">No templates configured for this institutional framework focus yet.</p>
                <button
                  onClick={handleStartNew}
                  className="mt-3 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition"
                >
                  Configure {INSTITUTIONAL_PURPOSES.find(p => p.value === purposeFilter)?.label} Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates
                  .filter(t => purposeFilter === 'ALL' || t.purpose === purposeFilter)
                  .map((template) => {
                    const style = STANDARD_COLORS.find(c => c.primary === template.styles?.primaryColor) || STANDARD_COLORS[4];
                    const purposeLabel = INSTITUTIONAL_PURPOSES.find(p => p.value === template.purpose)?.label || 'Quality Assurance';
                    return (
                      <div 
                        key={template.id}
                        className="p-5 rounded-xl bg-surface-sunken border border-border-subtle hover:border-border transition-all flex flex-col justify-between gap-4 group"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${style.bg} shrink-0`}>
                              {template.entityType}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-tint border border-border-subtle text-muted-foreground text-[8px] font-black uppercase tracking-wider">
                              {purposeLabel}
                            </span>
                          </div>
                          <h5 className="text-xs font-black text-foreground group-hover:text-indigo-400 transition">
                            {template.name}
                          </h5>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {template.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                          {onSelectTemplate && (
                            <button
                              onClick={() => onSelectTemplate(template)}
                              className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1"
                              title="Generate a dynamic report using this template format"
                            >
                              <Eye className="w-3.5 h-3.5" /> Run Report
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(template)}
                              className="p-1.5 bg-surface-tint hover:bg-surface-tint-strong rounded-lg border border-border-subtle text-foreground/80 transition"
                              title="Edit template fields and colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              className="p-1.5 bg-rose-500/5 hover:bg-rose-500/20 rounded-lg border border-rose-500/10 text-rose-400 transition"
                              title="Delete this template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TEMPLATE CREATION / EDITING FORM */
        <form onSubmit={handleSaveTemplate} className="p-6 rounded-2xl bg-surface-tint border border-border-subtle space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-subtle pb-4 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-400" />
                {isCreatingNew ? 'Create Report Template' : `Edit Template: ${name}`}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Design custom reporting schemas mapping database variables to standard layouts.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setIsCreatingNew(false); setEditingTemplate(null); }}
                className="px-4 py-2 bg-surface hover:bg-surface-2 text-foreground/80 rounded-xl text-xs font-bold uppercase tracking-wider border border-border-subtle transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 transition border border-indigo-500"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Publish Template'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: Settings Panel */}
            <div className="lg:col-span-1 space-y-5">
              <div className="p-5 rounded-xl bg-surface-sunken border border-border-subtle space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle pb-2">
                  <Settings className="w-3.5 h-3.5" /> 1. Template Metadata
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Template Name</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Exit Level Module Performance"
                      className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description explaining report usage and scope"
                      className="w-full h-20 px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Report Entity Scope</label>
                    <select 
                      value={entityType}
                      onChange={(e) => handleEntityTypeChange(e.target.value as any)}
                      disabled={!isCreatingNew}
                      className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="module">Module-Level Report</option>
                      <option value="department">Department-Level Report</option>
                      <option value="faculty">Faculty-Level Report</option>
                    </select>
                    {!isCreatingNew && (
                      <p className="text-[9px] text-subtle-foreground italic mt-1">Scope is locked after initial publication.</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Institutional Purpose Focus</label>
                    <select 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
                    >
                      {INSTITUTIONAL_PURPOSES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-subtle-foreground leading-relaxed mt-1">
                      Maps this reporting configuration directly to the selected institutional quality framework.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-sunken border border-border-subtle space-y-4">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-border-subtle pb-2">
                  <Palette className="w-3.5 h-3.5" /> 2. Layout & Theme Styles
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Format Layout</label>
                    <select 
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as any)}
                      className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-indigo-500"
                    >
                      {LAYOUTS.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-subtle-foreground leading-relaxed mt-1">
                      {LAYOUTS.find(l => l.value === layout)?.desc}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Institutional Theme Color</label>
                    <div className="grid grid-cols-5 gap-2">
                      {STANDARD_COLORS.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setThemeColor(color)}
                          className={`h-7 rounded-lg border flex items-center justify-center transition-all ${
                            themeColor.name === color.name 
                              ? 'border-foreground scale-105'
                              : 'border-border-subtle hover:border-foreground/20'
                          }`}
                          style={{ backgroundColor: color.primary }}
                          title={color.name}
                        >
                          {themeColor.name === color.name && (
                            <Check className="w-3.5 h-3.5 text-foreground drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Footer Disclaimer / Seal</label>
                    <input 
                      type="text"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="e.g. Durban University of Technology • Senate Registry"
                      className="w-full px-3 py-2 bg-surface-sunken border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2 & 3: Field Mappings Grid */}
            <div className="lg:col-span-2 space-y-5">
              <div className="p-5 rounded-xl bg-surface-sunken border border-border-subtle space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> 3. Map Database Variables to Report Columns
                  </h4>
                  <button
                    type="button"
                    onClick={addFieldMapping}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Mapping
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Map existing Firestore document attributes directly into formatted report segments. Keep column labels descriptive for high-fidelity exports.
                </p>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-surface-tint rounded-xl border border-border-subtle hover:border-border transition flex flex-col md:flex-row items-center gap-3 relative"
                    >
                      {/* Drag placeholder */}
                      <span className="text-[10px] text-subtle-foreground font-black shrink-0 hidden md:block">
                        #{index + 1}
                      </span>

                      {/* Attribute Selector */}
                      <div className="w-full md:w-1/4 space-y-1">
                        <label className="text-[8px] font-black text-subtle-foreground uppercase tracking-wider block">DB Field Attribute</label>
                        <select
                          value={field.key}
                          onChange={(e) => updateFieldProperty(index, 'key', e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-sunken border border-border rounded-lg text-xs text-foreground/80 focus:outline-none focus:border-indigo-500"
                        >
                          {AVAILABLE_FIELDS[entityType].map(f => (
                            <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                          ))}
                        </select>
                      </div>

                      {/* Display Label */}
                      <div className="w-full md:w-1/4 space-y-1">
                        <label className="text-[8px] font-black text-subtle-foreground uppercase tracking-wider block">Printed Column Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateFieldProperty(index, 'label', e.target.value)}
                          placeholder="e.g. Audit Status"
                          className="w-full px-2 py-1.5 bg-surface-sunken border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Formatter Selection */}
                      <div className="w-full md:w-1/4 space-y-1">
                        <label className="text-[8px] font-black text-subtle-foreground uppercase tracking-wider block">Value Formatter</label>
                        <select
                          value={field.formatter}
                          onChange={(e) => updateFieldProperty(index, 'formatter', e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-sunken border border-border rounded-lg text-xs text-foreground/80 focus:outline-none focus:border-indigo-500"
                        >
                          {FORMATTERS.map(form => (
                            <option key={form.value} value={form.value}>{form.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Width Constraint */}
                      <div className="w-full md:w-1/6 space-y-1">
                        <label className="text-[8px] font-black text-subtle-foreground uppercase tracking-wider block">Col Width</label>
                        <input
                          type="text"
                          value={field.width || 'auto'}
                          onChange={(e) => updateFieldProperty(index, 'width', e.target.value)}
                          placeholder="e.g. 20% or auto"
                          className="w-full px-2 py-1.5 bg-surface-sunken border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 pt-2 md:pt-4">
                        <button
                          type="button"
                          onClick={() => removeFieldMapping(index)}
                          className="p-1.5 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/10 rounded-lg text-rose-400 transition"
                          title="Remove Column Mapping"
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Live Visual Template Preview Card */}
              <div className="p-5 rounded-xl bg-surface-sunken border border-border-subtle space-y-3">
                <h5 className="text-[10px] font-black text-subtle-foreground uppercase tracking-widest flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Live Format Grid Blueprint
                </h5>
                <div 
                  className="rounded-lg overflow-hidden border border-border-subtle text-[11px] p-4 bg-foreground/[0.02]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <div className="flex items-center gap-3 border-b pb-2 mb-3" style={{ borderBottomColor: themeColor.secondary + '20' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-foreground" style={{ backgroundColor: themeColor.primary }}>
                      <span className="font-black text-xs">D</span>
                    </div>
                    <div>
                      <div className="font-extrabold text-foreground text-[12px] tracking-wide uppercase">DURBAN UNIVERSITY OF TECHNOLOGY</div>
                      <div className="text-[9px] text-muted-foreground font-semibold uppercase">{name || 'Untitled Report Template'} ({entityType}-level)</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ fontSize: '10px' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${themeColor.primary}` }}>
                          {fields.map((col, idx) => (
                            <th 
                              key={idx} 
                              className="p-2 text-foreground/80 font-bold uppercase tracking-wider text-[8px]"
                              style={{ width: col.width || 'auto' }}
                            >
                              {col.label || 'Unlabeled'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border-subtle">
                          {fields.map((col, idx) => {
                            // Render placeholder values depending on selected formats
                            let sampleVal = 'Data Field';
                            if (col.formatter === 'uppercase') sampleVal = 'CODE_101';
                            else if (col.formatter === 'percentage') sampleVal = '85%';
                            else if (col.formatter === 'badge') sampleVal = 'COMPLIANT';
                            else if (col.formatter === 'boolean_check') sampleVal = '✓ Yes';
                            else if (col.formatter === 'date') sampleVal = '2026-07-09';
                            else if (col.formatter === 'star_rating') sampleVal = '★ 4.50 / 5.0';
                            else if (col.formatter === 'number') sampleVal = '12';

                            return (
                              <td key={idx} className="p-2 text-muted-foreground font-medium">
                                {col.formatter === 'badge' ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {sampleVal}
                                  </span>
                                ) : sampleVal}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-2 border-t border-border-subtle text-center text-[8px] text-subtle-foreground font-medium">
                    {footerText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
