import React, { useState, useEffect } from 'react';

export default function JarvisToolsTab({ 
  authHeader, 
  onAskLuna 
}) {
  const [activeSubTab, setActiveSubTab] = useState('inbox'); // 'inbox' | 'calendar' | 'search' | 'sandbox' | 'smartsort' | 'music'
  const [inbox, setInbox] = useState(null);
  const [events, setEvents] = useState([]);
  const [connectors, setConnectors] = useState({});
  const [musicState, setMusicState] = useState({ is_playing: false, current_track: 'Odysseus Radio', volume: 75 });
  
  // Inbox search & Connect state
  const [searchMailQuery, setSearchMailQuery] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inboxEmail, setInboxEmail] = useState('');
  const [inboxAppPassword, setInboxAppPassword] = useState('');
  const [connectStatus, setConnectStatus] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Calendar
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('Tomorrow, 3:00 PM');

  // Web Search
  const [webQuery, setWebQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Code Helper Sandbox
  const [sandboxCode, setSandboxCode] = useState(
`# Python Quick Sandbox
def fibonacci(n):
    a, b = 0, 1
    res = []
    for _ in range(n):
        res.append(a)
        a, b = b, a + b
    return res

print("Fibonacci sequence:", fibonacci(8))`
  );
  const [sandboxResult, setSandboxResult] = useState(null);
  const [runningCode, setRunningCode] = useState(false);

  // SmartSort
  const [sortPath, setSortPath] = useState('~/Downloads');
  const [sortResult, setSortResult] = useState(null);
  const [sorting, setSorting] = useState(false);

  const loadToolsData = async () => {
    try {
      const headers = await authHeader();
      const res = await fetch('/tools/pending', { headers });
      const data = await res.json();
      setInbox(data.inbox || null);
      setEvents(data.events || []);
      setConnectors(data.connectors || {});
      if (data.music) setMusicState(data.music);
    } catch (e) {
      console.error('Failed to load tools:', e);
    }
  };

  useEffect(() => {
    loadToolsData();
  }, []);

  // Web Search Handler
  const handleWebSearch = async (e) => {
    e.preventDefault();
    if (!webQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/tools/web-search?q=${encodeURIComponent(webQuery.trim())}`, { method: 'POST' });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Code Sandbox Handler
  const handleRunCode = async () => {
    setRunningCode(true);
    try {
      const res = await fetch('/api/tools/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sandboxCode, language: 'python' })
      });
      const data = await res.json();
      setSandboxResult(data);
    } catch (err) {
      setSandboxResult({ ok: False, output: 'Network/server error while running code.' });
    } finally {
      setRunningCode(false);
    }
  };

  // SmartSort Handler
  const handleSmartSort = async (dryRun = true) => {
    setSorting(true);
    try {
      const res = await fetch('/api/tools/smart-sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: sortPath, dry_run: dryRun })
      });
      const data = await res.json();
      setSortResult(data);
    } catch (err) {
      setSortResult({ ok: false, error: 'Could not inspect directory' });
    } finally {
      setSorting(false);
    }
  };

  // Music Playback Handler
  const handleMusicAction = async (action, target = '') => {
    try {
      const res = await fetch('/api/tools/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target })
      });
      const data = await res.json();
      if (data.status) {
        setMusicState(prev => ({
          ...prev,
          is_playing: data.status === 'playing',
          current_track: data.track || prev.current_track
        }));
      }
    } catch (e) {}
  };

  // Inbox Connect Handlers
  const handleConnectInbox = async (e) => {
    e.preventDefault();
    if (!inboxEmail.trim() || !inboxAppPassword.trim()) return;
    setConnecting(true);
    setConnectStatus('Verifying & fetching...');
    try {
      const headers = await authHeader();
      const res = await fetch('/api/inbox/connect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inboxEmail.trim(), app_password: inboxAppPassword.trim() })
      });
      const data = await res.json();
      setConnecting(false);
      if (data.ok) {
        setShowConnectModal(false);
        setInboxAppPassword('');
        loadToolsData();
      } else {
        setConnectStatus('Check email and 16-character password.');
      }
    } catch (err) {
      setConnecting(false);
      setConnectStatus('Error connecting.');
    }
  };

  const handleDisconnectInbox = async () => {
    try {
      const headers = await authHeader();
      await fetch('/api/inbox/disconnect', { method: 'POST', headers });
      loadToolsData();
    } catch (e) {}
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    onAskLuna(`Schedule an event: ${eventTitle.trim()} (${eventTime})`);
    setEventTitle('');
  };

  const filteredEmails = (inbox?.emails || []).filter((m) => {
    if (!searchMailQuery.trim()) return true;
    const q = searchMailQuery.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.snippet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="tab-workspace" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Sub-Navigation for Tool Modules */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1.5px solid var(--nds-border-light)', paddingBottom: 10 }}>
        {[
          { id: 'inbox', label: 'Gmail & Inbox' },
          { id: 'calendar', label: 'Calendar & Connectors' },
          { id: 'search', label: 'Web Search & Citations' },
          { id: 'sandbox', label: 'Code Helper & Sandbox' },
          { id: 'smartsort', label: 'SmartSort File Organizer' },
          { id: 'music', label: 'Spotify & Music Control' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            className={activeSubTab === t.id ? 'btn-send' : 'btn-ghost sm'}
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setActiveSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. INBOX TAB */}
      {activeSubTab === 'inbox' && (
        <div className="panel" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="panel-title">Inbox Triage & Search</div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                background: inbox?.is_live ? '#10b981' : 'var(--nds-surface)',
                color: inbox?.is_live ? '#ffffff' : 'var(--nds-text-muted)',
                border: '1px solid var(--nds-border-light)'
              }}>
                {inbox?.is_live ? 'LIVE INBOX' : 'SAMPLE DATA'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {inbox?.is_live ? (
                <button type="button" className="btn-ghost sm" onClick={handleDisconnectInbox}>
                  Disconnect
                </button>
              ) : (
                <button type="button" className="btn-send" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => setShowConnectModal(true)}>
                  Connect Your Gmail
                </button>
              )}
              <button type="button" className="btn-ghost sm" onClick={() => onAskLuna('Summarize my inbox')}>
                Ask Luna
              </button>
            </div>
          </div>

          {showConnectModal && (
            <div style={{ margin: 12, padding: 14, borderRadius: 8, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-blue-dark)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13, color: 'var(--nds-blue-dark)' }}>Connect Gmail (Open-Source IMAP)</b>
                <button type="button" className="btn-ghost sm" onClick={() => setShowConnectModal(false)}>Close</button>
              </div>
              <form onSubmit={handleConnectInbox} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="email" required value={inboxEmail} onChange={(e) => setInboxEmail(e.target.value)} placeholder="your.email@gmail.com" style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', fontSize: 12.5 }} />
                <input type="password" required value={inboxAppPassword} onChange={(e) => setInboxAppPassword(e.target.value)} placeholder="16-letter Google App Password" style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', fontSize: 12.5 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 700 }}>{connectStatus}</span>
                  <button type="submit" className="btn-send" disabled={connecting} style={{ padding: '6px 14px', fontSize: 12 }}>
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--nds-border-light)' }}>
            <input value={searchMailQuery} onChange={(e) => setSearchMailQuery(e.target.value)} placeholder="Filter or search inbox messages..." style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontSize: 13 }} />
          </div>

          <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {filteredEmails.map((mail) => (
              <div key={mail.id} style={{ padding: 12, borderRadius: 8, background: 'var(--nds-chat-row)', border: '1.5px solid var(--nds-border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 13.5 }}>{mail.subject}</b>
                  {mail.unread && <span className="plat Luna">UNREAD</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--nds-blue-dark)', fontWeight: 700 }}>{mail.from} · {mail.date}</div>
                <div style={{ fontSize: 12.5, color: 'var(--nds-text-muted)', lineHeight: 1.45 }}>{mail.snippet}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CALENDAR & CONNECTORS TAB */}
      {activeSubTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, flex: 1 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-head">
              <div className="panel-title">Google Calendar & Tasks</div>
              <button type="button" className="btn-ghost sm" onClick={() => onAskLuna('What is on my schedule?')}>Ask Luna</button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <form onSubmit={handleAddEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 8 }}>
                <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="New task, reminder, meeting..." style={{ padding: '8px 12px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontSize: 13 }} />
                <input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="When" style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontSize: 12.5 }} />
                <button type="submit" className="btn-send">+ Add</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map((evt) => (
                  <div key={evt.id} style={{ padding: 12, borderRadius: 8, background: 'var(--nds-chat-row)', border: '1.5px solid var(--nds-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <b style={{ fontSize: 13.5 }}>{evt.title}</b>
                      <div style={{ fontSize: 12, color: 'var(--nds-text-muted)' }}>{evt.time}</div>
                    </div>
                    <span className="plat Twitch">{evt.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-head">
              <div className="panel-title">Cloud Connectors (Drive & Notion)</div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(connectors).map(([key, conn]) => (
                <div key={key} style={{ padding: 14, borderRadius: 8, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="plat Luna">{conn.icon}</span>
                      <b style={{ fontSize: 13.5 }}>{conn.name}</b>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', marginTop: 4 }}>{conn.detail}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{conn.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. WEB SEARCH & CITATIONS */}
      {activeSubTab === 'search' && (
        <div className="panel" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">Web Search with Cited Answers</div>
            <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', fontWeight: 700 }}>DUCKDUCKGO REAL-TIME API</span>
          </div>
          <form onSubmit={handleWebSearch} style={{ padding: 14, display: 'flex', gap: 8, borderBottom: '1.5px solid var(--nds-border-light)' }}>
            <input value={webQuery} onChange={(e) => setWebQuery(e.target.value)} placeholder="Search the web (e.g. 'latest React 19 features', 'Groq LLaMA benchmarks')..." style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontSize: 13.5 }} />
            <button type="submit" className="btn-send" disabled={searching} style={{ padding: '0 20px' }}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {searchResults.length === 0 ? (
              <div className="empty">Type a search query above or ask Luna in chat: "Search the web for..."</div>
            ) : (
              searchResults.map((r, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, fontSize: 14, color: 'var(--nds-blue-dark)' }}>
                      {r.title}
                    </a>
                    <button type="button" className="btn-ghost sm" onClick={() => onAskLuna(`Based on this search result: ${r.snippet}, explain it.`)}>
                      Ask Luna
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--nds-text)', lineHeight: 1.45 }}>{r.snippet}</div>
                  <div style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>{r.url}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. CODE HELPER & SANDBOX */}
      {activeSubTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, flex: 1 }}>
          <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-head">
              <div className="panel-title">Code Helper Sandbox (Python Subprocess)</div>
              <button type="button" className="btn-send" onClick={handleRunCode} disabled={runningCode}>
                {runningCode ? 'Executing...' : 'Run Script'}
              </button>
            </div>
            <textarea
              value={sandboxCode}
              onChange={(e) => setSandboxCode(e.target.value)}
              style={{
                flex: 1,
                minHeight: 260,
                padding: 14,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                background: 'var(--nds-card-bg)',
                color: 'var(--nds-text)',
                border: 'none',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5
              }}
            />
          </div>

          <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-head">
              <div className="panel-title">Terminal Output</div>
              {sandboxResult && (
                <span style={{ fontSize: 11, fontWeight: 800, color: sandboxResult.ok ? '#10b981' : '#ef4444' }}>
                  {sandboxResult.duration_ms}ms · Code {sandboxResult.exit_code ?? 0}
                </span>
              )}
            </div>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: 14,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12.5,
              background: 'var(--nds-surface)',
              color: 'var(--nds-text)',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {sandboxResult ? sandboxResult.output : 'Click "Run Script" to execute code in the sandbox.'}
            </pre>
          </div>
        </div>
      )}

      {/* 5. SMARTSORT FILE ORGANIZER */}
      {activeSubTab === 'smartsort' && (
        <div className="panel" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">SmartSort File Organizer</div>
            <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', fontWeight: 700 }}>AUTOMATIC FILE CLASSIFIER</span>
          </div>
          <div style={{ padding: 14, borderBottom: '1.5px solid var(--nds-border-light)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={sortPath} onChange={(e) => setSortPath(e.target.value)} placeholder="Folder path to sort (e.g. ~/Downloads, C:\Users\Downloads)..." style={{ flex: 1, padding: '9px 12px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontSize: 13 }} />
            <button type="button" className="btn-ghost" disabled={sorting} onClick={() => handleSmartSort(true)}>
              Preview Sort (Dry Run)
            </button>
            <button type="button" className="btn-send" disabled={sorting} onClick={() => handleSmartSort(false)}>
              Organize Now
            </button>
          </div>
          <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {sortResult ? (
              sortResult.ok ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--nds-blue-dark)', marginBottom: 8 }}>
                    Scanned {sortResult.files_found} files in {sortResult.directory} ({sortResult.dry_run ? 'Dry Run Preview' : 'Executed'}):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                    {sortResult.actions.map((act, i) => (
                      <div key={i} style={{ padding: 8, borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)', fontSize: 12 }}>
                        <span className="plat Twitch">{act.category}</span>
                        <div style={{ fontWeight: 700, marginTop: 4 }}>{act.file}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#ef4444', fontSize: 13 }}>{sortResult.error}</div>
              )
            ) : (
              <div className="empty">Enter a folder path and click "Preview Sort" to classify files into Images, Documents, Code, Audio, and Archives.</div>
            )}
          </div>
        </div>
      )}

      {/* 6. SPOTIFY & MUSIC CONTROL */}
      {activeSubTab === 'music' && (
        <div className="panel" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">Spotify & Music Playback Control</div>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>ACTIVE AUDIO CONTROLLER</span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1 }}>
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'var(--nds-blue-dark)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 36,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
            }}>
              ♫
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{musicState.current_track}</div>
              <div style={{ fontSize: 13, color: 'var(--nds-text-muted)', marginTop: 4 }}>
                Status: {musicState.is_playing ? 'Playing' : 'Paused'} · Volume: {musicState.volume}%
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn-ghost" onClick={() => handleMusicAction('prev')}>
                ⏮ Previous
              </button>
              <button
                type="button"
                className="btn-send"
                style={{ padding: '8px 24px' }}
                onClick={() => handleMusicAction(musicState.is_playing ? 'pause' : 'play')}
              >
                {musicState.is_playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => handleMusicAction('next')}>
                ⏭ Skip
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', marginTop: 12 }}>
              Voice command ready: Tell Luna in chat <i>"Play music"</i>, <i>"Pause song"</i>, or <i>"Skip track"</i>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
