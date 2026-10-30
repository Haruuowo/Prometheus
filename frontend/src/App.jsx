import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import { TOOL_REGISTRY } from './tools/registry';
import { isFirebaseConfigured, auth, onAuthStateChanged } from './firebase';
import './styles/odysseus.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysKey(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return toDateKey(d);
}

function getRelativeDayLabel(dateStr, todayStr) {
  if (!dateStr) return '';
  if (dateStr === todayStr) return 'DUE TODAY';
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays > 1) return `IN ${diffDays}D`;
  if (diffDays === -1) return 'YESTERDAY';
  return `${Math.abs(diffDays)}D AGO`;
}

function buildMonthlyGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    cells.push({
      dateKey: toDateKey(d),
      dayNum: d.getDate(),
      inCurrentMonth: false
    });
  }
  for (let dNum = 1; dNum <= daysInMonth; dNum++) {
    const d = new Date(year, month, dNum);
    cells.push({
      dateKey: toDateKey(d),
      dayNum: dNum,
      inCurrentMonth: true
    });
  }
  const totalSlots = cells.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (cells.length < totalSlots) {
    const d = new Date(year, month + 1, nextDay++);
    cells.push({
      dateKey: toDateKey(d),
      dayNum: d.getDate(),
      inCurrentMonth: false
    });
  }
  return cells;
}

function buildContributionCalendar(daysList = []) {
  let items = daysList;
  if (!items || items.length === 0) {
    const fallback = [];
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      fallback.push({
        date: d.toISOString().slice(0, 10),
        level: 0,
        count: 0
      });
    }
    items = fallback;
  }

  const weeks = [];
  let currentWeek = new Array(7).fill(null);

  items.forEach((dayObj, idx) => {
    const dt = new Date(dayObj.date + 'T00:00:00');
    const dow = dt.getDay();
    currentWeek[dow] = dayObj;
    if (dow === 6 || idx === items.length - 1) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  });

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((wk, wIdx) => {
    const firstValid = wk.find(Boolean);
    if (firstValid) {
      const m = new Date(firstValid.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        if (monthLabels.length === 0 || wIdx - monthLabels[monthLabels.length - 1].weekIndex >= 3) {
          monthLabels.push({ label: MONTH_NAMES[m], weekIndex: wIdx });
        }
        lastMonth = m;
      }
    }
  });

  return { weeks, monthLabels };
}

export default function App() {
  // User & GitHub Auth
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Active Top-Level View Tab: 'OVERVIEW' | 'CALENDAR' | 'NOTES' | 'PROJECT'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('project')) return 'PROJECT';
    if (params.get('tab') === 'calendar') return 'CALENDAR';
    if (params.get('tab') === 'notes') return 'NOTES';
    return 'OVERVIEW';
  });

  // Connected GitHub Student Profile & Contribution Year
  const [githubUsername, setGithubUsername] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [githubInput, setGithubInput] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [contribYear, setContribYear] = useState('last');
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  // Calendar & Deadlines State
  const todayObj = new Date();
  const todayKey = toDateKey(todayObj);
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [deadlines, setDeadlines] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_deadlines_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const now = new Date();
    return [
      {
        id: 'dl_1',
        title: 'CS301 Graph Algorithms Lab Submission',
        date: addDaysKey(now, 0),
        time: '11:59 PM',
        category: 'LAB',
        done: false
      },
      {
        id: 'dl_2',
        title: 'Deploy Prometheus Portfolio to Vercel',
        date: addDaysKey(now, 2),
        time: '6:00 PM',
        category: 'PROJECT',
        done: false
      },
      {
        id: 'dl_3',
        title: 'Operating Systems Midterm (Processes & Virtual Memory)',
        date: addDaysKey(now, 5),
        time: '10:00 AM',
        category: 'EXAM',
        done: false
      },
      {
        id: 'dl_4',
        title: 'University Hackathon Demo & Pitch',
        date: addDaysKey(now, 9),
        time: '5:00 PM',
        category: 'HACKATHON',
        done: false
      }
    ];
  });

  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineCategory, setNewDeadlineCategory] = useState('LAB');
  const [newDeadlineTime, setNewDeadlineTime] = useState('11:59 PM');
  const [deadlineFilter, setDeadlineFilter] = useState('UPCOMING');

  // Structured Notes Pages State (Moved to dedicated Notes tab)
  const [notionPages, setNotionPages] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_notion_pages_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'pg_1',
        title: 'CS Semester Hub & Study Roadmap',
        category: 'SEMESTER',
        content: `# CS Semester Hub\n\n## Weekly Priorities\n- [x] Sync GitHub repositories & contribution graph\n- [ ] Finish Graph BFS / Dijkstra Lab before Friday 11:59 PM\n- [ ] Deploy full-stack project on Vercel + Render\n\n## Key Local Commands\n- Run Frontend: npm run dev\n- Run Backend: python backend/main.py`
      },
      {
        id: 'pg_2',
        title: 'SWE Internship & Portfolio Checklist',
        category: 'CAREER',
        content: `# SWE Internship Tracker\n\n## Portfolio Highlights\n1. Prometheus / Odysseus: CS Student Productivity & GitHub Workspace\n2. Clean README.md with architecture diagrams & live demo links\n3. Practice 2 DSA flashcards + 1 Big-O analysis daily`
      },
      {
        id: 'pg_3',
        title: 'Algorithms & Complexity Cheat Sheet',
        category: 'CS NOTES',
        content: `# Algorithms Reference\n\n- Hash Map Lookup: O(1) average, O(n) worst-case\n- Binary Search / Balanced BST: O(log n)\n- Merge Sort / Heap Sort: O(n log n) time\n- BFS: Shortest path on unweighted graphs O(V + E)`
      }
    ];
  });
  const [activePageId, setActivePageId] = useState('pg_1');
  const [pageSaveNotice, setPageSaveNotice] = useState('');

  // Focused Project Workspace State (Opened in its own tab when clicking a repo)
  const [selectedProject, setSelectedProject] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const repoFromUrl = params.get('project');
    if (repoFromUrl) {
      return {
        name: repoFromUrl,
        language: 'Code',
        description: 'GitHub Project Repository',
        stars: 0,
        updated_at: 'Recently',
        html_url: `https://github.com/Haruuowo/${repoFromUrl}`
      };
    }
    return null;
  });

  const [projectStore, setProjectStore] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_project_notes_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      Prometheus: {
        todos: [
          { id: 't1', text: 'Connect custom domain on Vercel', tag: 'DEPLOY', done: false },
          { id: 't2', text: 'Add more CS interview flashcards', tag: 'FEATURE', done: false }
        ],
        important: [
          { id: 'imp_1', label: 'Frontend Dev Command', value: 'cd frontend && npm run dev' },
          { id: 'imp_2', label: 'Backend API Command', value: 'python backend/main.py' },
          { id: 'imp_3', label: 'Deployment Target', value: 'Vercel (Frontend) + Render (FastAPI)' }
        ],
        notes: 'Main Odysseus CS Student Workspace.\n\nArchitecture:\n- Frontend: React + Vite (port 5173)\n- Backend: FastAPI (port 8085)\n- Auth: GitHub OAuth & Username Sync'
      }
    };
  });

  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTag, setNewTodoTag] = useState('FEATURE');
  const [todoFilter, setTodoFilter] = useState('ALL');
  const [projectSyncStatus, setProjectSyncStatus] = useState('');
  const [repoActivity, setRepoActivity] = useState(null);
  const [repoActivityLoading, setRepoActivityLoading] = useState(false);

  // Active Tool Modal (for the 9 CS Student tools)
  const [activeToolId, setActiveToolId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRepoActivity = async (owner, repoName) => {
    if (!repoName) return;
    setRepoActivityLoading(true);
    try {
      const res = await fetch(
        `/api/github/repo-activity?user=${encodeURIComponent(owner || githubUsername || 'Haruuowo')}&repo=${encodeURIComponent(repoName)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRepoActivity(data);
      }
    } catch (e) {}
    setRepoActivityLoading(false);
  };

  useEffect(() => {
    if (selectedProject?.name) {
      fetchRepoActivity(githubUsername, selectedProject.name);
    }
  }, [selectedProject?.name, githubUsername]);

  const saveDeadlines = (nextList) => {
    setDeadlines(nextList);
    try {
      localStorage.setItem('odysseus_deadlines_v2', JSON.stringify(nextList));
    } catch (e) {}
  };

  const saveNotionPages = (nextPages) => {
    setNotionPages(nextPages);
    try {
      localStorage.setItem('odysseus_notion_pages_v2', JSON.stringify(nextPages));
    } catch (e) {}
  };

  const saveProjectStore = (nextStore) => {
    setProjectStore(nextStore);
    try {
      localStorage.setItem('odysseus_project_notes_v2', JSON.stringify(nextStore));
    } catch (e) {}
  };

  const getRepoData = (repoName) => {
    const existing = projectStore[repoName];
    if (existing) {
      return {
        todos: existing.todos || [],
        important: existing.important || [],
        notes: existing.notes || ''
      };
    }
    return { todos: [], important: [], notes: '' };
  };

  // Open a project in the dedicated Project Tab
  const handleOpenProjectTab = (repoObj) => {
    setSelectedProject(repoObj);
    setActiveTab('PROJECT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddDeadline = async (e) => {
    e.preventDefault();
    if (!newDeadlineTitle.trim()) return;
    const item = {
      id: `dl_${Date.now()}`,
      title: newDeadlineTitle.trim(),
      date: selectedDate,
      time: newDeadlineTime.trim() || '11:59 PM',
      category: newDeadlineCategory,
      done: false
    };
    const next = [...deadlines, item].sort((a, b) => a.date.localeCompare(b.date));
    saveDeadlines(next);
    setNewDeadlineTitle('');

    try {
      const headers = await getAuthHeader();
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${item.category}] ${item.title}`,
          time: `${item.date} • ${item.time}`
        })
      });
    } catch (err) {}
  };

  const handleToggleDeadline = (id) => {
    const next = deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d));
    saveDeadlines(next);
  };

  const handleDeleteDeadline = (id) => {
    const next = deadlines.filter((d) => d.id !== id);
    saveDeadlines(next);
  };

  const handleCreateNotionPage = () => {
    const newId = `pg_${Date.now()}`;
    const newPage = {
      id: newId,
      title: `Untitled Note (${selectedDate})`,
      category: 'NOTE',
      content: `# Untitled Note\n\nWrite your lecture notes, project specs, or checklist items here...`
    };
    const next = [...notionPages, newPage];
    saveNotionPages(next);
    setActivePageId(newId);
  };

  const handleDeleteNotionPage = (id) => {
    if (notionPages.length <= 1) return;
    const next = notionPages.filter((p) => p.id !== id);
    saveNotionPages(next);
    if (activePageId === id && next[0]) {
      setActivePageId(next[0].id);
    }
  };

  const handleUpdateActivePage = (field, val) => {
    const next = notionPages.map((p) => (p.id === activePageId ? { ...p, [field]: val } : p));
    saveNotionPages(next);
  };

  const handleSyncActivePageToVault = async () => {
    const current = notionPages.find((p) => p.id === activePageId);
    if (!current) return;
    setPageSaveNotice('Saving to Vault...');
    try {
      const headers = await getAuthHeader();
      await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: current.title,
          content: current.content,
          source_type: 'notion_page'
        })
      });
      setPageSaveNotice('Saved to Notes Vault');
    } catch (e) {
      setPageSaveNotice('Saved locally');
    }
    setTimeout(() => setPageSaveNotice(''), 2200);
  };

  const handleAddProjectTodo = (e) => {
    e.preventDefault();
    if (!selectedProject || !newTodoText.trim()) return;
    const rName = selectedProject.name;
    const current = getRepoData(rName);
    const updatedTodos = [
      ...current.todos,
      { id: `td_${Date.now()}`, text: newTodoText.trim(), tag: newTodoTag, done: false }
    ];
    const nextStore = {
      ...projectStore,
      [rName]: { ...current, todos: updatedTodos }
    };
    saveProjectStore(nextStore);
    setNewTodoText('');
    syncProjectToSecondBrain(rName, updatedTodos, current.notes);
  };

  const handleToggleProjectTodo = (repoName, todoId) => {
    const current = getRepoData(repoName);
    const updatedTodos = current.todos.map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    );
    const nextStore = {
      ...projectStore,
      [repoName]: { ...current, todos: updatedTodos }
    };
    saveProjectStore(nextStore);
    syncProjectToSecondBrain(repoName, updatedTodos, current.notes);
  };

  const handleDeleteProjectTodo = (repoName, todoId) => {
    const current = getRepoData(repoName);
    const updatedTodos = current.todos.filter((t) => t.id !== todoId);
    const nextStore = {
      ...projectStore,
      [repoName]: { ...current, todos: updatedTodos }
    };
    saveProjectStore(nextStore);
  };

  const handlePinProjectTodoToCalendar = (repoName, todoItem) => {
    const newDl = {
      id: `dl_${Date.now()}`,
      title: `[${repoName}] ${todoItem.text}`,
      date: selectedDate,
      time: '11:59 PM',
      category: 'PROJECT',
      done: Boolean(todoItem.done)
    };
    const next = [...deadlines, newDl].sort((a, b) => a.date.localeCompare(b.date));
    saveDeadlines(next);
    setProjectSyncStatus(`Added to Calendar (${selectedDate})`);
    setTimeout(() => setProjectSyncStatus(''), 2200);
  };

  const handleChangeProjectNotes = (repoName, notesVal) => {
    const current = getRepoData(repoName);
    const nextStore = {
      ...projectStore,
      [repoName]: { ...current, notes: notesVal }
    };
    saveProjectStore(nextStore);
  };

  const syncProjectToSecondBrain = async (repoName, todosList, notesText) => {
    setProjectSyncStatus('Saving project workspace...');
    try {
      const headers = await getAuthHeader();
      const pending = todosList.filter((t) => !t.done).map((t) => `[${t.tag}] ${t.text}`).join('; ');
      const completed = todosList.filter((t) => t.done).map((t) => t.text).join('; ');
      const summaryContent = `Project: ${repoName}\nPending To-Dos: ${pending || 'None'}\nCompleted: ${completed || 'None'}\nNotes: ${notesText || 'None'}`;
      await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Project Plan: ${repoName}`,
          content: summaryContent,
          source_type: 'project_plan'
        })
      });
      setProjectSyncStatus('Saved');
    } catch (e) {
      setProjectSyncStatus('Saved locally');
    }
    setTimeout(() => setProjectSyncStatus(''), 2000);
  };

  // Fetch GitHub Overview, Repos & Contributions
  const fetchGithubProfile = async (targetUser, targetYear = contribYear) => {
    const cleanUser = (targetUser || 'Haruuowo').trim();
    setGithubLoading(true);
    try {
      const res = await fetch(
        `/api/github/overview?user=${encodeURIComponent(cleanUser)}&year=${encodeURIComponent(targetYear)}`
      );
      if (res.ok) {
        const data = await res.json();
        setGithubData(data);
        setGithubUsername(data.username || cleanUser);
        try { localStorage.setItem('odysseus_github_user', data.username || cleanUser); } catch (e) {}

        // If URL had ?project=RepoName, enrich selectedProject once githubData loads
        if (selectedProject && data.repos) {
          const matched = data.repos.find(
            (r) => r.name.toLowerCase() === selectedProject.name.toLowerCase()
          );
          if (matched) setSelectedProject(matched);
        }
      }
    } catch (e) {}
    setGithubLoading(false);
  };

  useEffect(() => {
    fetchGithubProfile(githubUsername, contribYear);
  }, []);

  const handleSelectYear = (yr) => {
    setContribYear(yr);
    fetchGithubProfile(githubUsername, yr);
  };

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        const screenName = currentUser?.reloadUserInfo?.screenName;
        if (screenName && screenName !== githubUsername) {
          setGithubInput(screenName);
          fetchGithubProfile(screenName, contribYear);
        }
      });
      return () => unsub();
    }
  }, []);

  const getAuthHeader = async () => {
    if (user && typeof user.getIdToken === 'function') {
      try {
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` };
      } catch (e) {}
    }
    if (githubUsername) {
      return { Authorization: `Bearer github_${githubUsername}` };
    }
    return { Authorization: 'Bearer dev' };
  };

  // Calendar Month Navigation
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  };

  const calendarCells = buildMonthlyGrid(calYear, calMonth);

  const upcomingDeadlines = deadlines
    .filter((d) => !d.done)
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredDeadlines = deadlines
    .filter((d) => {
      if (deadlineFilter === 'SELECTED_DATE') return d.date === selectedDate;
      if (deadlineFilter === 'DONE') return d.done;
      return !d.done;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const activeNotionPage = notionPages.find((p) => p.id === activePageId) || notionPages[0];

  const contribTotal = githubData?.contributions?.total ?? 265;
  const { weeks: contribWeeks, monthLabels } = buildContributionCalendar(
    githubData?.contributions?.days || []
  );

  const categories = [
    'ALL',
    'DEPLOY & HOSTING',
    'CS FUNDAMENTALS',
    'GITHUB & CAREER',
    'CODE & LABS',
    'INTERVIEW PREP',
    'STUDY & NOTES',
    'PRODUCTIVITY'
  ];

  const filteredTools = TOOL_REGISTRY.filter((t) => {
    const matchCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeTool = TOOL_REGISTRY.find((t) => t.id === activeToolId);
  const ActiveToolComponent = activeTool?.component;
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || null;

  return (
    <div className="odysseus-page">
      {/* ── Top Header & Workspace View Switcher ── */}
      <header className="odysseus-header">
        <div className="odysseus-brand">
          <div className="odysseus-brand-top">
            <span className="odysseus-tag">ODYSSEUS // CS WORKSPACE</span>
            <span className="odysseus-status">
              <span className="odysseus-status-dot" />
              GITHUB SYNCED
            </span>
          </div>
          <h1 className="odysseus-title">Computer Science Workspace</h1>
          <p className="odysseus-subtitle">
            Manage your repositories, project tasks, deadline calendar, and engineering tools in one place.
          </p>
        </div>

        <div className="workspace-nav-bar">
          {/* Segmented View Tabs */}
          <nav className="workspace-tabs">
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
              onClick={() => setActiveTab('OVERVIEW')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'CALENDAR' ? 'active' : ''}`}
              onClick={() => setActiveTab('CALENDAR')}
            >
              Calendar
              <span className="tab-count-pill">{upcomingDeadlines.length}</span>
            </button>
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'NOTES' ? 'active' : ''}`}
              onClick={() => setActiveTab('NOTES')}
            >
              Notes
              <span className="tab-count-pill">{notionPages.length}</span>
            </button>
            {selectedProject && (
              <button
                type="button"
                className={`workspace-tab-btn project-tab ${activeTab === 'PROJECT' ? 'active' : ''}`}
                onClick={() => setActiveTab('PROJECT')}
              >
                Project: {selectedProject.name}
              </button>
            )}
          </nav>

          {/* Right Header Controls */}
          <div className="odysseus-header-actions">
            <button
              type="button"
              className="odysseus-pill-btn"
              onClick={() => setActiveToolId('deploy_hub')}
              style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b' }}
            >
              Deploy Hub
            </button>
            <button
              type="button"
              className="odysseus-pill-btn"
              onClick={() => setShowAuth(true)}
            >
              {githubData?.avatar_url ? (
                <img
                  src={githubData.avatar_url}
                  alt={githubUsername}
                  style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              {githubUsername ? `@${githubUsername}` : (userDisplayName || 'Sign in with GitHub')}
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          TAB 1: OVERVIEW (CLEAN LANDING PAGE)
         ===================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* ── Top Summary Strip: Upcoming Deadlines + Notes Preview ── */}
          <section className="overview-summary-grid">
            {/* Left Card: Upcoming Deadlines Summary */}
            <div className="summary-card">
              <div>
                <div className="summary-card-top">
                  <div className="summary-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>Upcoming Deadlines</span>
                    <span className="tab-count-pill">{upcomingDeadlines.length} active</span>
                  </div>
                  <button
                    type="button"
                    className="summary-link-btn"
                    onClick={() => setActiveTab('CALENDAR')}
                  >
                    Open Full Calendar &rarr;
                  </button>
                </div>

                <div className="summary-list" style={{ marginTop: 14 }}>
                  {upcomingDeadlines.slice(0, 3).map((dl) => {
                    const rel = getRelativeDayLabel(dl.date, todayKey);
                    return (
                      <div key={dl.id} className="summary-item-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={dl.done}
                            onChange={() => handleToggleDeadline(dl.id)}
                            style={{ width: 15, height: 15, accentColor: '#f59e0b', cursor: 'pointer' }}
                          />
                          <span className={`deadline-pill cat-${dl.category || 'LAB'}`}>
                            {dl.category || 'LAB'}
                          </span>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#f3f4f6',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {dl.title}
                          </span>
                        </div>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: dl.date <= todayKey ? '#f43f5e' : '#9ca3af',
                          flexShrink: 0
                        }}>
                          {dl.date} {rel ? `(${rel})` : ''}
                        </span>
                      </div>
                    );
                  })}
                  {upcomingDeadlines.length === 0 && (
                    <div style={{ padding: '14px 0', color: '#6b7280', fontSize: 13 }}>
                      No upcoming deadlines. Open the Calendar tab to schedule labs, exams, or milestones.
                    </div>
                  )}
                </div>
              </div>

              <form
                onSubmit={handleAddDeadline}
                style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid #1e222b' }}
              >
                <input
                  type="text"
                  className="notion-input"
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  placeholder={`Quick add deadline for ${selectedDate}...`}
                  style={{ padding: '8px 12px', fontSize: 12.5 }}
                />
                <button type="submit" className="notion-gold-btn" style={{ padding: '8px 14px' }}>
                  + Add
                </button>
              </form>
            </div>

            {/* Right Card: Course & Project Notes Summary */}
            <div className="summary-card">
              <div>
                <div className="summary-card-top">
                  <div className="summary-card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Saved Pages & Course Notes</span>
                  </div>
                  <button
                    type="button"
                    className="summary-link-btn"
                    onClick={() => setActiveTab('NOTES')}
                    style={{ color: '#38bdf8' }}
                  >
                    Open Notes Workspace &rarr;
                  </button>
                </div>

                <div className="summary-list" style={{ marginTop: 14 }}>
                  {notionPages.slice(0, 3).map((pg) => (
                    <div
                      key={pg.id}
                      className="summary-item-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePageId(pg.id);
                        setActiveTab('NOTES');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(56, 189, 248, 0.14)',
                          color: '#38bdf8'
                        }}>
                          {pg.category || 'DOC'}
                        </span>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#f3f4f6',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {pg.title}
                        </span>
                      </div>
                      <span style={{ fontSize: 11.5, color: '#6b7280', flexShrink: 0 }}>
                        Open &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #1e222b' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {notionPages.length} structured markdown documents
                </span>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={() => {
                    handleCreateNotionPage();
                    setActiveTab('NOTES');
                  }}
                >
                  + New Note Page
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 2: GitHub Profile & Contribution Graph ── */}
          <section className="github-hub">
            <div className="github-hub-top">
              <div className="github-profile-row">
                {githubData?.avatar_url && (
                  <img src={githubData.avatar_url} alt={githubUsername} className="github-avatar" />
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 18, color: '#ffffff' }}>@{githubData?.username || githubUsername}</b>
                    <a
                      href={`https://github.com/${githubData?.username || githubUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11.5, color: '#f59e0b', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      GitHub Profile &rarr;
                    </a>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>
                    {githubData?.bio || 'Computer Science Student • Active Repositories & Contribution Graph'}
                  </div>
                </div>
              </div>

              <div className="github-stats-row">
                <div className="github-stat-pill">
                  Repos: <b>{githubData?.public_repos ?? 0}</b>
                </div>
                <div className="github-stat-pill">
                  Stars: <b>{githubData?.total_stars ?? 0}</b>
                </div>
                <div className="github-stat-pill">
                  Followers: <b>{githubData?.followers ?? 0}</b>
                </div>

                <form
                  className="github-connect-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchGithubProfile(githubInput, contribYear);
                  }}
                >
                  <input
                    type="text"
                    className="github-connect-input"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    placeholder="GitHub username..."
                  />
                  <button type="submit" className="odysseus-pill-btn" disabled={githubLoading}>
                    {githubLoading ? 'Syncing...' : 'Sync GitHub'}
                  </button>
                </form>
              </div>
            </div>

            {/* GitHub Contributions Heatmap */}
            <div className="gh-contrib-wrapper">
              <div>
                <div className="gh-contrib-header">
                  <span className="gh-contrib-title">
                    {contribTotal} contributions {contribYear === 'last' ? 'in the last year' : `in ${contribYear}`}
                  </span>
                  <span className="gh-contrib-settings">Contribution settings</span>
                </div>

                <div className="gh-contrib-box">
                  <div className="gh-contrib-months">
                    {monthLabels.map((m, i) => (
                      <span
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${32 + m.weekIndex * 14}px`
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>

                  <div className="gh-contrib-grid-row">
                    <div className="gh-contrib-days-col">
                      <span />
                      <span>Mon</span>
                      <span />
                      <span>Wed</span>
                      <span />
                      <span>Fri</span>
                      <span />
                    </div>

                    <div className="gh-contrib-weeks">
                      {contribWeeks.map((week, wIdx) => (
                        <div key={wIdx} className="gh-contrib-week-col">
                          {week.map((day, dIdx) =>
                            day ? (
                              <div
                                key={day.date}
                                className={`gh-contrib-cell gh-level-${day.level || 0}`}
                                title={`${day.date}: ${day.level > 0 ? `Level ${day.level} contributions` : 'No contributions'}`}
                              />
                            ) : (
                              <div key={dIdx} style={{ width: 11, height: 11 }} />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="gh-contrib-footer">
                    <span>Learn how we count contributions</span>
                    <div className="gh-contrib-legend">
                      <span style={{ marginRight: 2 }}>Less</span>
                      <span className="gh-contrib-cell gh-level-0" />
                      <span className="gh-contrib-cell gh-level-1" />
                      <span className="gh-contrib-cell gh-level-2" />
                      <span className="gh-contrib-cell gh-level-3" />
                      <span className="gh-contrib-cell gh-level-4" />
                      <span style={{ marginLeft: 2 }}>More</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gh-years-col">
                {[
                  { id: 'last', label: '2026' },
                  { id: '2025', label: '2025' },
                  { id: '2024', label: '2024' }
                ].map((yr) => (
                  <button
                    key={yr.id}
                    type="button"
                    className={`gh-year-btn ${contribYear === yr.id ? 'active' : ''}`}
                    onClick={() => handleSelectYear(yr.id)}
                  >
                    {yr.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 3: Your GitHub Repositories (Clean Full-Width 3-Column Odysseus Grid) ── */}
          <section className="tools-section">
            <div className="section-header-row">
              <div>
                <div className="section-label">GITHUB REPOSITORIES // PROJECT WORKSPACES</div>
                <h2 className="section-heading">
                  Your Projects ({githubData?.repos?.length || 0})
                </h2>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(githubData?.top_languages || []).slice(0, 5).map((l) => (
                  <span
                    key={l.name}
                    style={{
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: '#14161a',
                      border: '1px solid #23262f',
                      color: '#9ca3af'
                    }}
                  >
                    {l.name} ({l.count})
                  </span>
                ))}
              </div>
            </div>

            <div className="odysseus-cards-grid">
              {(githubData?.repos || []).slice(0, 6).map((repo) => {
                const pData = getRepoData(repo.name);
                const pendingCount = (pData.todos || []).filter((t) => !t.done).length;
                const nextTodo = (pData.todos || []).find((t) => !t.done);
                const hasImportant = (pData.important || []).length > 0;

                return (
                  <div
                    key={repo.id || repo.name}
                    className={`odysseus-card ${pendingCount > 0 ? 'holiday-pick' : ''}`}
                    onClick={() => handleOpenProjectTab(repo)}
                  >
                    <div>
                      <div className="odysseus-card-top">
                        <div className="odysseus-card-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>

                        <div className="odysseus-card-badges">
                          {pendingCount > 0 && (
                            <span className="badge-holiday">
                              {pendingCount} {pendingCount === 1 ? 'TASK' : 'TASKS'}
                            </span>
                          )}
                          <span className="badge-ready">
                            <span className="badge-ready-dot" />
                            {repo.language || 'CODE'}
                          </span>
                        </div>
                      </div>

                      <div className="odysseus-card-body">
                        <h3 className="odysseus-card-title">{repo.name}</h3>
                        <p className="odysseus-card-desc">
                          {repo.description || 'Computer Science repository synced with Odysseus.'}
                        </p>

                        <div style={{
                          marginTop: 12,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: '#0e1014',
                          border: '1px solid #1f232c',
                          fontSize: 11.5,
                          color: nextTodo ? '#e5e7eb' : '#6b7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {nextTodo
                            ? `Next: ${nextTodo.text}`
                            : (pData.notes || hasImportant
                                ? 'Project notes & links saved'
                                : 'Click to open project workspace & to-dos')}
                        </div>
                      </div>
                    </div>

                    <div className="odysseus-card-footer">
                      <span className="odysseus-card-category">
                        {repo.stars > 0 ? `${repo.stars} STARS • ` : ''}UPDATED {repo.updated_at}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <a
                          href={`/?project=${encodeURIComponent(repo.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 11.5,
                            color: '#9ca3af',
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                          title="Open this project in a new browser tab"
                        >
                          New Tab &#8599;
                        </a>
                        <span className="odysseus-card-open">
                          Open Project &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Section 4: CS Student Tool Cards Grid ── */}
          <section className="tools-section">
            <div className="section-header-row">
              <div>
                <div className="section-label">STUDENT TOOLKIT // ENGINEERING UTILITIES</div>
                <h2 className="section-heading">CS Student Tools</h2>
              </div>
            </div>

            <div className="tools-filter-bar">
              <div className="tools-categories">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="tools-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CS tools (Vercel, Big-O, README, Git)..."
              />
            </div>

            <div className="odysseus-cards-grid">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`odysseus-card ${tool.isHolidayPick ? 'holiday-pick' : ''}`}
                  onClick={() => setActiveToolId(tool.id)}
                >
                  <div>
                    <div className="odysseus-card-top">
                      <div className="odysseus-card-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>

                      <div className="odysseus-card-badges">
                        {tool.isHolidayPick && (
                          <span className="badge-holiday">
                            STUDENT PICK
                          </span>
                        )}
                        <span className="badge-ready">
                          <span className="badge-ready-dot" />
                          READY
                        </span>
                      </div>
                    </div>

                    <div className="odysseus-card-body">
                      <h3 className="odysseus-card-title">{tool.name}</h3>
                      <p className="odysseus-card-desc">{tool.description}</p>
                    </div>
                  </div>

                  <div className="odysseus-card-footer">
                    <span className="odysseus-card-category">{tool.category}</span>
                    <button
                      type="button"
                      className="odysseus-card-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveToolId(tool.id);
                      }}
                    >
                      Open &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* =====================================================================
          TAB 2: DEDICATED CALENDAR & DEADLINES VIEW
         ===================================================================== */}
      {activeTab === 'CALENDAR' && (
        <section className="calendar-view-layout">
          {/* Left: Full Monthly Calendar */}
          <div className="calendar-panel">
            <div className="calendar-header">
              <div className="calendar-title-group">
                <span className="calendar-month-title">
                  {FULL_MONTH_NAMES[calMonth]} {calYear}
                </span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '3px 10px',
                  borderRadius: 999
                }}>
                  Selected: {selectedDate}
                </span>
              </div>

              <div className="calendar-nav-btns">
                <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>
                  &larr; Prev
                </button>
                <button type="button" className="calendar-nav-btn" onClick={handleJumpToday}>
                  Today
                </button>
                <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>
                  Next &rarr;
                </button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarCells.map((cell) => {
                const dayEvents = deadlines.filter((d) => d.date === cell.dateKey);
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDate;

                return (
                  <div
                    key={cell.dateKey}
                    className={`calendar-day ${!cell.inCurrentMonth ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDate(cell.dateKey)}
                  >
                    <div className="calendar-day-num">
                      <span>{cell.dayNum}</span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: 9.5, color: '#9ca3af' }}>{dayEvents.length}</span>
                      )}
                    </div>

                    <div className="calendar-day-events">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`deadline-pill cat-${ev.category || 'LAB'} ${ev.done ? 'done' : ''}`}
                          title={`${ev.title} (${ev.time})`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 9.5, color: '#9ca3af', paddingLeft: 2 }}>
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Add Deadline & Schedule List */}
          <div className="notion-side-panel">
            <div>
              <span className="section-label">SCHEDULE & DEADLINES</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                Add Task or Deadline
              </h3>
            </div>

            <form onSubmit={handleAddDeadline} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16, borderBottom: '1px solid #232730' }}>
              <input
                type="text"
                className="notion-input"
                value={newDeadlineTitle}
                onChange={(e) => setNewDeadlineTitle(e.target.value)}
                placeholder={`Deadline title for ${selectedDate}...`}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                <select
                  className="notion-input"
                  value={newDeadlineCategory}
                  onChange={(e) => setNewDeadlineCategory(e.target.value)}
                  style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}
                >
                  <option value="LAB">LAB / HW</option>
                  <option value="EXAM">EXAM / QUIZ</option>
                  <option value="PROJECT">PROJECT</option>
                  <option value="HACKATHON">HACKATHON</option>
                </select>
                <input
                  type="text"
                  className="notion-input"
                  value={newDeadlineTime}
                  onChange={(e) => setNewDeadlineTime(e.target.value)}
                  placeholder="11:59 PM"
                />
                <button type="submit" className="notion-gold-btn">
                  + Add
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#9ca3af' }}>
                DEADLINE LIST
              </b>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'UPCOMING', label: 'Upcoming' },
                  { id: 'SELECTED_DATE', label: selectedDate.slice(5) },
                  { id: 'DONE', label: 'Completed' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDeadlineFilter(f.id)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                      border: '1px solid #262b36',
                      background: deadlineFilter === f.id ? '#232834' : 'transparent',
                      color: deadlineFilter === f.id ? '#ffffff' : '#9ca3af',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="deadline-list">
              {filteredDeadlines.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                  No deadlines in this view. Click any date on the calendar to add one.
                </div>
              ) : (
                filteredDeadlines.map((dl) => {
                  const relLabel = getRelativeDayLabel(dl.date, todayKey);
                  const isUrgent = dl.date <= todayKey && !dl.done;

                  return (
                    <div key={dl.id} className="deadline-row">
                      <div className="deadline-row-left">
                        <input
                          type="checkbox"
                          checked={dl.done}
                          onChange={() => handleToggleDeadline(dl.id)}
                          style={{ width: 16, height: 16, marginTop: 2, accentColor: '#f59e0b', cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: dl.done ? '#6b7280' : '#f3f4f6',
                            textDecoration: dl.done ? 'line-through' : 'none',
                            lineHeight: 1.35
                          }}>
                            {dl.title}
                          </div>
                          <div className="deadline-meta">
                            <span className={`deadline-pill cat-${dl.category || 'LAB'}`} style={{ fontSize: 9 }}>
                              {dl.category || 'LAB'}
                            </span>
                            <span>{dl.date}</span>
                            <span>• {dl.time}</span>
                            {relLabel && (
                              <span style={{
                                color: isUrgent ? '#f43f5e' : '#f59e0b',
                                fontWeight: 800
                              }}>
                                ({relLabel})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeadline(dl.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#6b7280',
                          fontSize: 15,
                          cursor: 'pointer',
                          padding: '2px 6px'
                        }}
                        title="Remove deadline"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: DEDICATED NOTES & COURSE DOCS WORKSPACE
         ===================================================================== */}
      {activeTab === 'NOTES' && (
        <section className="notes-workspace-layout">
          {/* Left Sidebar: Pages List */}
          <aside className="notes-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-label">WORKSPACE PAGES</span>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handleCreateNotionPage}
                style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                + New Page
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {notionPages.map((pg) => (
                <button
                  key={pg.id}
                  type="button"
                  className={`notes-page-item ${pg.id === activeNotionPage?.id ? 'active' : ''}`}
                  onClick={() => setActivePageId(pg.id)}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pg.title}
                  </div>
                  <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: '#6b7280', marginTop: 3 }}>
                    {pg.category || 'NOTE'}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Right Main Document Editor */}
          {activeNotionPage && (
            <div className="notes-editor-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="notion-input"
                  style={{ flex: 1, fontSize: 17, fontWeight: 800, padding: '10px 14px' }}
                  value={activeNotionPage.title}
                  onChange={(e) => handleUpdateActivePage('title', e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {pageSaveNotice && (
                    <span style={{ fontSize: 11.5, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
                      {pageSaveNotice}
                    </span>
                  )}
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={handleSyncActivePageToVault}
                    style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                  >
                    Save to Vault
                  </button>
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={() => navigator.clipboard?.writeText(activeNotionPage.content)}
                  >
                    Copy Markdown
                  </button>
                  {notionPages.length > 1 && (
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      onClick={() => handleDeleteNotionPage(activeNotionPage.id)}
                      style={{ color: '#f87171' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <textarea
                className="notion-page-textarea"
                value={activeNotionPage.content}
                onChange={(e) => handleUpdateActivePage('content', e.target.value)}
                placeholder="Write structured Markdown notes, lecture summaries, or project specs..."
              />
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          TAB 4: DEDICATED PROJECT WORKSPACE TAB (FOCUSED ON SELECTED REPO)
         ===================================================================== */}
      {activeTab === 'PROJECT' && selectedProject && (() => {
        const repoData = getRepoData(selectedProject.name);
        const todos = repoData.todos || [];
        const notes = repoData.notes || '';
        const pendingCount = todos.filter((t) => !t.done).length;
        const doneCount = todos.filter((t) => t.done).length;
        const progressPct = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

        const visibleTodos = todos.filter((t) => {
          if (todoFilter === 'PENDING') return !t.done;
          if (todoFilter === 'DONE') return t.done;
          return true;
        });

        const commitsList = repoActivity?.commits || [];
        const pullsList = repoActivity?.pulls || [];
        const gitFeed = repoActivity?.activity || [];
        const latestSha = commitsList[0]?.sha || 'main';

        return (
          <section className="project-workspace-view">
            {/* 1. Project Top Banner */}
            <div className="project-banner-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="odysseus-tag">
                    PROJECT WORKSPACE // {selectedProject.language?.toUpperCase() || 'CODE'}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#9ca3af' }}>
                    {selectedProject.stars ?? 0} Stars • Updated {selectedProject.updated_at || 'Recently'}
                  </span>
                  {projectSyncStatus && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#10b981', fontWeight: 700 }}>
                      • {projectSyncStatus}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', marginTop: 6 }}>
                  {selectedProject.name}
                </h2>
                <p style={{ fontSize: 13.5, color: '#9ca3af', marginTop: 3 }}>
                  {selectedProject.description || 'Dedicated project workspace for tracking tasks, GitHub pushes & pulls, and architecture notes.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="odysseus-pill-btn"
                  onClick={() => setActiveTab('OVERVIEW')}
                >
                  &larr; Back to Overview
                </button>
                <a
                  href={selectedProject.html_url || `https://github.com/${githubUsername}/${selectedProject.name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="odysseus-pill-btn"
                  style={{ color: '#38bdf8' }}
                >
                  Open on GitHub &#8599;
                </a>
                <button
                  type="button"
                  className="odysseus-pill-btn"
                  onClick={() => setActiveToolId('deploy_hub')}
                  style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b' }}
                >
                  Deploy Project
                </button>
              </div>
            </div>

            {/* 2. Project Telemetry & GitHub Activity Summary Strip */}
            <div className="project-telemetry-strip">
              <div className="project-stat-card">
                <div className="project-stat-label">
                  <span>TASK COMPLETION</span>
                  <span style={{ color: '#10b981' }}>{progressPct}%</span>
                </div>
                <div className="project-stat-value">
                  {doneCount} / {todos.length} Done
                </div>
                <div className="todo-progress-track">
                  <div className="todo-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div className="project-stat-card">
                <div className="project-stat-label">
                  <span>RECENT PUSHES</span>
                  <span style={{ color: '#38bdf8' }}>SHA {latestSha}</span>
                </div>
                <div className="project-stat-value">
                  {commitsList.length} Commits
                </div>
                <div className="project-stat-sub">
                  Latest push on branch <b style={{ color: '#e5e7eb' }}>{selectedProject.default_branch || 'main'}</b>
                </div>
              </div>

              <div className="project-stat-card">
                <div className="project-stat-label">
                  <span>PULL REQUESTS</span>
                  <a
                    href={`https://github.com/${githubUsername}/${selectedProject.name}/pulls`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#f59e0b', textDecoration: 'none' }}
                  >
                    View PRs &#8599;
                  </a>
                </div>
                <div className="project-stat-value">
                  {pullsList.length} Pulls
                </div>
                <div className="project-stat-sub">
                  {pullsList.length > 0
                    ? `${pullsList.filter((p) => p.state === 'OPEN').length} Open • ${pullsList.filter((p) => p.state !== 'OPEN').length} Closed/Merged`
                    : 'No open pull requests'}
                </div>
              </div>

              <div className="project-stat-card">
                <div className="project-stat-label">
                  <span>STACK & BRANCH</span>
                  <span style={{ color: '#f59e0b' }}>ACTIVE</span>
                </div>
                <div className="project-stat-value">
                  {selectedProject.language || 'Code'}
                </div>
                <div className="project-stat-sub">
                  Default branch: <b style={{ color: '#e5e7eb' }}>{selectedProject.default_branch || 'main'}</b>
                </div>
              </div>
            </div>

            {/* 3. Main Two-Column Workspace: Left = Upgraded To-Do Board | Right = Git Pushes/Pulls + Notes */}
            <div className="project-workspace-grid">
              {/* Left Column: Upgraded Project To-Do Board */}
              <div className="project-panel-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <span className="section-label">ACTION BOARD</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                      Project To-Do List
                    </h3>
                  </div>

                  {/* Filter Pills: All / Pending / Completed */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { id: 'ALL', label: `All (${todos.length})` },
                      { id: 'PENDING', label: `Pending (${pendingCount})` },
                      { id: 'DONE', label: `Done (${doneCount})` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTodoFilter(f.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 7,
                          fontSize: 11,
                          fontFamily: 'JetBrains Mono, monospace',
                          border: '1px solid #262b36',
                          background: todoFilter === f.id ? '#1f2430' : 'transparent',
                          color: todoFilter === f.id ? '#ffffff' : '#9ca3af',
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Bar Strip inside To-Do Card */}
                <div className="todo-progress-wrap">
                  <div className="todo-progress-top">
                    <span>{pendingCount} {pendingCount === 1 ? 'task' : 'tasks'} remaining</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{progressPct}% Complete</span>
                  </div>
                  <div className="todo-progress-track">
                    <div className="todo-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* Task Creation Form with Interactive Tag Chips */}
                <form onSubmit={handleAddProjectTodo} style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 6, borderBottom: '1px solid #1e232d' }}>
                  <div className="todo-tag-selector">
                    <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'JetBrains Mono, monospace', marginRight: 4 }}>
                      TAG:
                    </span>
                    {['FEATURE', 'BUG', 'DEPLOY', 'REFACTOR', 'DOCS'].map((tKey) => (
                      <button
                        key={tKey}
                        type="button"
                        className={`todo-tag-chip tag-${tKey} ${newTodoTag === tKey ? 'active' : ''}`}
                        onClick={() => setNewTodoTag(tKey)}
                      >
                        {tKey}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="notion-input"
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      placeholder={`Add a new ${newTodoTag.toLowerCase()} task for ${selectedProject.name}...`}
                    />
                    <button type="submit" className="notion-gold-btn">
                      + Add Task
                    </button>
                  </div>
                </form>

                {/* Styled Task Cards List */}
                <div className="todo-card-list">
                  {visibleTodos.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                      No tasks in this view. Select a tag above and add your next milestone for <b>{selectedProject.name}</b>.
                    </div>
                  ) : (
                    visibleTodos.map((todo) => {
                      const rawTag = (todo.tag || 'FEATURE').toUpperCase();
                      const cleanTag = rawTag.includes('BUG') ? 'BUG' : rawTag;

                      return (
                        <div
                          key={todo.id}
                          className={`todo-card-item accent-${cleanTag} ${todo.done ? 'completed' : ''}`}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}
                            onClick={() => handleToggleProjectTodo(selectedProject.name, todo.id)}
                          >
                            <div className={`todo-custom-check ${todo.done ? 'checked' : ''}`}>
                              {todo.done && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>

                            <span className={`todo-tag-badge badge-${cleanTag}`}>
                              {todo.tag || 'FEATURE'}
                            </span>

                            <span style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: todo.done ? '#6b7280' : '#f3f4f6',
                              textDecoration: todo.done ? 'line-through' : 'none',
                              lineHeight: 1.4
                            }}>
                              {todo.text}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="calendar-nav-btn"
                              onClick={() => handlePinProjectTodoToCalendar(selectedProject.name, todo)}
                              style={{ padding: '5px 10px', fontSize: 11 }}
                              title={`Pin task to Calendar (${selectedDate})`}
                            >
                              Schedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProjectTodo(selectedProject.name, todo.id)}
                              style={{
                                padding: '4px 8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#6b7280',
                                fontSize: 16,
                                cursor: 'pointer'
                              }}
                              title="Remove task"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Live Git Pushes, Commits & Pull Requests + Architecture Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Top Right Card: Git Pushes, Commits & Pull Requests */}
                <div className="project-panel-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <span className="section-label">GITHUB TELEMETRY // PUSHES & PULL REQUESTS</span>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                        Recent Commits & Pull Activity
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="calendar-nav-btn"
                        onClick={() => fetchRepoActivity(githubUsername, selectedProject.name)}
                        disabled={repoActivityLoading}
                      >
                        {repoActivityLoading ? 'Syncing...' : 'Refresh Activity'}
                      </button>
                      <a
                        href={`https://github.com/${githubUsername}/${selectedProject.name}/commits`}
                        target="_blank"
                        rel="noreferrer"
                        className="calendar-nav-btn"
                        style={{ textDecoration: 'none', color: '#38bdf8' }}
                      >
                        All Commits &#8599;
                      </a>
                    </div>
                  </div>

                  <div className="git-timeline-list">
                    {gitFeed.map((item) => {
                      const isPR = item.type?.startsWith('PR');
                      return (
                        <div key={item.id} className="git-timeline-item">
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: '3px 7px',
                                borderRadius: 5,
                                background: isPR ? 'rgba(168, 85, 247, 0.16)' : 'rgba(16, 185, 129, 0.15)',
                                color: isPR ? '#d8b4fe' : '#34d399',
                                border: isPR ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                                flexShrink: 0,
                                marginTop: 1
                              }}
                            >
                              {item.type}
                            </span>

                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6', lineHeight: 1.38 }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                                {item.subtitle} • {item.date}
                              </div>
                            </div>
                          </div>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="git-sha-pill"
                            title="View on GitHub"
                          >
                            {item.sha} &#8599;
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Right Card: Project Notes & Architecture */}
                <div className="project-panel-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <span className="section-label">DOCUMENTATION & SCRATCHPAD</span>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                        Project Notes & Architecture
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="calendar-nav-btn"
                        onClick={() => syncProjectToSecondBrain(selectedProject.name, todos, notes)}
                        style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}
                      >
                        Save Notes
                      </button>
                      <button
                        type="button"
                        className="calendar-nav-btn"
                        onClick={() => setActiveToolId('readme_builder')}
                      >
                        Generate README.md
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="notion-page-textarea"
                    style={{ minHeight: 220 }}
                    value={notes}
                    onChange={(e) => handleChangeProjectNotes(selectedProject.name, e.target.value)}
                    placeholder={`Write architecture notes, database schemas, API routes, or implementation plans for ${selectedProject.name}...`}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Interactive CS Tool Modal Overlay ── */}
      {activeTool && ActiveToolComponent && (
        <div
          className="tool-modal-backdrop"
          onClick={() => setActiveToolId(null)}
        >
          <div
            className="tool-modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tool-modal-header">
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#f59e0b', fontWeight: 700 }}>
                  {activeTool.category}
                </span>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                  {activeTool.name}
                </h2>
              </div>

              <button
                type="button"
                className="odysseus-pill-btn"
                onClick={() => setActiveToolId(null)}
              >
                &larr; Close Tool
              </button>
            </div>

            <div className="tool-modal-content">
              <ActiveToolComponent
                authHeader={getAuthHeader}
                githubData={githubData}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub Auth Modal ── */}
      {showAuth && (
        <AuthModal
          user={user}
          githubUsername={githubUsername}
          githubData={githubData}
          onConnectGithub={async (newHandle) => {
            setGithubInput(newHandle);
            await fetchGithubProfile(newHandle, contribYear);
          }}
          onSignOutGithub={() => {
            setGithubUsername('');
            setGithubData(null);
            try { localStorage.removeItem('odysseus_github_user'); } catch (e) {}
          }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
