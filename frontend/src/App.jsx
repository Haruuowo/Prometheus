import React, { useState, useEffect, useRef } from 'react';
import AuthModal from './components/AuthModal';
import { TOOL_REGISTRY } from './tools/registry';
import { isFirebaseConfigured, auth, onAuthStateChanged } from './firebase';
import './styles/odysseus.css';

const MOODS = {
  chill:      { color: '#a78bfa', label: 'chill & witty' },
  supportive: { color: '#34d399', label: 'supportive & curious' },
  upbeat:     { color: '#f472b6', label: 'upbeat & sharp' },
  happy:      { color: '#f472b6', label: 'happy & upbeat' },
  smug:       { color: '#f59e0b', label: 'clever banter' },
  surprised:  { color: '#38bdf8', label: 'surprised' },
};

const DEFAULT_PROMPT = `You are Luna, the AI CS companion and engineering mentor inside the Odysseus Student Workspace.
You help Computer Science students understand algorithms & Big-O complexity, debug code, deploy apps (Vercel, Render, Railway, GitHub Pages), write great READMEs, and recall their Second Brain lecture notes. Keep responses concise, practical, and encouraging.`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildContributionCalendar(daysList = []) {
  // If backend hasn't returned days yet, generate 52 empty weeks so layout stays crisp
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
    const dow = dt.getDay(); // 0 = Sun .. 6 = Sat
    currentWeek[dow] = dayObj;
    if (dow === 6 || idx === items.length - 1) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  });

  // Compute month labels across weeks
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
  // User & Auth
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Connected GitHub Student Profile & Contribution Year
  const [githubUsername, setGithubUsername] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [githubInput, setGithubInput] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [contribYear, setContribYear] = useState('last'); // 'last' (2026), '2025', '2024'
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  // Active Tool Modal (null = viewing main page)
  const [activeToolId, setActiveToolId] = useState(null);

  // Active Project Workspace Modal (when clicking a GitHub repository card)
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectStore, setProjectStore] = useState(() => {
    try {
      const saved = localStorage.getItem('odysseus_project_notes_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      Prometheus: {
        todos: [
          { id: 't1', text: 'Connect custom domain on Vercel', tag: 'DEPLOY', done: false },
          { id: 't2', text: 'Add more CS interview flashcards', tag: 'FEATURE', done: false }
        ],
        notes: 'Main Odysseus CS Student Workspace.\nFrontend: React + Vite\nBackend: FastAPI + Groq LLM'
      }
    };
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTag, setNewTodoTag] = useState('FEATURE');
  const [projectSyncStatus, setProjectSyncStatus] = useState('');

  const saveProjectStore = (nextStore) => {
    setProjectStore(nextStore);
    try {
      localStorage.setItem('odysseus_project_notes_v1', JSON.stringify(nextStore));
    } catch (e) {}
  };

  const getRepoData = (repoName) => {
    return projectStore[repoName] || { todos: [], notes: '' };
  };

  const handleAddProjectTodo = async (e) => {
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

  const handleChangeProjectNotes = (repoName, notesVal) => {
    const current = getRepoData(repoName);
    const nextStore = {
      ...projectStore,
      [repoName]: { ...current, notes: notesVal }
    };
    saveProjectStore(nextStore);
  };

  const syncProjectToSecondBrain = async (repoName, todosList, notesText) => {
    setProjectSyncStatus('Syncing with Luna Second Brain...');
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
      setProjectSyncStatus('✓ Saved & synced to Luna memory');
    } catch (e) {
      setProjectSyncStatus('✓ Saved locally');
    }
    setTimeout(() => setProjectSyncStatus(''), 2200);
  };

  // Tool Grid Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Luna Avatar & Telemetry State
  const [lunaPng, setLunaPng] = useState(localStorage.getItem('luna_custom_png') || '/luna.png');
  const [mood, setMood] = useState(MOODS.chill);
  const [thinking, setThinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [stageMs, setStageMs] = useState({ route: 1, intent: 1, rag: 2, llm: 310 });
  const [activeNodes, setActiveNodes] = useState({});

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Luna',
      text: "Hey! Your GitHub contribution graph, repositories, and CS Student tools are live. Ask me to analyze Big-O complexity, help deploy your repos to Vercel/Render, or open any tool below!",
    }
  ]);

  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

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

  // Firebase Auth Listener
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

  // Auto-scroll chat box inside console
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, thinking]);

  // WebSocket live telemetry connection
  useEffect(() => {
    let reconnectTimer = null;
    const connectWs = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsHost = window.location.port === '5173' ? '127.0.0.1:8085' : window.location.host;
        const ws = new WebSocket(`${proto}://${wsHost}/ws`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'emotion') {
              const emo = String(msg.data || msg.emotion || 'chill').toLowerCase();
              if (MOODS[emo]) setMood(MOODS[emo]);
            } else if (msg.type === 'pipeline_trace') {
              const tr = msg.data || msg;
              if (tr.stage) {
                pulseNode(tr.stage);
                if (tr.ms != null) {
                  setStageMs((prev) => ({ ...prev, [tr.stage]: tr.ms }));
                }
              }
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3500);
        };
      } catch (e) {}
    };

    connectWs();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const pulseNode = (nodeName) => {
    setActiveNodes((prev) => ({ ...prev, [nodeName]: true }));
    setTimeout(() => {
      setActiveNodes((prev) => ({ ...prev, [nodeName]: false }));
    }, 1000);
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

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setLunaPng(dataUrl);
      try { localStorage.setItem('luna_custom_png', dataUrl); } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  // Send message to Luna
  const handleSendMessage = async (textOverride) => {
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    if (!textOverride) setChatInput('');

    const senderName = user?.displayName || user?.email?.split('@')[0] || 'You';
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), user: senderName, text }]);
    setThinking(true);
    pulseNode('route');

    const lower = text.toLowerCase();
    if (lower.includes('open deploy') || lower.includes('vercel') || lower.includes('where to publish')) {
      setActiveToolId('deploy_hub');
    } else if (lower.includes('open big-o') || lower.includes('analyze complexity')) {
      setActiveToolId('bigo_analyzer');
    } else if (lower.includes('open readme') || lower.includes('generate readme')) {
      setActiveToolId('readme_builder');
    } else if (lower.includes('open sandbox') || lower.includes('run python')) {
      setActiveToolId('sandbox');
    } else if (lower.includes('flashcard') || lower.includes('interview prep')) {
      setActiveToolId('cs_flashcards');
    }

    try {
      const authHeaders = await getAuthHeader();
      const ghSummary = githubData
        ? `\n[Student GitHub Context: @${githubData.username}, ${githubData?.contributions?.total || 265} contributions, ${githubData.public_repos} public repos, top repos: ${(githubData.repos || []).slice(0, 4).map(r => `${r.name} (${r.language})`).join(', ')}]`
        : '';

      const res = await fetch('/chat', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user: senderName,
          platform: 'Console',
          system_prompt: DEFAULT_PROMPT + ghSummary,
          temperature: 0.75
        })
      });

      const data = await res.json();
      setThinking(false);

      if (data.stage_ms) {
        setStageMs((prev) => ({ ...prev, ...data.stage_ms }));
      }

      const replyText = data.reply || 'Done!';
      setMessages((prev) => [...prev, { id: Date.now() + Math.random(), user: 'Luna', text: replyText }]);

      const emoKey = String(data.emotion || 'chill').toLowerCase();
      setMood(MOODS[emoKey] || MOODS.chill);
      setIsTalking(true);
      setTimeout(() => setIsTalking(false), 2600);
    } catch (err) {
      setThinking(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), user: 'Luna', text: "I'm right here! Pick any CS tool below or ask me about your repos." }
      ]);
    }
  };

  const handleResetChat = async () => {
    try {
      const headers = await getAuthHeader();
      await fetch('/memory/reset', { method: 'POST', headers });
    } catch (e) {}
    setMessages([
      { id: Date.now(), user: 'Luna', text: 'Conversation history cleared! Your Second Brain lecture notes are safe.' }
    ]);
  };

  // Build Contribution Calendar Columns & Months
  const contribTotal = githubData?.contributions?.total ?? 265;
  const { weeks: contribWeeks, monthLabels } = buildContributionCalendar(
    githubData?.contributions?.days || []
  );

  // Filter tools for the grid
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
      {/* ── Top Heading Strip ── */}
      <header className="odysseus-header">
        <div className="odysseus-brand">
          <div className="odysseus-brand-top">
            <span className="odysseus-tag">ODYSSEUS // CS STUDENT HUB</span>
            <span className="odysseus-status">
              <span className="odysseus-status-dot" />
              GITHUB & LUNA SYNCED
            </span>
          </div>
          <h1 className="odysseus-title">Computer Science Workspace</h1>
          <p className="odysseus-subtitle">
            Connect your GitHub, track your contribution graph, deploy your projects, and study with Luna.
          </p>
        </div>

        <div className="odysseus-header-actions">
          <button
            type="button"
            className="odysseus-pill-btn"
            onClick={() => setActiveToolId('deploy_hub')}
            style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b' }}
          >
            🚀 Publish / Deploy Site
          </button>
          <button
            type="button"
            className="odysseus-pill-btn"
            onClick={handleResetChat}
            title="Clear chat history"
          >
            Reset Chat
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
      </header>

      {/* ── Section 1: Luna AI CS Companion Console ── */}
      <section className="luna-console">
        <div className="luna-avatar-panel">
          <div className="luna-avatar-top">
            <span className="luna-name-badge">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: mood.color }} />
              Luna • {mood.label}
            </span>

            <label
              htmlFor="luna-avatar-upload"
              style={{ fontSize: 11, color: '#9ca3af', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
              title="Upload custom avatar PNG"
            >
              [Change PNG]
              <input id="luna-avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="luna-avatar-stage">
            <img
              src={lunaPng}
              alt="Luna Avatar"
              className={`luna-avatar-img ${isTalking ? 'talking' : ''}`}
            />
          </div>

          <div className="luna-pipeline-bar">
            <div className={`pipeline-chip ${activeNodes.route ? 'active' : ''}`}>
              <span className="pipeline-chip-label">Route</span>
              <span className="pipeline-chip-ms">{stageMs.route || 1}ms</span>
            </div>
            <div className={`pipeline-chip ${activeNodes.intent ? 'active' : ''}`}>
              <span className="pipeline-chip-label">Intent</span>
              <span className="pipeline-chip-ms">{stageMs.intent || 1}ms</span>
            </div>
            <div className={`pipeline-chip ${activeNodes.rag ? 'active' : ''}`}>
              <span className="pipeline-chip-label">RAG</span>
              <span className="pipeline-chip-ms">{stageMs.rag || 2}ms</span>
            </div>
            <div className={`pipeline-chip ${activeNodes.llm ? 'active' : ''}`}>
              <span className="pipeline-chip-label">LLM</span>
              <span className="pipeline-chip-ms">{stageMs.llm || 310}ms</span>
            </div>
          </div>
        </div>

        <div className="luna-chat-panel">
          <div className="luna-chat-messages">
            {messages.map((msg) => {
              const isLuna = msg.user === 'Luna';
              return (
                <div key={msg.id} className={`chat-bubble-row ${isLuna ? 'luna' : 'user'}`}>
                  <div className="chat-bubble">
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      marginBottom: 4,
                      color: isLuna ? '#f59e0b' : '#9ca3af',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}>
                      {isLuna ? 'LUNA' : msg.user.toUpperCase()}
                    </div>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {thinking && (
              <div className="chat-bubble-row luna">
                <div className="chat-bubble" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Luna is thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="luna-quick-prompts">
            <button type="button" className="quick-prompt-chip" onClick={() => setActiveToolId('deploy_hub')}>
              🚀 Where to host my site (Vercel/Render)?
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => setActiveToolId('bigo_analyzer')}>
              ⚡ Analyze Big-O Complexity
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => handleSendMessage(`Review my GitHub repositories for @${githubUsername} and suggest what to improve for my CS portfolio.`)}>
              🐙 Review My GitHub Portfolio
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => setActiveToolId('cs_flashcards')}>
              📚 DSA Interview Flashcards
            </button>
          </div>

          <form
            className="luna-chat-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="luna-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask Luna to debug code, explain an algorithm, or help deploy your project..."
            />
            <button type="submit" className="luna-send-btn" disabled={thinking}>
              Send &rarr;
            </button>
          </form>
        </div>
      </section>

      {/* ── Section 2: Connected GitHub Contributions Graph, Activity & Repositories ── */}
      <section className="github-hub">
        <div className="github-hub-top">
          <div className="github-profile-row">
            {githubData?.avatar_url && (
              <img src={githubData.avatar_url} alt={githubUsername} className="github-avatar" />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 18, color: '#ffffff' }}>@{githubData?.username || githubUsername}</b>
                <a
                  href={`https://github.com/${githubData?.username || githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 11.5, color: '#f59e0b', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  [View GitHub Profile &rarr;]
                </a>
              </div>
              <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>
                {githubData?.bio || 'Computer Science Student • Active Repositories & Commit Stream'}
              </div>
            </div>
          </div>

          <div className="github-stats-row">
            <div className="github-stat-pill">
              Repos: <b>{githubData?.public_repos ?? 0}</b>
            </div>
            <div className="github-stat-pill">
              Stars: <b>★ {githubData?.total_stars ?? 0}</b>
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
                {githubLoading ? 'Syncing...' : 'Connect GitHub'}
              </button>
            </form>
          </div>
        </div>

        {/* ── GitHub Contributions Calendar Heatmap (Exact Match to Screenshot) ── */}
        <div className="gh-contrib-wrapper">
          <div>
            <div className="gh-contrib-header">
              <span className="gh-contrib-title">
                {contribTotal} contributions {contribYear === 'last' ? 'in the last year' : `in ${contribYear}`}
              </span>
              <span className="gh-contrib-settings">Contribution settings &#9662;</span>
            </div>

            <div className="gh-contrib-box">
              {/* Month Labels Row */}
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

              {/* Weekday Labels + 53-Week Grid */}
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

              {/* Footer: Learn how we count + Less/More Legend */}
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

          {/* Right Column: Year Selector Pills (2026, 2025, 2024) */}
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

        {/* Bottom Half of GitHub Hub: Recent Commits/Events + Repositories */}
        <div className="github-hub-grid">
          <div className="github-activity-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                RECENT GITHUB ACTIVITY
              </b>
              <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>● LIVE STREAM</span>
            </div>

            {(githubData?.events || []).map((ev, i) => (
              <div key={ev.id || i} className="github-event-item">
                <span className="github-event-badge">{ev.badge}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e5e7eb', lineHeight: 1.4, wordBreak: 'break-word' }}>{ev.text}</div>
                  <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 2 }}>{ev.date}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>
                YOUR REPOSITORIES ({githubData?.repos?.length || 0}) • CLICK A PROJECT TO ADD NOTES & TO-DOS
              </b>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(githubData?.top_languages || []).slice(0, 4).map((l) => (
                  <span
                    key={l.name}
                    style={{
                      fontSize: 10.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: '#161920',
                      border: '1px solid #262b36',
                      color: '#cbd5e1'
                    }}
                  >
                    {l.name} ({l.count})
                  </span>
                ))}
              </div>
            </div>

            <div className="github-repos-mini-grid">
              {(githubData?.repos || []).slice(0, 6).map((repo) => {
                const pData = getRepoData(repo.name);
                const pendingCount = (pData.todos || []).filter((t) => !t.done).length;
                const nextTodo = (pData.todos || []).find((t) => !t.done);

                return (
                  <div
                    key={repo.id || repo.name}
                    className="github-repo-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedProject(repo)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff' }}>
                          {repo.name}
                        </span>
                        <span style={{ fontSize: 10.5, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                          {repo.language}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#8e96a4', marginTop: 5, lineHeight: 1.4 }}>
                        {repo.description}
                      </p>

                      {/* Preview of next To-Do or Notes badge */}
                      <div style={{
                        marginTop: 10,
                        padding: '6px 9px',
                        borderRadius: 8,
                        background: '#14171d',
                        border: '1px solid #222631',
                        fontSize: 11.5,
                        color: pendingCount > 0 ? '#e5e7eb' : '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nextTodo ? `☐ ${nextTodo.text}` : (pData.notes ? '📝 Project notes saved' : '+ Click to add project to-dos & notes')}
                        </span>
                        {pendingCount > 0 && (
                          <span style={{
                            fontSize: 10,
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 999,
                            background: 'rgba(245, 158, 11, 0.16)',
                            color: '#f59e0b',
                            flexShrink: 0
                          }}>
                            {pendingCount} left
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #1b1f28' }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>★ {repo.stars} • {repo.updated_at}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(repo);
                          }}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Notes / To-Do
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveToolId('deploy_hub');
                          }}
                          style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Deploy &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: CS Student Tool Cards Grid (Odysseus Style) ── */}
      <section className="tools-section">
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
            placeholder="Search CS tools (e.g. Vercel, Big-O, README, Git)..."
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
                        <span>★</span> STUDENT PICK
                      </span>
                    )}
                    <span className="badge-ready">
                      <span className="badge-ready-dot">✻</span> READY
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

      {/* ── Interactive GitHub Project Notes & To-Do Modal ── */}
      {selectedProject && (() => {
        const repoData = getRepoData(selectedProject.name);
        const todos = repoData.todos || [];
        const notes = repoData.notes || '';

        return (
          <div
            className="tool-modal-backdrop"
            onClick={() => setSelectedProject(null)}
          >
            <div
              className="tool-modal-window"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="tool-modal-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#f59e0b', fontWeight: 800 }}>
                      PROJECT WORKSPACE // {selectedProject.language?.toUpperCase() || 'CODE'}
                    </span>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
                      ★ {selectedProject.stars} • Updated {selectedProject.updated_at}
                    </span>
                    {projectSyncStatus && (
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                        {projectSyncStatus}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 21, fontWeight: 800, color: '#ffffff', marginTop: 3 }}>
                    {selectedProject.name}
                  </h2>
                  <p style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>
                    {selectedProject.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a
                    href={selectedProject.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="odysseus-pill-btn"
                    style={{ textDecoration: 'none', color: '#38bdf8' }}
                  >
                    Open on GitHub &#8599;
                  </a>
                  <button
                    type="button"
                    className="odysseus-pill-btn"
                    onClick={() => setSelectedProject(null)}
                  >
                    &larr; Back to Workspace
                  </button>
                </div>
              </div>

              {/* Modal Body: Left = What To Do Checklist | Right = Project Scratchpad Notes */}
              <div className="tool-modal-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20 }}>
                  {/* Left: What To Do in This Project */}
                  <div style={{
                    background: '#0e1014',
                    border: '1px solid #232730',
                    borderRadius: 14,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 12.5, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                        WHAT TO DO IN {selectedProject.name.toUpperCase()} ({todos.filter(t => !t.done).length} PENDING)
                      </b>
                    </div>

                    {/* Add To-Do Form */}
                    <form onSubmit={handleAddProjectTodo} style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={newTodoTag}
                        onChange={(e) => setNewTodoTag(e.target.value)}
                        style={{
                          padding: '9px 10px',
                          borderRadius: 9,
                          border: '1px solid #2b303c',
                          background: '#14171d',
                          color: '#f59e0b',
                          fontSize: 11.5,
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          outline: 'none'
                        }}
                      >
                        <option value="FEATURE">FEATURE</option>
                        <option value="BUG FIX">BUG FIX</option>
                        <option value="REFACTOR">REFACTOR</option>
                        <option value="DEPLOY">DEPLOY</option>
                        <option value="DOCS">DOCS</option>
                      </select>

                      <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        placeholder={`Add task or feature for ${selectedProject.name}...`}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 9,
                          border: '1px solid #2b303c',
                          background: '#14171d',
                          color: '#ffffff',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />

                      <button
                        type="submit"
                        style={{
                          padding: '0 16px',
                          borderRadius: 9,
                          border: 'none',
                          background: '#f59e0b',
                          color: '#0b0c0e',
                          fontWeight: 800,
                          fontSize: 12.5,
                          cursor: 'pointer'
                        }}
                      >
                        + Add
                      </button>
                    </form>

                    {/* To-Do Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 310, overflowY: 'auto' }}>
                      {todos.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                          No tasks added yet. Add what you want to build or fix in <b>{selectedProject.name}</b> above!
                        </div>
                      ) : (
                        todos.map((todo) => (
                          <div
                            key={todo.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: '#14171d',
                              border: todo.done ? '1px solid #1d212a' : '1px solid #262b36',
                              opacity: todo.done ? 0.6 : 1
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={todo.done}
                                onChange={() => handleToggleProjectTodo(selectedProject.name, todo.id)}
                                style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer' }}
                              />
                              <span style={{
                                fontSize: 9.5,
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(245, 158, 11, 0.14)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.35)'
                              }}>
                                {todo.tag || 'TASK'}
                              </span>
                              <span style={{
                                fontSize: 13,
                                color: '#f3f4f6',
                                textDecoration: todo.done ? 'line-through' : 'none'
                              }}>
                                {todo.text}
                              </span>
                            </label>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const rName = selectedProject.name;
                                  const rLang = selectedProject.language;
                                  setSelectedProject(null);
                                  handleSendMessage(`In my GitHub project "${rName}" (${rLang}), help me implement this task: "${todo.text}"`);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #2b303c',
                                  background: '#1b1f28',
                                  color: '#38bdf8',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                Ask Luna
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProjectTodo(selectedProject.name, todo.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#6b7280',
                                  fontSize: 14,
                                  cursor: 'pointer'
                                }}
                                title="Delete task"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Project Architecture & Scratchpad Notes */}
                  <div style={{
                    background: '#0e1014',
                    border: '1px solid #232730',
                    borderRadius: 14,
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 12.5, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                        PROJECT NOTES & ARCHITECTURE SCRATCHPAD
                      </b>
                      <button
                        type="button"
                        onClick={() => syncProjectToSecondBrain(selectedProject.name, todos, notes)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Sync Notes to Luna Brain
                      </button>
                    </div>

                    <textarea
                      value={notes}
                      onChange={(e) => handleChangeProjectNotes(selectedProject.name, e.target.value)}
                      placeholder={`Write architecture ideas, commands, endpoints, or lecture notes for ${selectedProject.name}...`}
                      rows={11}
                      style={{
                        flex: 1,
                        width: '100%',
                        padding: 14,
                        borderRadius: 10,
                        border: '1px solid #262b36',
                        background: '#14171d',
                        color: '#e5e7eb',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />

                    {/* Bottom Project Shortcuts */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                      <button
                        type="button"
                        className="odysseus-pill-btn"
                        onClick={() => {
                          const rName = selectedProject.name;
                          const pendingList = todos.filter(t => !t.done).map(t => t.text).join(', ');
                          setSelectedProject(null);
                          handleSendMessage(
                            `Let's work on my GitHub project "${rName}". My current to-dos are: [${pendingList || 'None yet'}]. Notes: ${notes || selectedProject.description}. What should we tackle first?`
                          );
                        }}
                        style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#f59e0b' }}
                      >
                        ✨ Plan Next Steps with Luna
                      </button>
                      <button
                        type="button"
                        className="odysseus-pill-btn"
                        onClick={() => {
                          setSelectedProject(null);
                          setActiveToolId('deploy_hub');
                        }}
                      >
                        🚀 Deploy {selectedProject.name}
                      </button>
                      <button
                        type="button"
                        className="odysseus-pill-btn"
                        onClick={() => {
                          setSelectedProject(null);
                          setActiveToolId('readme_builder');
                        }}
                      >
                        📄 Generate README.md
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Interactive Tool Modal Overlay ── */}
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
                &larr; Back to Workspace
              </button>
            </div>

            <div className="tool-modal-content">
              <ActiveToolComponent
                authHeader={getAuthHeader}
                githubData={githubData}
                onAskLuna={(promptText) => {
                  setActiveToolId(null);
                  handleSendMessage(promptText);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── GitHub & Firebase Auth Modal ── */}
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
