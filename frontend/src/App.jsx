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

const DEFAULT_PROMPT = `You are Luna, the autonomous AI core of the Odysseus / Prometheus personal workspace.
You are sharp, witty, concise, and helpful. You assist with Second Brain notes, web research, reminders, coding, and creative tools.`;

export default function App() {
  // User & Auth
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

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
      text: "Odysseus Core online. Chat with me right here or scroll down to launch any tool from the workspace.",
    }
  ]);

  const chatEndRef = useRef(null);
  const wsRef = useRef(null);

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

    // Auto-open tool if user explicitly asks to open one
    const lower = text.toLowerCase();
    if (lower.includes('open background remover') || lower.includes('remove background')) {
      setActiveToolId('bg_remover');
    } else if (lower.includes('open resizer') || lower.includes('resize image')) {
      setActiveToolId('img_resizer');
    } else if (lower.includes('open second brain') || lower.includes('open notes')) {
      setActiveToolId('brain');
    } else if (lower.includes('open reminders')) {
      setActiveToolId('reminders');
    } else if (lower.includes('open github')) {
      setActiveToolId('github');
    }

    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user: senderName,
          platform: 'Console',
          system_prompt: DEFAULT_PROMPT,
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
        { id: Date.now() + Math.random(), user: 'Luna', text: "I'm right here! Pick any tool below or tell me what we're working on." }
      ]);
    }
  };

  const handleResetChat = async () => {
    try {
      const headers = await getAuthHeader();
      await fetch('/memory/reset', { method: 'POST', headers });
    } catch (e) {}
    setMessages([
      { id: Date.now(), user: 'Luna', text: 'Conversation history cleared! Your Second Brain notes are safe.' }
    ]);
  };

  // Filter tools for the grid
  const categories = ['ALL', 'PHOTO & IMAGE', 'AI & KNOWLEDGE', 'PRODUCTIVITY', 'DEVELOPER'];
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
      {/* ── Top Heading Strip (No Navbar) ── */}
      <header className="odysseus-header">
        <div className="odysseus-brand">
          <div className="odysseus-brand-top">
            <span className="odysseus-tag">ODYSSEUS // PROMETHEUS</span>
            <span className="odysseus-status">
              <span className="odysseus-status-dot" />
              LUNA CORE ONLINE
            </span>
          </div>
          <h1 className="odysseus-title">Personal AI Workspace</h1>
          <p className="odysseus-subtitle">
            Talk with Luna above or launch any standalone utility below.
          </p>
        </div>

        <div className="odysseus-header-actions">
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

      {/* ── Section 1: Luna AI Chatbot Console ── */}
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

          {/* Quick Prompt Chips */}
          <div className="luna-quick-prompts">
            <button type="button" className="quick-prompt-chip" onClick={() => handleSendMessage('Check my GitHub repos for Haruuowo')}>
              GitHub Repos
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => handleSendMessage('What is in my Second Brain notes?')}>
              Recall Second Brain
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => handleSendMessage('Show my upcoming schedule & reminders')}>
              Upcoming Schedule
            </button>
            <button type="button" className="quick-prompt-chip" onClick={() => setActiveToolId('bg_remover')}>
              Open Background Remover
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
              placeholder="Ask Luna anything, search your Second Brain, or command a tool..."
            />
            <button type="submit" className="luna-send-btn" disabled={thinking}>
              Send &rarr;
            </button>
          </form>
        </div>
      </section>

      {/* ── Section 2: Tool Cards Grid (Matches Screenshot) ── */}
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
            placeholder="Filter tools..."
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
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>

                  <div className="odysseus-card-badges">
                    {tool.isHolidayPick && (
                      <span className="badge-holiday">
                        <span>🎁</span> HOLIDAY PICK
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
