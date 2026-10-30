import React, { useState, useEffect, useRef } from 'react';
import Topbar from './components/Topbar';
import HomeTab from './components/HomeTab';
import Stage from './components/Stage';
import LiveChat from './components/LiveChat';
import BrainPipeline from './components/BrainPipeline';
import SecondBrainTab from './components/SecondBrainTab';
import JarvisToolsTab from './components/JarvisToolsTab';
import PersonaTab from './components/PersonaTab';
import AuthModal from './components/AuthModal';
import HowItWorksModal from './components/HowItWorksModal';
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

const DEFAULT_PROMPT = `you are luna, a personal ai assistant and second-brain companion created by kai (inspired by odysseus / jarvis).
you help kai think through ideas, search his second brain notes, manage tasks/calendar, and check emails.
keep replies concise, witty, supportive, and conversational without roleplay asterisks.`;

export default function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'chat' | 'brain' | 'jarvis' | 'persona'
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
    { id: 1, user: 'Luna', text: "Hey Kai! I'm online and ready. Ask me anything, search your Second Brain, or check your schedule.", platform: 'Luna' }
  ]);
  const [stageMs, setStageMs] = useState({ chat: 1, route: 1, intent: 1, rag: 2, llm: 340 });
  const [traces, setTraces] = useState([
    { icon: '>', html: '<b>System</b>: Personal AI Multi-Tool ready.', ms: 1 },
    { icon: '>', html: 'route -> <b>P1 direct</b> <em>· personal assistant</em>', ms: 1 },
    { icon: '>', html: 'intent -> <b>conversation</b>', ms: 1 }
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

  const handleResetLunaPng = () => {
    setLunaPng('/luna.png');
    try { localStorage.removeItem('luna_custom_png'); } catch (e) {}
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

  // Visual Reply Reaction (No TTS)
  const showReplyReaction = (text, emotionName) => {
    setIsTalking(true);
    setCaption(text);
    setCaptionActive(true);
    const emoKey = String(emotionName || 'chill').toLowerCase();
    setMood(MOODS[emoKey] || MOODS.chill);
    setTimeout(() => {
      setIsTalking(false);
      setCaptionActive(false);
    }, 2800);
  };

  // Message Handling Flow (POST /chat)
  const handleIncomingMessage = async (text, senderName = 'You', platform = 'Console') => {
    pulseNode('chat');
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, user: senderName, platform }]);
    setThinking(true);

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
      const fallbackReply = "I'm right here with you! What's our next move?";
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
    setMessages([{ id: Date.now(), user: 'Luna', text: 'Chat history cleared! Your Second Brain notes are safe.', platform: 'Luna' }]);
  };

  // Switch to AI Chat tab and send a prompt from any tool tab
  const handleAskLunaFromTab = (promptText) => {
    setActiveTab('chat');
    handleIncomingMessage(promptText, user?.displayName || 'You', 'Console');
  };

  return (
    <div className="app-container">
      {/* Top Multi-Tool Navigation Bar */}
      <Topbar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        brainBadge={brainBadge}
        llmAvg={llmAvg}
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenHow={() => setShowHow(true)}
        onOpenAuth={() => setShowAuth(true)}
        user={user}
      />

      {/* Tab 0: Odysseus Home Command Center */}
      {activeTab === 'home' && (
        <HomeTab
          lunaPng={lunaPng}
          onChangeLunaPng={handleUpdateLunaPng}
          mood={mood}
          brainBadge={brainBadge}
          llmAvg={llmAvg}
          authHeader={getAuthHeader}
          onSelectTab={setActiveTab}
          onAskLuna={handleAskLunaFromTab}
        />
      )}

      {/* Tab 1: AI Chatbot Workspace (Left: Luna PNG + Brain Pipeline | Right: Main AI Chatbot) */}
      {activeTab === 'chat' && (
        <main className="layout" style={{ gridTemplateColumns: '370px minmax(0, 1fr)' }}>
          <aside className="side" style={{ gridTemplateRows: 'minmax(280px, 1fr) minmax(0, 1fr)' }}>
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

          <LiveChat 
            messages={messages}
            onSendMessage={handleIncomingMessage}
            onClearChat={handleResetMemory}
            thinking={thinking}
            lunaPng={lunaPng}
            user={user}
          />
        </main>
      )}

      {/* Tab 2: Second Brain Knowledge & RAG Manager */}
      {activeTab === 'brain' && (
        <SecondBrainTab
          authHeader={getAuthHeader}
          onAskLuna={handleAskLunaFromTab}
        />
      )}

      {/* Tab 3: Tools & Schedule */}
      {activeTab === 'jarvis' && (
        <JarvisToolsTab
          authHeader={getAuthHeader}
          onAskLuna={handleAskLunaFromTab}
        />
      )}

      {/* Tab 4: Settings & Custom PNG */}
      {activeTab === 'persona' && (
        <PersonaTab
          customPrompt={customPrompt}
          onChangePrompt={setCustomPrompt}
          temperature={temperature}
          onChangeTemperature={setTemperature}
          lunaPng={lunaPng}
          onChangeLunaPng={handleUpdateLunaPng}
          onResetLunaPng={handleResetLunaPng}
          onResetMemory={handleResetMemory}
        />
      )}

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
