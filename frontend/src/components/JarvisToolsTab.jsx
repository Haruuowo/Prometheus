import React, { useState, useEffect } from 'react';

export default function JarvisToolsTab({ 
  authHeader, 
  onAskLuna 
}) {
  const [inbox, setInbox] = useState(null);
  const [events, setEvents] = useState([]);
  const [searchMailQuery, setSearchMailQuery] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('Tomorrow, 3:00 PM');
  
  // Connect Inbox Modal / Card State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [inboxEmail, setInboxEmail] = useState('');
  const [inboxAppPassword, setInboxAppPassword] = useState('');
  const [connectStatus, setConnectStatus] = useState('');
  const [connecting, setConnecting] = useState(false);

  const loadToolsData = async () => {
    try {
      const headers = await authHeader();
      const res = await fetch('/tools/pending', { headers });
      const data = await res.json();
      setInbox(data.inbox || null);
      setEvents(data.events || []);
    } catch (e) {
      console.error('Failed to load tools:', e);
    }
  };

  useEffect(() => {
    loadToolsData();
  }, []);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    onAskLuna(`Schedule an event: ${eventTitle.trim()} (${eventTime})`);
    setEventTitle('');
  };

  const handleConnectInbox = async (e) => {
    e.preventDefault();
    if (!inboxEmail.trim() || !inboxAppPassword.trim()) return;
    setConnecting(true);
    setConnectStatus('Verifying credentials & reading inbox...');

    try {
      const headers = await authHeader();
      const res = await fetch('/api/inbox/connect', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inboxEmail.trim(),
          app_password: inboxAppPassword.trim()
        })
      });
      const data = await res.json();
      setConnecting(false);

      if (data.ok) {
        setConnectStatus('Connected! Syncing live emails...');
        setShowConnectModal(false);
        setInboxAppPassword('');
        loadToolsData();
      } else {
        setConnectStatus('Could not connect. Check your email and 16-character App Password.');
      }
    } catch (err) {
      setConnecting(false);
      setConnectStatus('Connection error. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      const headers = await authHeader();
      await fetch('/api/inbox/disconnect', { method: 'POST', headers });
      loadToolsData();
    } catch (e) {}
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
    <div className="tab-workspace">
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left Column: Inbox Triage & Search */}
        <div className="panel" style={{ padding: 0 }}>
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
                <button
                  type="button"
                  className="btn-ghost sm"
                  onClick={handleDisconnect}
                  title="Disconnect live inbox"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-send"
                  style={{ padding: '4px 10px', fontSize: 11.5 }}
                  onClick={() => setShowConnectModal(true)}
                >
                  Connect Your Gmail
                </button>
              )}
              <button
                type="button"
                className="btn-ghost sm"
                onClick={() => onAskLuna('Summarize my inbox')}
              >
                Summarize in Chat
              </button>
            </div>
          </div>

          {/* Connect Inbox In-App Helper Card */}
          {showConnectModal && (
            <div style={{
              margin: 12,
              padding: 14,
              borderRadius: 8,
              background: 'var(--nds-surface)',
              border: '1.5px solid var(--nds-blue-dark)',
              boxShadow: '2px 2px 0px var(--nds-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 13, color: 'var(--nds-blue-dark)' }}>
                  Connect Your Gmail (Open-Source IMAP)
                </b>
                <button
                  type="button"
                  className="btn-ghost sm"
                  onClick={() => setShowConnectModal(false)}
                >
                  Close
                </button>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', lineHeight: 1.45 }}>
                Connect your inbox using a Google <b>App Password</b> (zero OAuth wall, works for anyone):
                <ol style={{ paddingLeft: 18, margin: '4px 0 0' }}>
                  <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--nds-blue-dark)' }}>Google App Passwords</a>.</li>
                  <li>Type app name <code>Prometheus</code> and click Create.</li>
                  <li>Paste the 16-character password below:</li>
                </ol>
              </div>

              <form onSubmit={handleConnectInbox} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="email"
                  required
                  value={inboxEmail}
                  onChange={(e) => setInboxEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-card-bg)',
                    color: 'var(--nds-text)',
                    fontSize: 12.5
                  }}
                />
                <input
                  type="password"
                  required
                  value={inboxAppPassword}
                  onChange={(e) => setInboxAppPassword(e.target.value)}
                  placeholder="16-letter App Password (e.g. abcd efgh ijkl mnop)"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-card-bg)',
                    color: 'var(--nds-text)',
                    fontSize: 12.5
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, color: '#ef4444', fontWeight: 700 }}>
                    {connectStatus}
                  </span>
                  <button
                    type="submit"
                    className="btn-send"
                    disabled={connecting}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    {connecting ? 'Connecting...' : 'Connect Inbox'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--nds-border-light)', background: 'var(--nds-surface)' }}>
            <input
              value={searchMailQuery}
              onChange={(e) => setSearchMailQuery(e.target.value)}
              placeholder="Filter or search messages…"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1.5px solid var(--nds-border-main)',
                background: 'var(--nds-card-bg)',
                color: 'var(--nds-text)',
                fontSize: 13
              }}
            />
          </div>

          <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {filteredEmails.map((mail) => (
              <div
                key={mail.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--nds-chat-row)',
                  border: '1.5px solid var(--nds-border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 13.5 }}>{mail.subject}</b>
                  {mail.unread && <span className="plat Luna">UNREAD</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--nds-blue-dark)', fontWeight: 700 }}>
                  {mail.from} · {mail.date}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--nds-text-muted)', lineHeight: 1.45 }}>
                  {mail.snippet}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Personal Calendar & Tasks */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Schedule & Tasks</div>
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => onAskLuna('What is on my schedule?')}
            >
              Ask Luna
            </button>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
            <form onSubmit={handleAddEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8 }}>
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="New task, reminder, or meeting…"
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 13
                }}
              />
              <input
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="When"
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12.5
                }}
              />
              <button type="submit" className="btn-send">
                + Add
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--nds-chat-row)',
                    border: '1.5px solid var(--nds-border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
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
      </div>
    </div>
  );
}
