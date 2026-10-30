import React, { useState, useEffect, useRef } from 'react';
import PrometheusSidebar from './components/PrometheusSidebar';
import OdysseusToolsGrid from './components/OdysseusToolsGrid';
import Stage from './components/Stage';
import LiveChat from './components/LiveChat';
import BrainPipeline from './components/BrainPipeline';
import AuthModal from './components/AuthModal';
import HowItWorksModal from './components/HowItWorksModal';
import { TOOL_REGISTRY } from './tools/registry';
import { isFirebaseConfigured, auth, onAuthStateChanged } from './firebase';
import './styles/pictochat.css';

const MOODS = {
  chill:      { color: '#a78bfa', label: 'chill & witty' },
  supportive: { color: '#34d399', label: 'supportive & curious' },
  upbeat:     { color: '#f472b6', label: 'upbeat & sharp' },
  happy:      { color: '#f472b6', label: 'happy & upbeat' },
  smug:       { color: '#f59e0b', label: 'clever banter' },
  surprised:  { color: '#38bdf8', label: 'surprised' },
};

const DEFAULT_PROMPT = `You are Luna, the autonomous AI core of the Prometheus personal intelligence system, created for Kai.
You are a sharp, witty, highly competent personal assistant and second-brain companion.
You think through complex problems, organize and recall knowledge from Second Brain notes, triage incoming emails, manage schedule tasks, and execute instructions precisely.
Keep responses concise, natural, direct, and conversational without roleplay asterisks or cringe tropes.`;

export default function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' is default home, or 'tools', or any tool id
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('luna_theme') || 'dark');
  const [lunaPng, setLunaPng] = useState(localStorage.getItem('luna_custom_png') || '/luna.png');
  const wsRef = useRef(null);

  // Brain & Persona Settings
  const [brainBadge, setBrainBadge] = useState('groq');
  const [llmAvg, setLlmAvg] = useState(340);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(0.75);

  // Stage & Avatar State
  const [mood, setMood] = useState(MOODS.chill);
  const [thinking, setThinking] = useState(false);
  const [caption, setCaption] = useState('');
  const [captionActive, setCaptionActive] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Chat & Brain Pipeline State
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Luna',
      text: "Prometheus Core online. All workspace tools, Second Brain memory, and Live2D neural pipeline are synchronized. What are we building or executing today?",
      platform: 'Luna'
    }
  ]);
  const [stageMs, setStageMs] = useState({ chat: 1, route: 1, intent: 1, rag: 2, llm: 340, tts: 0, avatar: 1 });
  const [traces, setTraces] = useState([
    { icon: '>', html: '<b>Prometheus Core</b>: All-in-one AI workspace initialized.', ms: 1 },
    { icon: '>', html: 'route -> <b>P1 direct</b> <em>· personal assistant</em>', ms: 1 },
    { icon: '>', html: 'intent -> <b>workspace_ready</b> <em>(Luna online)</em>', ms: 1 }
  ]);
  const [activeNodes, setActiveNodes] = useState({});

  // Modals & Auth
  const [showHow, setShowHow] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  const handleUpdateLunaPng = (dataUrl) => {
    setLunaPng(dataUrl);
    try { localStorage.setItem('luna_custom_png', dataUrl); } catch (e) {}
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

  // 1. Theme Listener
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('luna_theme', theme);
  }, [theme]);

  // 2. Firebase Auth Listener
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsub = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsub();
    }
  }, []);

  // 3. WebSocket (/ws) Live Event Connection
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
            if (msg.type === 'hello') {
              if (msg.provider) setBrainBadge(msg.provider);
            } else if (msg.type === 'emotion') {
              const emo = String(msg.data || msg.emotion || 'chill').toLowerCase();
              if (MOODS[emo]) setMood(MOODS[emo]);
            } else if (msg.type === 'pipeline_trace') {
              const tr = msg.data || msg;
              if (tr.stage) {
                pulseNode(tr.stage);
                if (tr.ms != null) {
                  setStageMs(prev => ({ ...prev, [tr.stage]: tr.ms }));
                }
              }
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3000);
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
    setActiveNodes(prev => ({ ...prev, [nodeName]: true }));
    setTimeout(() => {
      setActiveNodes(prev => ({ ...prev, [nodeName]: false }));
    }, 1200);
  };

  const addTrace = (icon, html, ms = null, isErr = false, isSep = false) => {
    setTraces(prev => [...prev.slice(-35), { icon, html, ms, isErr, isSep }]);
  };

  // Visual Reply Reaction
  const showReplyReaction = (text, emotionName) => {
    setIsTalking(true);
    setCaption(text);
    setCaptionActive(true);
    const emoKey = String(emotionName || 'chill').toLowerCase();
    setMood(MOODS[emoKey] || MOODS.chill);
    setTimeout(() => {
      setIsTalking(false);
      setCaptionActive(false);
    }, 3200);
  };

  // Message Handling Flow (POST /chat) + Automatic Intent Tool Routing
  const handleIncomingMessage = async (text, senderName = 'You', platform = 'Console') => {
    pulseNode('chat');
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, user: senderName, platform }]);
    setThinking(true);

    // Auto-detect intent to switch active tool view
    const lower = text.toLowerCase();
    if (lower.includes('show tools') || lower.includes('open tools') || lower.includes('tool catalog') || lower.includes('explore tools')) {
      setActiveTab('tools');
    } else if (lower.includes('open brain') || lower.includes('open notes') || lower.includes('second brain') || lower.includes('save note')) {
      setActiveTab('brain');
    } else if (lower.includes('open reminder') || lower.includes('add reminder') || lower.includes('my tasks')) {
      setActiveTab('reminders');
    } else if (lower.includes('deep research') || lower.includes('research topic')) {
      setActiveTab('research');
    } else if (lower.includes('summarize this') || lower.includes('open summarizer')) {
      setActiveTab('summarizer');
    } else if (lower.includes('study') || lower.includes('flashcard')) {
      setActiveTab('study');
    } else if (lower.includes('github') || lower.includes('repos')) {
      setActiveTab('github');
    } else if (lower.includes('remove background') || lower.includes('resize image') || lower.includes('compress image')) {
      setActiveTab('image_tools');
    }

    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch('/chat', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          user: senderName,
          platform,
          system_prompt: customPrompt,
          temperature
        })
      });

      const data = await res.json();
      setThinking(false);

      if (data.stage_ms) {
        setStageMs(data.stage_ms);
        if (data.stage_ms.llm) setLlmAvg(data.stage_ms.llm);
      }

      if (Array.isArray(data.traces)) {
        addTrace('', '<hr>', null, false, true);
        data.traces.forEach((tr) => {
          pulseNode(tr.stage);
          addTrace(tr.icon || '>', tr.html, tr.ms);
        });
      }

      const replyText = data.reply || 'Done!';
      setMessages(prev => [...prev, { id: Date.now() + Math.random(), text: replyText, user: 'Luna', platform: 'Luna' }]);
      showReplyReaction(replyText, data.emotion || 'chill');

    } catch (err) {
      setThinking(false);
      const fallbackReply = "I'm right here with you! Your tools and Second Brain are standing by.";
      addTrace('!', `Local fallback active`, null, true);
      setMessages(prev => [...prev, { id: Date.now() + Math.random(), text: fallbackReply, user: 'Luna', platform: 'Luna' }]);
      showReplyReaction(fallbackReply, 'chill');
    }
  };

  // Reset Short-Term Memory (POST /memory/reset)
  const handleResetMemory = async () => {
    try {
      const headers = await getAuthHeader();
      await fetch('/memory/reset', { method: 'POST', headers });
    } catch (e) {}
    addTrace('>', 'short-term conversation memory cleared', 1);
    setMessages([{ id: Date.now(), user: 'Luna', text: 'Chat history reset. Second Brain vault and tool states are untouched.', platform: 'Luna' }]);
  };

  // Switch to AI Chat and send prompt
  const handleAskLunaFromTab = (promptText) => {
    setActiveTab('chat');
    handleIncomingMessage(promptText, user?.displayName || 'You', 'Console');
  };

  // Find active tool from registry if any
  const currentTool = TOOL_REGISTRY.find(t => t.id === activeTab);
  const ActiveToolComponent = currentTool?.component;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--nds-bg)'
    }}>
      {/* 1. Left Sidebar: Tool list + User profile + Sign out (Collapsible & Mobile Responsive) */}
      <PrometheusSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenHow={() => setShowHow(true)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 2. Center Workspace: Active Tool (Chat is default home, or Odysseus Tools Grid) */}
      <main style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 14px',
        gap: 10,
        background: 'var(--nds-bg)',
        overflow: 'hidden'
      }}>
        {/* Workspace Breadcrumb & Quick Switcher Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'var(--nds-surface)',
          border: '1.5px solid var(--nds-border-main)',
          borderRadius: 8,
          boxShadow: '1px 1px 0px var(--nds-shadow)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--nds-blue-dark)',
              letterSpacing: '0.08em'
            }}>
              PROMETHEUS // {activeTab === 'chat' ? 'AI CHAT CORE' : activeTab === 'tools' ? 'ODYSSEUS TOOL MATRIX' : (currentTool?.name?.toUpperCase() || activeTab.toUpperCase())}
            </span>
            <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800 }}>● ACTIVE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className={activeTab === 'chat' ? 'btn-send' : 'btn-ghost'}
              onClick={() => setActiveTab('chat')}
              style={{ fontSize: 11.5, padding: '4px 10px' }}
            >
              💬 Luna Chat
            </button>
            <button
              type="button"
              className={activeTab === 'tools' ? 'btn-send' : 'btn-ghost'}
              onClick={() => setActiveTab('tools')}
              style={{ fontSize: 11.5, padding: '4px 10px' }}
            >
              🎛️ Tool Catalog
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleResetMemory}
              title="Clear short-term chat memory"
              style={{ fontSize: 11.5, padding: '4px 8px' }}
            >
              🧹 Reset
            </button>
          </div>
        </div>

        {/* Center Content Switcher */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'tools' ? (
            <OdysseusToolsGrid
              tools={TOOL_REGISTRY}
              onSelectTool={(toolId) => setActiveTab(toolId)}
              onAskLuna={handleAskLunaFromTab}
            />
          ) : activeTab === 'chat' ? (
            <LiveChat
              messages={messages}
              onSendMessage={handleIncomingMessage}
              onClearChat={handleResetMemory}
              thinking={thinking}
              lunaPng={lunaPng}
              user={user}
            />
          ) : ActiveToolComponent ? (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <ActiveToolComponent
                authHeader={getAuthHeader}
                onAskLuna={handleAskLunaFromTab}
                messages={messages}
                onSendMessage={handleIncomingMessage}
                thinking={thinking}
                user={user}
                lunaPng={lunaPng}
                initialMode={
                  activeTab === 'img_resizer' ? 'resizer' :
                  activeTab === 'img_compressor' ? 'compressor' :
                  activeTab === 'palette_extractor' ? 'palette' : 'remover'
                }
              />
            </div>
          ) : (
            <LiveChat
              messages={messages}
              onSendMessage={handleIncomingMessage}
              onClearChat={handleResetMemory}
              thinking={thinking}
              lunaPng={lunaPng}
              user={user}
            />
          )}
        </div>
      </main>

      {/* 3. Right Panel: Luna Avatar + Live Pipeline Telemetry Trace (Router, Intent, LLM, TTS, Avatar with ms) */}
      <aside style={{
        width: 360,
        minWidth: 360,
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'minmax(270px, 320px) minmax(0, 1fr)',
        padding: '12px 14px 12px 0',
        gap: 10,
        background: 'var(--nds-bg)',
        zIndex: 5
      }}>
        <Stage
          mood={mood}
          thinking={thinking}
          caption={caption}
          captionActive={captionActive}
          isTalking={isTalking}
          lunaPng={lunaPng}
          onChangeLunaPng={handleUpdateLunaPng}
        />

        <BrainPipeline
          activeNodes={activeNodes}
          stageMs={stageMs}
          traces={traces}
          onResetMemory={handleResetMemory}
        />
      </aside>

      {/* Modals */}
      {showAuth && (
        <AuthModal
          user={user}
          onClose={() => setShowAuth(false)}
        />
      )}

      {showHow && (
        <HowItWorksModal
          onClose={() => setShowHow(false)}
        />
      )}
    </div>
  );
}
