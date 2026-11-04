import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import AddClassModal from './components/AddClassModal';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NotesPage from './pages/NotesPage';
import OjtPage from './pages/OjtPage';
import SettingsPage from './pages/SettingsPage';
import { isFirebaseConfigured, auth, onAuthStateChanged } from './firebase';
import { addDaysKey, toDateKey } from './lib/dateUtils';
import './styles/odysseus.css';

const DEFAULT_CLASSES = [
  {
    id: 'cls_cs301',
    kind: 'class',
    name: 'Data Structures & Algorithms',
    code: 'CS301',
    description: 'Graphs, balanced trees, dynamic programming, and asymptotic complexity.'
  },
  {
    id: 'cls_cs310',
    kind: 'class',
    name: 'Operating Systems',
    code: 'CS310',
    description: 'Processes, threads, concurrency, virtual memory, and file systems.'
  }
];

function getDefaultDeadlines() {
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
    }
  ];
}

const DEFAULT_NOTION_PAGES = [
  {
    id: 'pg_1',
    title: 'CS Semester Hub & Study Roadmap',
    category: 'SEMESTER',
    content: `# CS Semester Hub\n\n## Weekly Priorities\n- [x] Sync GitHub repositories & contribution graph\n- [ ] Finish Graph BFS / Dijkstra Lab before Friday 11:59 PM\n- [ ] Deploy full-stack project on Vercel + Render`
  },
  {
    id: 'pg_2',
    title: 'Algorithms & Complexity Cheat Sheet',
    category: 'CS NOTES',
    content: `# Algorithms Reference\n\n- Hash Map Lookup: O(1) average, O(n) worst-case\n- Binary Search / Balanced BST: O(log n)\n- Merge Sort / Heap Sort: O(n log n) time\n- BFS: Shortest path on unweighted graphs O(V + E)`
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  const [githubUsername, setGithubUsername] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [contribYear, setContribYear] = useState('last');
  const [githubData, setGithubData] = useState(null);

  const [classesList, setClassesList] = useState(() => {
    try {
      const saved = localStorage.getItem('prometheus_classes_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CLASSES;
  });

  const [deadlines, setDeadlines] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_deadlines_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getDefaultDeadlines();
  });

  const [notionPages, setNotionPages] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_notion_pages_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_NOTION_PAGES;
  });
  const [activePageId, setActivePageId] = useState('pg_1');
  const [pageSaveNotice, setPageSaveNotice] = useState('');

  const [projectStore, setProjectStore] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_project_notes_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'Data Structures & Algorithms': {
        todos: [
          { id: 'c1', text: 'Implement Dijkstra shortest-path lab in Python', tag: 'LAB', done: false },
          { id: 'c2', text: 'Review Red-Black Tree rotations before quiz', tag: 'READING', done: false }
        ],
        notes: 'Lecture 8 Notes:\n- Dijkstra uses a priority queue (min-heap) in O((V + E) log V).\n- Negative edge weights require Bellman-Ford.'
      }
    };
  });

  const saveClasses = (next) => {
    setClassesList(next);
    try {
      localStorage.setItem('prometheus_classes_v1', JSON.stringify(next));
    } catch (e) {}
  };

  const saveDeadlines = (next) => {
    setDeadlines(next);
    try {
      localStorage.setItem('odysseus_deadlines_v2', JSON.stringify(next));
    } catch (e) {}
  };

  const saveNotionPages = (next) => {
    setNotionPages(next);
    try {
      localStorage.setItem('odysseus_notion_pages_v2', JSON.stringify(next));
    } catch (e) {}
  };

  const saveProjectStore = (next) => {
    setProjectStore(next);
    try {
      localStorage.setItem('odysseus_project_notes_v2', JSON.stringify(next));
    } catch (e) {}
  };

  const getRepoData = (name) => {
    const existing = projectStore[name];
    if (existing) {
      return {
        todos: existing.todos || [],
        notes: existing.notes || ''
      };
    }
    return { todos: [], notes: '' };
  };

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

  const fetchGithubProfile = async (targetUser, targetYear = contribYear) => {
    const cleanUser = (targetUser || '').trim();
    if (!cleanUser) return;
    try {
      const res = await fetch(
        `/api/github/overview?user=${encodeURIComponent(cleanUser)}&year=${encodeURIComponent(targetYear)}`
      );
      if (res.ok) {
        const data = await res.json();
        setGithubData(data);
        setGithubUsername(data.username || cleanUser);
        try {
          localStorage.setItem('odysseus_github_user', data.username || cleanUser);
        } catch (e) {}
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (githubUsername) {
      fetchGithubProfile(githubUsername, contribYear);
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        const screenName = currentUser?.reloadUserInfo?.screenName;
        if (screenName && screenName !== githubUsername) {
          fetchGithubProfile(screenName, contribYear);
        }
      });
      return () => unsub();
    }
  }, []);

  const handleSelectYear = (yr) => {
    setContribYear(yr);
    fetchGithubProfile(githubUsername, yr);
  };

  const handleAddClass = (newClassObj) => {
    saveClasses([...classesList, newClassObj]);
  };

  const handleDeleteClass = (id) => {
    saveClasses(classesList.filter((c) => c.id !== id));
  };

  const handleAddDeadline = async ({ title, date, time, category }) => {
    const item = {
      id: `dl_${Date.now()}`,
      title,
      date: date || toDateKey(new Date()),
      time: time || '11:59 PM',
      category: category || 'LAB',
      done: false
    };
    const next = [...deadlines, item].sort((a, b) => a.date.localeCompare(b.date));
    saveDeadlines(next);

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
    } catch (e) {}
  };

  const handleToggleDeadline = (id) => {
    saveDeadlines(deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d)));
  };

  const handleDeleteDeadline = (id) => {
    saveDeadlines(deadlines.filter((d) => d.id !== id));
  };

  const handleAddProjectTodo = (projName, text, tag) => {
    const current = getRepoData(projName);
    const updatedTodos = [
      ...current.todos,
      { id: `td_${Date.now()}`, text, tag: tag || 'TASK', done: false }
    ];
    saveProjectStore({
      ...projectStore,
      [projName]: { ...current, todos: updatedTodos }
    });
  };

  const handleToggleProjectTodo = (projName, todoId) => {
    const current = getRepoData(projName);
    const updatedTodos = current.todos.map((t) =>
      t.id === todoId ? { ...t, done: !t.done } : t
    );
    saveProjectStore({
      ...projectStore,
      [projName]: { ...current, todos: updatedTodos }
    });
  };

  const handleDeleteProjectTodo = (projName, todoId) => {
    const current = getRepoData(projName);
    const updatedTodos = current.todos.filter((t) => t.id !== todoId);
    saveProjectStore({
      ...projectStore,
      [projName]: { ...current, todos: updatedTodos }
    });
  };

  const handlePinTodoToCalendar = (projName, todoItem) => {
    handleAddDeadline({
      title: `[${projName}] ${todoItem.text}`,
      date: toDateKey(new Date()),
      time: '11:59 PM',
      category: 'PROJECT'
    });
  };

  const handleChangeProjectNotes = (projName, notesVal) => {
    const current = getRepoData(projName);
    saveProjectStore({
      ...projectStore,
      [projName]: { ...current, notes: notesVal }
    });
  };

  const handleSaveWorkspaceToBrain = async (projName, todosList, notesText) => {
    try {
      const headers = await getAuthHeader();
      const pending = todosList.filter((t) => !t.done).map((t) => `[${t.tag}] ${t.text}`).join('; ');
      await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Workspace: ${projName}`,
          content: `Project: ${projName}\nPending Tasks: ${pending || 'None'}\nNotes: ${notesText || 'None'}`,
          source_type: 'project_plan'
        })
      });
    } catch (e) {}
  };

  const handleCreateNotionPage = () => {
    const newId = `pg_${Date.now()}`;
    const newPage = {
      id: newId,
      title: `Untitled Note (${toDateKey(new Date())})`,
      category: 'NOTE',
      content: `# Untitled Note\n\nWrite your lecture notes, project specs, or study checklist here...`
    };
    saveNotionPages([...notionPages, newPage]);
    setActivePageId(newId);
  };

  const handleDeleteNotionPage = (id) => {
    if (notionPages.length <= 1) return;
    const next = notionPages.filter((p) => p.id !== id);
    saveNotionPages(next);
    if (activePageId === id && next[0]) setActivePageId(next[0].id);
  };

  const handleUpdateActivePage = (field, val) => {
    saveNotionPages(
      notionPages.map((p) => (p.id === activePageId ? { ...p, [field]: val } : p))
    );
  };

  const handleSyncActivePageToVault = async () => {
    const current = notionPages.find((p) => p.id === activePageId);
    if (!current) return;
    setPageSaveNotice('Saving...');
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
      setPageSaveNotice('Saved to Vault');
    } catch (e) {
      setPageSaveNotice('Saved locally');
    }
    setTimeout(() => setPageSaveNotice(''), 2000);
  };

  const handleResetLocalData = () => {
    saveClasses(DEFAULT_CLASSES);
    saveDeadlines(getDefaultDeadlines());
    saveNotionPages(DEFAULT_NOTION_PAGES);
  };

  const upcomingCount = deadlines.filter((d) => !d.done).length;

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#f4efe6] text-zinc-900">
        <Sidebar
          githubUsername={githubUsername}
          githubData={githubData}
          upcomingCount={upcomingCount}
          notesCount={notionPages.length}
          classesList={classesList}
          reposList={githubData?.repos || []}
          onOpenAuth={() => setShowAuth(true)}
          onOpenAddClass={() => setShowAddClass(true)}
        />

        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  githubUsername={githubUsername}
                  githubData={githubData}
                  contribYear={contribYear}
                  onSelectYear={handleSelectYear}
                  deadlines={deadlines}
                  onAddDeadline={handleAddDeadline}
                  onToggleDeadline={handleToggleDeadline}
                  onDeleteDeadline={handleDeleteDeadline}
                  classesList={classesList}
                  getRepoData={getRepoData}
                  onOpenAuth={() => setShowAuth(true)}
                  onOpenAddClass={() => setShowAddClass(true)}
                />
              }
            />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  deadlines={deadlines}
                  onAddDeadline={handleAddDeadline}
                  onToggleDeadline={handleToggleDeadline}
                  onDeleteDeadline={handleDeleteDeadline}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <ProjectsPage
                  classesList={classesList}
                  reposList={githubData?.repos || []}
                  githubUsername={githubUsername}
                  getRepoData={getRepoData}
                  onOpenAddClass={() => setShowAddClass(true)}
                  onDeleteClass={handleDeleteClass}
                  onOpenAuth={() => setShowAuth(true)}
                />
              }
            />
            <Route
              path="/p/:projectName"
              element={
                <ProjectDetailPage
                  githubUsername={githubUsername}
                  githubData={githubData}
                  classesList={classesList}
                  getRepoData={getRepoData}
                  onAddTodo={handleAddProjectTodo}
                  onToggleTodo={handleToggleProjectTodo}
                  onDeleteTodo={handleDeleteProjectTodo}
                  onPinTodoToCalendar={handlePinTodoToCalendar}
                  onChangeNotes={handleChangeProjectNotes}
                  onSaveWorkspace={handleSaveWorkspaceToBrain}
                />
              }
            />
            <Route
              path="/notes"
              element={
                <NotesPage
                  notionPages={notionPages}
                  activePageId={activePageId}
                  onSelectPage={setActivePageId}
                  onCreatePage={handleCreateNotionPage}
                  onDeletePage={handleDeleteNotionPage}
                  onUpdatePage={handleUpdateActivePage}
                  onSyncPageToVault={handleSyncActivePageToVault}
                  pageSaveNotice={pageSaveNotice}
                />
              }
            />
            <Route
              path="/ojt"
              element={
                <OjtPage
                  githubUsername={githubUsername}
                  githubData={githubData}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  githubUsername={githubUsername}
                  githubData={githubData}
                  deadlines={deadlines}
                  classesList={classesList}
                  notionPages={notionPages}
                  onOpenAuth={() => setShowAuth(true)}
                  onResetLocalData={handleResetLocalData}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {showAddClass && (
          <AddClassModal
            onAddClass={handleAddClass}
            onClose={() => setShowAddClass(false)}
          />
        )}

        {showAuth && (
          <AuthModal
            user={user}
            githubUsername={githubUsername}
            githubData={githubData}
            onConnectGithub={async (newHandle) => {
              await fetchGithubProfile(newHandle, contribYear);
            }}
            onSignOutGithub={() => {
              setGithubUsername('');
              setGithubData(null);
              try {
                localStorage.removeItem('odysseus_github_user');
              } catch (e) {}
            }}
            onClose={() => setShowAuth(false)}
          />
        )}
      </div>
    </BrowserRouter>
  );
}
