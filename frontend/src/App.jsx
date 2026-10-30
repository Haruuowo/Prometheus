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

export default function App() {
  // User & Auth
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Connected GitHub Student Profile
  const [githubUsername, setGithubUsername] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [githubInput, setGithubInput] = useState(
    localStorage.getItem('odysseus_github_user') || 'Haruuowo'
  );
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);

  // Active Tool Modal (null = viewing main page)
  const [activeToolId, setActiveToolId] = useState(null);

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
      text: "Hey! Your GitHub activity and CS Student tools are synced. Ask me to analyze Big-O complexity, help deploy your repos to Vercel/Render, or open any tool below!",
    }
  ]);

  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch GitHub Overview & Activity
  const fetchGithubProfile = async (targetUser) => {
    const cleanUser = (targetUser || 'Haruuowo').trim();
    setGithubLoading(true);
    try {
      const res = await fetch(`/api/github/overview?user=${encodeURIComponent(cleanUser)}`);
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
    fetchGithubProfile(githubUsername);
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
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

    // Auto-open CS student tools when requested
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
        ? `\n[Student GitHub Context: @${githubData.username}, ${githubData.public_repos} public repos, top repos: ${(githubData.repos || []).slice(0, 4).map(r => `${r.name} (${r.language})`).join(', ')}]`
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
            Connect your GitHub, track your coding activity, deploy your projects, and study with Luna.
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
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: user ? '#10b981' : '#f59e0b'
            }} />
            {userDisplayName ? `${userDisplayName}` : 'Sign In'}
          </button>
        </div>
      </header>

      {/* ── Section 1: Luna AI CS Companion Console ── */}
      <section className="luna-console">
        {/* Left: Luna Avatar + Telemetry */}
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

        {/* Right: Chat Stream + Input */}
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

          {/* CS Student Quick Prompts */}
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

          {/* Chat Input Form */}
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

      {/* ── Section 2: Connected GitHub Student Activity & Repositories ── */}
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

          {/* Stats & Connect Any GitHub Username */}
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
                fetchGithubProfile(githubInput);
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

        {/* Left: Live Activity Feed | Right: Student Repos with Deploy & README actions */}
        <div className="github-hub-grid">
          <div className="github-activity-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                RECENT GITHUB ACTIVITY
              </b>
              <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>● LIVE FEED</span>
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
                YOUR REPOSITORIES ({githubData?.repos?.length || 0})
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
              {(githubData?.repos || []).slice(0, 6).map((repo) => (
                <div key={repo.id || repo.name} className="github-repo-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                      >
                        {repo.name}
                      </a>
                      <span style={{ fontSize: 10.5, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                        {repo.language}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#8e96a4', marginTop: 5, lineHeight: 1.4 }}>
                      {repo.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #1b1f28' }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>★ {repo.stars} • {repo.updated_at}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setActiveToolId('readme_builder')}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                      >
                        README
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveToolId('deploy_hub')}
                        style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Deploy &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

        {/* 3-Column Odysseus Cards Grid */}
        <div className="odysseus-cards-grid">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className={`odysseus-card ${tool.isHolidayPick ? 'holiday-pick' : ''}`}
              onClick={() => setActiveToolId(tool.id)}
            >
              <div>
                {/* Card Top: Icon Box + Badges */}
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

                {/* Card Body: Title + Description */}
                <div className="odysseus-card-body">
                  <h3 className="odysseus-card-title">{tool.name}</h3>
                  <p className="odysseus-card-desc">{tool.description}</p>
                </div>
              </div>

              {/* Card Footer: Category + Open -> */}
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

      {/* ── Firebase Auth Modal ── */}
      {showAuth && (
        <AuthModal
          user={user}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
