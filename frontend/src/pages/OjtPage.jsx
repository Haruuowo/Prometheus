import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  Calendar,
  CheckCircle2,
  Download,
  Copy,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileCheck,
  FileText,
  Building,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../api';

const DEFAULT_DAYS_PER_WEEK = 5;

const PRESET_ACTIVITIES = [
  { label: 'Frontend UI', text: 'Built and styled responsive user interface components using React and Tailwind CSS; ensured mobile responsiveness.' },
  { label: 'API & Backend', text: 'Implemented RESTful API endpoints, handled error states, and tested payload responses with Postman.' },
  { label: 'Bug Fix & QA', text: 'Investigated client-reported issue, reproduced bug in local dev environment, and pushed patch with unit tests.' },
  { label: 'Standup & Review', text: 'Attended daily morning scrum standup; presented PR changes to senior engineer and incorporated code review feedback.' },
  { label: 'Documentation', text: 'Updated technical documentation, wrote component usage guides, and documented endpoint schemas in internal wiki.' },
  { label: 'Database & State', text: 'Optimized local state management, structured database queries, and prevented redundant client re-renders.' },
];

export default function OjtPage({ githubUsername, githubData }) {
  // Configuration State
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('ojt_student_name') || githubData?.name || githubUsername || 'Student Name';
  });
  const [companyName, setCompanyName] = useState(() => {
    return localStorage.getItem('ojt_company_name') || 'Host Training Company';
  });
  const [supervisorName, setSupervisorName] = useState(() => {
    return localStorage.getItem('ojt_supervisor_name') || 'Supervisor Name';
  });
  const [targetHours, setTargetHours] = useState(() => {
    return Number(localStorage.getItem('ojt_target_hours')) || 300;
  });

  // Current active week (1-16)
  const [activeWeek, setActiveWeek] = useState(1);

  // 16 weeks journal store: { 1: [days], 2: [days], ... }
  const [journals, setJournals] = useState(() => {
    try {
      const saved = localStorage.getItem('ojt_journals_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Initial sample week 1
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;

    const sampleDays = [
      {
        date: formatDate(new Date(today.getTime() - 4 * 86400000)),
        time_in: '08:00 AM',
        time_out: '05:00 PM',
        hours: '8.0',
        report: 'Attended corporate onboarding & orientation. Set up local development environment, cloned repositories, and reviewed architecture guidelines.'
      },
      {
        date: formatDate(new Date(today.getTime() - 3 * 86400000)),
        time_in: '08:00 AM',
        time_out: '05:00 PM',
        hours: '8.0',
        report: 'Reviewed ticket backlog with mentor. Began building reusable UI card components with Tailwind CSS following Figma design specifications.'
      },
      {
        date: formatDate(new Date(today.getTime() - 2 * 86400000)),
        time_in: '08:00 AM',
        time_out: '05:00 PM',
        hours: '8.0',
        report: 'Integrated REST API service endpoints. Implemented error boundaries and asynchronous loading skeletons for network requests.'
      },
      {
        date: formatDate(new Date(today.getTime() - 1 * 86400000)),
        time_in: '08:00 AM',
        time_out: '05:00 PM',
        hours: '8.0',
        report: 'Conducted cross-browser compatibility tests and responsive UI audit. Fixed styling regressions and aligned typography tokens.'
      },
      {
        date: formatDate(today),
        time_in: '08:00 AM',
        time_out: '05:00 PM',
        hours: '8.0',
        report: 'Submitted pull request for review. Attended sprint demo and documented accomplished milestone deliverables for weekly sign-off.'
      }
    ];

    const init = {};
    for (let w = 1; w <= 16; w++) {
      init[w] = w === 1 ? sampleDays : [];
    }
    return init;
  });

  // Captions per week
  const [captions, setCaptions] = useState(() => {
    try {
      const saved = localStorage.getItem('ojt_captions_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { 1: 'Sprint planning and development workstation during Week 1 onboarding.' };
  });

  // Pre-OJT Checklist items
  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem('ojt_checklist_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'req_1', title: 'Online Orientation Attendance Form', detail: 'Submitted via Google Forms (Crucial)', paper_size: 'Online Form', done: true },
      { id: 'req_2', title: 'Endorsement Letter', detail: 'Must be signed first by the coordinator', paper_size: 'Letter-sized (8.5 x 11 in)', done: true },
      { id: 'req_3', title: 'Waiver', detail: 'Signed by student and acknowledged by university', paper_size: 'Letter-sized (8.5 x 11 in)', done: false },
      { id: 'req_4', title: 'Practicum Training Agreement', detail: 'Tripartite agreement between student, company & school', paper_size: 'Letter-sized (8.5 x 11 in)', done: false },
      { id: 'req_5', title: 'Parental Consent', detail: 'Signed by parent or guardian with valid ID attached', paper_size: 'Letter-sized (8.5 x 11 in)', done: false },
      { id: 'req_6', title: 'Acceptance Letter', detail: 'Official acceptance document issued by company', paper_size: 'Letter-sized (8.5 x 11 in)', done: false },
    ];
  });

  // Fast Day Logger Form
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const [formDate, setFormDate] = useState(`${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`);
  const [formTimeIn, setFormTimeIn] = useState('08:00 AM');
  const [formTimeOut, setFormTimeOut] = useState('05:00 PM');
  const [formHours, setFormHours] = useState('8.0');
  const [formReport, setFormReport] = useState('');
  const [lunchDeduction, setLunchDeduction] = useState(true);

  // Status & Feedback messages
  const [statusNotice, setStatusNotice] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Persistence helpers
  const saveJournals = (next) => {
    setJournals(next);
    try {
      localStorage.setItem('ojt_journals_v1', JSON.stringify(next));
    } catch (e) {}
  };

  const saveCaptions = (next) => {
    setCaptions(next);
    try {
      localStorage.setItem('ojt_captions_v1', JSON.stringify(next));
    } catch (e) {}
  };

  const saveChecklist = (next) => {
    setChecklist(next);
    try {
      localStorage.setItem('ojt_checklist_v1', JSON.stringify(next));
    } catch (e) {}
  };

  const saveConfig = (name, comp, sup, target) => {
    setStudentName(name);
    setCompanyName(comp);
    setSupervisorName(sup);
    setTargetHours(target);
    try {
      localStorage.setItem('ojt_student_name', name);
      localStorage.setItem('ojt_company_name', comp);
      localStorage.setItem('ojt_supervisor_name', sup);
      localStorage.setItem('ojt_target_hours', String(target));
    } catch (e) {}
  };

  // Recalculate hours when time-in or time-out changes
  const computeHoursFromTimes = (tIn, tOut, deductLunch = true) => {
    // Simple parser for "HH:MM AM/PM"
    const parseTime = (str) => {
      const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h + m / 60;
    };
    const start = parseTime(tIn);
    const end = parseTime(tOut);
    if (start === null || end === null || end <= start) return '8.0';
    let diff = end - start;
    if (deductLunch && diff > 5) {
      diff -= 1.0; // Deduct 1 hr lunch break
    }
    return (Math.round(diff * 10) / 10).toFixed(1);
  };

  const handleTimeChange = (newIn, newOut, deduct = lunchDeduction) => {
    setFormTimeIn(newIn);
    setFormTimeOut(newOut);
    setFormHours(computeHoursFromTimes(newIn, newOut, deduct));
  };

  // Calculate Overall Hours
  let totalRenderedHours = 0;
  for (let w = 1; w <= 16; w++) {
    const list = journals[w] || [];
    for (const d of list) {
      const h = parseFloat(d.hours) || 0;
      totalRenderedHours += h;
    }
  }

  const remainingHours = Math.max(0, targetHours - totalRenderedHours);
  const progressPct = Math.min(100, Math.round((totalRenderedHours / targetHours) * 100));

  // Current active week's days & hours
  const activeDays = journals[activeWeek] || [];
  const activeWeekHours = activeDays.reduce((acc, d) => acc + (parseFloat(d.hours) || 0), 0);

  // Active week caption
  const activeCaption = captions[activeWeek] || '';

  // Add a day entry to the active week
  const handleAddDay = (e) => {
    if (e) e.preventDefault();
    if (!formDate.trim()) return;

    const newDay = {
      date: formDate.trim(),
      time_in: formTimeIn.trim() || '08:00 AM',
      time_out: formTimeOut.trim() || '05:00 PM',
      hours: formHours || '8.0',
      report: formReport.trim() || 'Accomplished scheduled development tasks and participated in team workflow.'
    };

    const nextDays = [...activeDays, newDay];
    saveJournals({ ...journals, [activeWeek]: nextDays });
    setFormReport('');
    setStatusNotice(`Logged day for ${formDate}`);
    setTimeout(() => setStatusNotice(''), 3000);
  };

  // Delete day entry
  const handleDeleteDay = (index) => {
    const nextDays = activeDays.filter((_, i) => i !== index);
    saveJournals({ ...journals, [activeWeek]: nextDays });
  };

  // In-place update day field
  const handleUpdateDay = (index, field, value) => {
    const nextDays = activeDays.map((d, i) => (i === index ? { ...d, [field]: value } : d));
    saveJournals({ ...journals, [activeWeek]: nextDays });
  };

  // Auto-fill full 5-day week
  const handleBatchFillWeek = async () => {
    setIsAutoGenerating(true);
    setStatusNotice('Generating automated 5-day schedule...');

    try {
      const res = await api.generateOjtTasks({
        role: 'Software Engineer Intern',
        techStack: 'React, Tailwind CSS, TypeScript, FastAPI',
        focusTopic: `Week ${activeWeek} Milestones`,
        daysCount: 5
      });

      if (res.ok && res.generated_days?.length > 0) {
        // Compute 5 sequential dates for the active week
        const baseDate = new Date();
        const generated = res.generated_days.map((g, idx) => {
          const d = new Date(baseDate.getTime() + (idx - 2) * 86400000);
          return {
            date: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`,
            time_in: g.time_in || '08:00 AM',
            time_out: g.time_out || '05:00 PM',
            hours: g.hours || '8.0',
            report: g.report || 'Accomplished scheduled practicum milestones.'
          };
        });

        saveJournals({ ...journals, [activeWeek]: generated });
        setStatusNotice(`Auto-filled Week ${activeWeek} (40.0 hrs total)!`);
      } else {
        // Fallback local generator
        const baseDate = new Date();
        const fallback = PRESET_ACTIVITIES.slice(0, 5).map((preset, idx) => {
          const d = new Date(baseDate.getTime() + (idx - 2) * 86400000);
          return {
            date: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`,
            time_in: '08:00 AM',
            time_out: '05:00 PM',
            hours: '8.0',
            report: preset.text
          };
        });
        saveJournals({ ...journals, [activeWeek]: fallback });
        setStatusNotice(`Auto-filled Week ${activeWeek} with standard 40 hrs.`);
      }
    } catch (e) {
      setStatusNotice('Failed to auto-generate week.');
    } finally {
      setIsAutoGenerating(false);
      setTimeout(() => setStatusNotice(''), 3000);
    }
  };

  // Export DOCX
  const handleExportDocx = async () => {
    setIsExporting(true);
    setStatusNotice(`Preparing Week ${activeWeek} Word Document (.docx)...`);

    try {
      const todayStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
      const payload = {
        week_number: activeWeek,
        student_name: studentName,
        supervisor_name: supervisorName,
        company_name: companyName,
        sign_date: todayStr,
        caption: activeCaption,
        days: activeDays,
        total_hours: String(activeWeekHours)
      };

      const blob = await api.exportOjtDocx(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '') || 'Student';
      a.download = `${cleanName}_Wk${pad(activeWeek)} SOC-OJT Weekly Journal.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatusNotice(`Downloaded Week ${activeWeek} DOCX successfully!`);
    } catch (err) {
      console.error(err);
      setStatusNotice('Error exporting DOCX. Please verify backend connection.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusNotice(''), 4000);
    }
  };

  // Copy Journal as Formatted Markdown / Canvas text
  const handleCopyJournalText = () => {
    let text = `# SOC-OJT WEEKLY JOURNAL | ATTENDANCE SHEET | ACTIVITIES LOGBOOK\n`;
    text += `Ephesians 6:7-8 "Serve wholeheartedly, as if you were serving the Lord, not people..."\n\n`;
    text += `Week No: ${activeWeek} | Total Hours: ${activeWeekHours} hrs\n`;
    text += `Student: ${studentName} | Company: ${companyName} | Supervisor: ${supervisorName}\n\n`;
    text += `| Date | Time-In | Time-Out | Hours | Daily Report on Tasks / Activities Performed |\n`;
    text += `| --- | --- | --- | --- | --- |\n`;
    activeDays.forEach((d) => {
      text += `| ${d.date} | ${d.time_in} | ${d.time_out} | ${d.hours} | ${d.report.replace(/\n/g, ' ')} |\n`;
    });
    text += `\nDocumentation Caption: ${activeCaption || 'N/A'}\n`;

    navigator.clipboard.writeText(text);
    setStatusNotice('Copied Weekly Journal table to clipboard!');
    setTimeout(() => setStatusNotice(''), 3000);
  };

  // Toggle checklist item
  const handleToggleChecklist = (id) => {
    const next = checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    saveChecklist(next);
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* 1. Header Banner & Identity */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#f8de8c] border-2 border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900 uppercase shadow-[2px_2px_0px_#18181b]">
              SOC PRACTICUM
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#a3ebb1] border-2 border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900 uppercase shadow-[2px_2px_0px_#18181b]">
              16 WEEKS AUTOMATION
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            OJT Practicum Hub
          </h1>
          <p className="text-sm font-semibold text-zinc-600 mt-0.5">
            Track daily attendance, automate your 16 weekly journals, and export official SOC DOCX reports.
          </p>
        </div>

        {/* Company & Profile Pill Button */}
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="neo-card p-3 flex items-center gap-3 bg-white hover:bg-[#faf6ee] transition-colors cursor-pointer text-left"
          title="Edit Student, Company, and Supervisor Details"
        >
          <div className="w-10 h-10 rounded-full bg-[#aee2f5] border-2 border-zinc-900 flex items-center justify-center font-extrabold text-zinc-900 shrink-0">
            <Building className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-zinc-500 uppercase">
              {companyName || 'Set Company'}
            </div>
            <div className="text-sm font-extrabold text-zinc-900 truncate max-w-[160px]">
              {studentName}
            </div>
          </div>
          <span className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg bg-[#faf6ee] border border-zinc-900 text-zinc-700">
            Edit
          </span>
        </button>
      </section>

      {/* Status Notice Toast / Banner */}
      {statusNotice && (
        <div className="neo-card p-3 bg-[#a3ebb1] text-zinc-900 flex items-center justify-between font-bold text-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            {statusNotice}
          </span>
        </div>
      )}

      {/* 2. Top Metric Cards (Target, Rendered, Remaining, Pace) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rendered Hours */}
        <div className="neo-card neo-card-mint p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-800">
              Hours Rendered
            </span>
            <Clock className="w-4 h-4 text-zinc-900 stroke-[2.5]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {totalRenderedHours.toFixed(1)} <span className="text-sm font-bold text-zinc-700">hrs</span>
            </div>
            <p className="text-xs font-semibold text-zinc-700 mt-1">
              Across all logged daily entries
            </p>
          </div>
        </div>

        {/* Target Requirement */}
        <div className="neo-card neo-card-butter p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-800">
              Target Requirement
            </span>
            <Briefcase className="w-4 h-4 text-zinc-900 stroke-[2.5]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {targetHours} <span className="text-sm font-bold text-zinc-700">hrs</span>
            </div>
            <p className="text-xs font-semibold text-zinc-700 mt-1">
              Standard Practicum quota
            </p>
          </div>
        </div>

        {/* Hours Remaining */}
        <div className="neo-card neo-card-sky p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-800">
              Hours Remaining
            </span>
            <Clock className="w-4 h-4 text-zinc-900 stroke-[2.5]" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              {remainingHours.toFixed(1)} <span className="text-sm font-bold text-zinc-700">hrs</span>
            </div>
            <p className="text-xs font-semibold text-zinc-700 mt-1">
              {remainingHours === 0 ? 'Goal Completed!' : `~${Math.ceil(remainingHours / 40)} weeks remaining`}
            </p>
          </div>
        </div>

        {/* Total Progress */}
        <div className="neo-card p-5 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-zinc-800">
              Overall Progress
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-extrabold rounded-md bg-[#f8de8c] border-2 border-zinc-900 text-zinc-900">
              {progressPct}%
            </span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-[#faf6ee] border-2 border-zinc-900 rounded-full h-4 overflow-hidden p-0.5">
              <div
                className="bg-[#a3ebb1] h-full rounded-full border-r-2 border-zinc-900 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-zinc-600 mt-2">
              Week {activeWeek} of 16 active
            </p>
          </div>
        </div>
      </section>

      {/* 3. Pre-OJT Requirements Checklist Accordion / Highlight */}
      <section className="neo-card p-5 bg-white flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-zinc-900 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zinc-900 stroke-[2.5]" />
              <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Pre-OJT Requirements Checklist
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#f4b6c2] border border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900">
                {checklist.filter((c) => c.done).length} / {checklist.length} Completed
              </span>
            </div>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              University mandatory documents. Keep hard copies for your finals compilation.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-bold text-zinc-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.5] shrink-0" />
            <span>Printed forms must be in <b>Letter-sized paper only</b> (Not long, not A4).</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklist.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggleChecklist(item.id)}
              className={`p-3 rounded-2xl border-2 border-zinc-900 text-left transition-all flex items-start gap-3 shadow-[2px_2px_0px_#18181b] ${
                item.done ? 'bg-[#a3ebb1]/30' : 'bg-[#faf6ee] hover:bg-white'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 border-zinc-900 flex items-center justify-center shrink-0 mt-0.5 ${
                  item.done ? 'bg-[#a3ebb1] text-zinc-900' : 'bg-white'
                }`}
              >
                {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-extrabold text-zinc-900 ${item.done ? 'line-through text-zinc-500' : ''}`}>
                  {item.title}
                </div>
                <div className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                  {item.detail}
                </div>
                <span className="inline-block mt-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white border border-zinc-900 text-zinc-700">
                  {item.paper_size}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Week Switcher Tabs (1 to 16) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 stroke-[2.5] text-zinc-900" />
            <h2 className="text-sm font-mono font-extrabold uppercase tracking-wider text-zinc-800">
              Select Journal Week (1 - 16)
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))}
              disabled={activeWeek === 1}
              className="p-1.5 rounded-lg bg-white border-2 border-zinc-900 hover:bg-[#f8de8c] disabled:opacity-40 disabled:hover:bg-white shadow-[2px_2px_0px_#18181b]"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="text-xs font-mono font-bold px-2">
              Week {activeWeek} of 16
            </span>
            <button
              type="button"
              onClick={() => setActiveWeek(Math.min(16, activeWeek + 1))}
              disabled={activeWeek === 16}
              className="p-1.5 rounded-lg bg-white border-2 border-zinc-900 hover:bg-[#f8de8c] disabled:opacity-40 disabled:hover:bg-white shadow-[2px_2px_0px_#18181b]"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 16 Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => {
            const daysInW = journals[w] || [];
            const hrsInW = daysInW.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
            const isSelected = w === activeWeek;
            const hasHours = hrsInW > 0;

            return (
              <button
                key={w}
                type="button"
                onClick={() => setActiveWeek(w)}
                className={`shrink-0 px-3.5 py-2 rounded-2xl border-2 border-zinc-900 text-xs font-extrabold transition-all flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-[#f8de8c] text-zinc-900 shadow-[3px_3px_0px_#18181b] translate-y-[-2px]'
                    : hasHours
                    ? 'bg-[#a3ebb1]/40 text-zinc-800 shadow-[2px_2px_0px_#18181b] hover:bg-[#a3ebb1]'
                    : 'bg-white text-zinc-600 shadow-[2px_2px_0px_#18181b] hover:bg-[#faf6ee]'
                }`}
              >
                <span>Week {w}</span>
                <span className="text-[10px] font-mono font-bold text-zinc-700">
                  {hrsInW > 0 ? `${hrsInW}h` : '0h'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. "Automate My Days" Fast Logger & Week Generator */}
      <section className="neo-card p-5 bg-[#faf6ee] flex flex-col gap-4 border-2 border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-900 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-900 stroke-[2.5]" />
              <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
                Automate Week {activeWeek} Activities
              </h3>
            </div>
            <p className="text-xs font-semibold text-zinc-600 mt-0.5">
              Auto-fill daily engineering reports or batch populate a full 5-day week (40.0 hrs).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchFillWeek}
              disabled={isAutoGenerating}
              className="neo-btn-butter px-4 py-2 text-xs flex items-center gap-2 font-extrabold cursor-pointer"
              title="Auto-fills Monday through Friday with realistic 8-hour activities"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isAutoGenerating ? 'animate-spin' : ''}`} />
              Auto-Fill 5-Day Week (40 hrs)
            </button>
          </div>
        </div>

        {/* Quick presets row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono font-extrabold uppercase text-zinc-500 shrink-0">
            Quick Activity Templates:
          </span>
          {PRESET_ACTIVITIES.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => setFormReport(act.text)}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#aee2f5] border-2 border-zinc-900 text-xs font-bold text-zinc-800 shadow-[1px_1px_0px_#18181b] shrink-0 transition-colors"
            >
              {act.label}
            </button>
          ))}
        </div>

        {/* Daily Time & Activity Input Form */}
        <form onSubmit={handleAddDay} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
              Date (MM-DD-YYYY)
            </label>
            <input
              type="text"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              placeholder="11-04-2026"
              className="neo-input px-3 py-2 text-xs font-bold"
            />
          </div>

          {/* Time-In */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
              Time-In
            </label>
            <input
              type="text"
              value={formTimeIn}
              onChange={(e) => handleTimeChange(e.target.value, formTimeOut)}
              placeholder="08:00 AM"
              className="neo-input px-3 py-2 text-xs font-bold"
            />
          </div>

          {/* Time-Out */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
              Time-Out
            </label>
            <input
              type="text"
              value={formTimeOut}
              onChange={(e) => handleTimeChange(formTimeIn, e.target.value)}
              placeholder="05:00 PM"
              className="neo-input px-3 py-2 text-xs font-bold"
            />
          </div>

          {/* Computed Hours */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
              Total Hours
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                className="neo-input px-3 py-2 text-xs font-bold w-20 text-center"
              />
              <span className="text-[10px] font-mono font-bold text-zinc-600">hrs</span>
            </div>
          </div>

          {/* Daily Report Description */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
              Daily Report on Tasks / Activities
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formReport}
                onChange={(e) => setFormReport(e.target.value)}
                placeholder="e.g. Developed components, resolved tickets, attended standup..."
                className="neo-input px-3 py-2 text-xs font-bold flex-1"
              />
              <button
                type="submit"
                className="neo-btn-butter px-4 py-2 text-xs font-extrabold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Log Day
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 6. SOC-OJT Official Weekly Journal Table Preview */}
      <section className="neo-card p-5 bg-white flex flex-col gap-4">
        {/* Table Top Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-zinc-900 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-900 stroke-[2.5]" />
              <h3 className="text-base font-extrabold text-zinc-900 uppercase tracking-tight">
                WEEKLY JOURNAL | ATTENDANCE SHEET | ACTIVITIES LOGBOOK
              </h3>
            </div>
            <p className="text-xs italic font-serif text-zinc-600 mt-1">
              Ephesians 6:7-8 "Serve wholeheartedly, as if you were serving the Lord, not people, because you know that the Lord will reward each one for whatever good they do."
            </p>
          </div>

          {/* Export & Copy Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJournalText}
              className="neo-btn-white px-3 py-2 text-xs flex items-center gap-1.5 font-bold"
              title="Copy markdown table for Canvas"
            >
              <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
              Copy Table
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExporting}
              className="neo-btn-butter px-4 py-2 text-xs flex items-center gap-1.5 font-extrabold"
              title="Export official SOC Word Document (.docx)"
            >
              <Download className={`w-3.5 h-3.5 stroke-[2.5] ${isExporting ? 'animate-bounce' : ''}`} />
              Export DOCX
            </button>
          </div>
        </div>

        {/* Table View Matching Exact Docx Structure */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-zinc-900 text-xs">
            <thead>
              <tr className="bg-[#faf6ee] border-b-2 border-zinc-900 font-extrabold text-zinc-900 text-left">
                <th className="p-3 border-r-2 border-zinc-900 w-32">Date (MM-DD-YYYY)</th>
                <th className="p-3 border-r-2 border-zinc-900 w-28">Time-In</th>
                <th className="p-3 border-r-2 border-zinc-900 w-28">Time-Out</th>
                <th className="p-3 border-r-2 border-zinc-900 w-24 text-center">Total Hours</th>
                <th className="p-3 border-r-2 border-zinc-900">Daily Report on Tasks / Activities Performed</th>
                <th className="p-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeDays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500 font-semibold bg-[#faf6ee]/50">
                    No entries logged for Week {activeWeek} yet. Use "Auto-Fill 5-Day Week" above or log days individually.
                  </td>
                </tr>
              ) : (
                activeDays.map((day, idx) => (
                  <tr key={idx} className="border-b border-zinc-900/40 hover:bg-[#faf6ee] transition-colors">
                    <td className="p-2.5 border-r-2 border-zinc-900 font-mono font-bold">
                      <input
                        type="text"
                        value={day.date}
                        onChange={(e) => handleUpdateDay(idx, 'date', e.target.value)}
                        className="w-full bg-transparent border-none focus:outline-none font-mono font-bold"
                      />
                    </td>
                    <td className="p-2.5 border-r-2 border-zinc-900 font-mono">
                      <input
                        type="text"
                        value={day.time_in}
                        onChange={(e) => handleUpdateDay(idx, 'time_in', e.target.value)}
                        className="w-full bg-transparent border-none focus:outline-none font-mono"
                      />
                    </td>
                    <td className="p-2.5 border-r-2 border-zinc-900 font-mono">
                      <input
                        type="text"
                        value={day.time_out}
                        onChange={(e) => handleUpdateDay(idx, 'time_out', e.target.value)}
                        className="w-full bg-transparent border-none focus:outline-none font-mono"
                      />
                    </td>
                    <td className="p-2.5 border-r-2 border-zinc-900 text-center font-mono font-extrabold text-zinc-900">
                      <input
                        type="text"
                        value={day.hours}
                        onChange={(e) => handleUpdateDay(idx, 'hours', e.target.value)}
                        className="w-full text-center bg-transparent border-none focus:outline-none font-mono font-extrabold"
                      />
                    </td>
                    <td className="p-2.5 border-r-2 border-zinc-900">
                      <textarea
                        rows={2}
                        value={day.report}
                        onChange={(e) => handleUpdateDay(idx, 'report', e.target.value)}
                        className="w-full bg-transparent border-none focus:outline-none resize-none font-medium leading-relaxed"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteDay(idx)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Day"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Week Summary Row Matching Docx */}
            <tfoot>
              <tr className="bg-[#f8de8c] font-mono font-extrabold text-zinc-900 border-t-2 border-zinc-900">
                <td className="p-3 border-r-2 border-zinc-900">Week No:</td>
                <td className="p-3 border-r-2 border-zinc-900 text-center">{activeWeek}</td>
                <td className="p-3 border-r-2 border-zinc-900">Total:</td>
                <td className="p-3 border-r-2 border-zinc-900 text-center text-sm font-black">
                  {activeWeekHours.toFixed(1)}
                </td>
                <td colSpan={2} className="p-3 font-sans font-bold text-xs text-zinc-800">
                  {activeWeekHours >= 40 ? '✓ Standard 40 hrs complete' : `${(40 - activeWeekHours).toFixed(1)} hrs below 40-hr threshold`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Documentation Photo & Caption Input */}
        <div className="neo-card p-3.5 bg-[#faf6ee] border-2 border-zinc-900 flex flex-col gap-2">
          <label className="text-[10px] font-mono font-extrabold uppercase text-zinc-700">
            Weekly Photo Documentation & Caption
          </label>
          <input
            type="text"
            value={activeCaption}
            onChange={(e) => {
              const next = { ...captions, [activeWeek]: e.target.value };
              saveCaptions(next);
            }}
            placeholder="e.g. Attending sprint review with engineering mentor; testing UI components..."
            className="neo-input px-3 py-2 text-xs font-medium"
          />
        </div>

        {/* Signatures & Company Footer Matching Docx */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Student Signature Box */}
          <div className="p-3.5 rounded-2xl border-2 border-zinc-900 bg-[#faf6ee] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase text-zinc-500">
              STUDENT'S SIGNATURE & DATE
            </span>
            <div className="mt-4 pt-2 border-t-2 border-zinc-900 flex items-center justify-between text-xs font-bold">
              <span>{studentName}</span>
              <span className="font-mono text-zinc-600">
                {pad(now.getMonth() + 1)}-{pad(now.getDate())}-{now.getFullYear()}
              </span>
            </div>
          </div>

          {/* Supervisor Signature Box */}
          <div className="p-3.5 rounded-2xl border-2 border-zinc-900 bg-[#faf6ee] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-extrabold uppercase text-zinc-500">
                APPROVED: SUPERVISOR'S SIGNATURE & DATE
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                {companyName}
              </span>
            </div>
            <div className="mt-4 pt-2 border-t-2 border-zinc-900 flex items-center justify-between text-xs font-bold">
              <span>{supervisorName}</span>
              <span className="font-mono text-zinc-600">Pending Sign-off</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neo-card p-6 bg-white max-w-md w-full flex flex-col gap-4 border-2 border-zinc-900">
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-3">
              <h3 className="text-base font-extrabold text-zinc-900 tracking-tight">
                OJT Practicum Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 rounded-lg bg-[#faf6ee] border-2 border-zinc-900 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="neo-input w-full px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-700 mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="neo-input w-full px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-700 mb-1">
                  Supervisor Name
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="neo-input w-full px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-extrabold uppercase text-zinc-700 mb-1">
                  Total Target Hours (e.g. 300 or 486 or 500)
                </label>
                <input
                  type="number"
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="neo-input w-full px-3 py-2 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-zinc-900">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="neo-btn-white px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveConfig(studentName, companyName, supervisorName, targetHours);
                  setShowConfigModal(false);
                }}
                className="neo-btn-butter px-4 py-2 text-xs font-extrabold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

