import React, { useState, useEffect } from 'react';

const CAPABILITY_MODULES = [
  {
    id: 'chat',
    tag: 'MODULE 01 // CORE',
    title: 'AI Chatbot Assistant',
    description: 'Direct low-latency conversation powered by Groq LLaMA with rolling short-term memory, avatar chat bubbles, and live pipeline telemetry.',
    actions: [
      { label: 'Open AI Chat', tab: 'chat' },
      { label: 'Brainstorm an idea', prompt: 'Help me brainstorm a new project architecture.' }
    ]
  },
  {
    id: 'brain',
    tag: 'MODULE 02 // RAG VAULT',
    title: 'Second Brain Knowledge Base',
    description: 'Ingest personal notes, documents, and web links. Automatically chunks text for retrieval-augmented generation (RAG) and cites sources in chat.',
    actions: [
      { label: 'Open Second Brain', tab: 'brain' },
      { label: 'Query my notes', prompt: 'What is stored in my Second Brain right now?' }
    ]
  },
  {
    id: 'jarvis',
    tag: 'MODULE 03 // PRODUCTIVITY',
    title: 'Schedule, Tasks & Inbox Triage',
    description: 'Manage upcoming events, add tasks through natural language, summarize unread emails, and search messages from a unified workspace.',
    actions: [
      { label: 'Open Tools & Schedule', tab: 'jarvis' },
      { label: 'Check today\'s schedule', prompt: 'What is on my schedule today?' },
      { label: 'Summarize inbox', prompt: 'Summarize my inbox' }
    ]
  },
  {
    id: 'persona',
    tag: 'MODULE 04 // SYSTEM',
    title: 'Persona, Memory & Avatar Config',
    description: 'Customize Luna\'s system instructions, adjust response temperature, upload a custom PNG portrait, or reset short-term context.',
    actions: [
      { label: 'Open Settings', tab: 'persona' }
    ]
  }
];

export default function HomeTab({
  lunaPng,
  onChangeLunaPng,
  mood,
  brainBadge,
  llmAvg,
  ttsAvg,
  authHeader,
  onSelectTab,
  onAskLuna
}) {
  const [quickInput, setQuickInput] = useState('');
  const [brainStats, setBrainStats] = useState({ total_notes: 0, facts_count: 0, recent: [] });
  const [schedule, setSchedule] = useState([]);
  const [inboxSummary, setInboxSummary] = useState({ unread_count: 0, highlights: [] });

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const headers = await authHeader();
        const [brainRes, toolsRes] = await Promise.all([
          fetch('/brain/search?q=', { headers }),
          fetch('/tools/pending', { headers })
        ]);
        if (brainRes.ok) {
          const bData = await brainRes.json();
          setBrainStats({
            total_notes: bData.total_notes ?? (bData.results?.length || 0),
            facts_count: bData.facts_count ?? 0,
            recent: (bData.results || []).slice(0, 3)
          });
        }
        if (toolsRes.ok) {
          const tData = await toolsRes.json();
          setSchedule((tData.events || []).slice(0, 3));
          if (tData.inbox) {
            setInboxSummary({
              unread_count: tData.inbox.unread_count || 0,
              highlights: (tData.inbox.highlights || []).slice(0, 2)
            });
          }
        }
      } catch (e) {
        console.error('Overview load error:', e);
      }
    };
    fetchOverview();
  }, []);

  const handleQuickCommand = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onAskLuna(quickInput.trim());
    setQuickInput('');
  };

  return (
    <div className="tab-workspace" style={{ overflowY: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px minmax(0, 1fr)',
        gap: 14,
        flex: 1,
        minHeight: 0
      }}>
        {/* Left Column: Luna Identity Card + System Telemetry + Live Snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* Luna PNG Core Unit */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-head">
              <div className="panel-title">LUNA // ODYSSEUS CORE</div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                ONLINE
              </span>
            </div>

            <div style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '20px 16px 16px',
              background: 'var(--nds-surface)',
              borderBottom: '1.5px solid var(--nds-border-light)'
            }}>
              <div style={{
                width: 170,
                height: 170,
                borderRadius: 12,
                border: '1.5px solid var(--nds-border-main)',
                background: 'var(--nds-card-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                marginBottom: 12,
                boxShadow: '2px 2px 0px var(--nds-shadow)'
              }}>
                <img
                  src={lunaPng || '/luna.png'}
                  alt="Luna AI"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--nds-text)' }}>
                Luna Personal AI
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 2, textAlign: 'center' }}>
                Local-First Personal Assistant, Second Brain & Multi-Tool System
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, width: '100%' }}>
                <button
                  type="button"
                  className="btn-send"
                  style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
                  onClick={() => onSelectTab('chat')}
                >
                  Launch AI Chat
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '8px 12px', fontSize: 12 }}
                  onClick={() => onSelectTab('persona')}
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Telemetry Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              padding: 12,
              background: 'var(--nds-card-bg)',
              fontSize: 11.5
            }}>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--nds-text-muted)' }}>INFERENCE ENGINE</div>
                <div style={{ fontWeight: 800, color: 'var(--nds-blue-dark)', marginTop: 2 }}>{brainBadge.toUpperCase()}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--nds-text-muted)' }}>AVG LLM LATENCY</div>
                <div style={{ fontWeight: 800, color: 'var(--nds-text)', marginTop: 2 }}>{llmAvg} ms</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--nds-text-muted)' }}>SECOND BRAIN</div>
                <div style={{ fontWeight: 800, color: 'var(--nds-text)', marginTop: 2 }}>{brainStats.total_notes} Notes / {brainStats.facts_count} Facts</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--nds-text-muted)' }}>CURRENT MOOD</div>
                <div style={{ fontWeight: 800, color: 'var(--nds-text)', marginTop: 2 }}>{mood?.label || 'ready'}</div>
              </div>
            </div>
          </div>

          {/* Live Daily Briefing Card */}
          <div className="panel" style={{ padding: 0, flex: 1 }}>
            <div className="panel-head">
              <div className="panel-title">ACTIVE BRIEFING</div>
              <button type="button" className="btn-ghost sm" onClick={() => onSelectTab('jarvis')}>
                View All
              </button>
            </div>

            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-blue-dark)', letterSpacing: '0.05em', marginBottom: 6 }}>
                  UPCOMING SCHEDULE ({schedule.length})
                </div>
                {schedule.length === 0 ? (
                  <div style={{ color: 'var(--nds-text-muted)', fontSize: 12 }}>No scheduled items.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {schedule.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: 'var(--nds-surface)',
                          border: '1px solid var(--nds-border-light)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{evt.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>{evt.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-blue-dark)', letterSpacing: '0.05em', marginBottom: 6 }}>
                  INBOX STATUS ({inboxSummary.unread_count} UNREAD)
                </div>
                <div style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--nds-surface)',
                  border: '1px solid var(--nds-border-light)',
                  fontSize: 12,
                  color: 'var(--nds-text-muted)',
                  lineHeight: 1.45
                }}>
                  {inboxSummary.highlights.length > 0
                    ? inboxSummary.highlights.join(' | ')
                    : 'All caught up.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Command Bar + Odysseus Capabilities Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
          {/* Direct Command Console */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--nds-text)' }}>
                  COMMAND CONSOLE // ASK OR DISPATCH LUNA
                </div>
                <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', marginTop: 2 }}>
                  Send any instruction to Luna—she will automatically route it to conversation, Second Brain RAG, or your schedule/inbox tools.
                </div>
              </div>
            </div>

            <form onSubmit={handleQuickCommand} style={{ display: 'flex', gap: 8 }}>
              <input
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="Type a command for Luna (e.g. 'Summarize my inbox', 'Save a note to Second Brain', or ask anything)..."
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 13.5,
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn-send" style={{ padding: '0 22px', fontSize: 13 }}>
                Execute
              </button>
            </form>
          </div>

          {/* What Luna Can Do — System Modules Grid */}
          <div className="panel" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-head">
              <div className="panel-title">SYSTEM CAPABILITIES // WHAT LUNA CAN DO</div>
              <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', fontWeight: 700 }}>
                4 ACTIVE MODULES
              </span>
            </div>

            <div style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 14,
              flex: 1,
              overflowY: 'auto'
            }}>
              {CAPABILITY_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    background: 'var(--nds-surface)',
                    border: '1.5px solid var(--nds-border-main)',
                    borderRadius: 8,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '2px 2px 0px var(--nds-shadow)'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      color: 'var(--nds-blue-dark)',
                      marginBottom: 4
                    }}>
                      {mod.tag}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--nds-text)', marginBottom: 6 }}>
                      {mod.title}
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--nds-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {mod.description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid var(--nds-border-light)' }}>
                    {mod.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={act.tab ? 'btn-send' : 'btn-ghost sm'}
                        style={act.tab ? { padding: '6px 12px', fontSize: 11.5 } : { fontSize: 11.5 }}
                        onClick={() => {
                          if (act.tab) {
                            onSelectTab(act.tab);
                          } else if (act.prompt) {
                            onAskLuna(act.prompt);
                          }
                        }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

