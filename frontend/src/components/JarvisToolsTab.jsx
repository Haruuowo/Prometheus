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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left Column: Inbox Triage & Search */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Inbox Triage & Search</div>
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => onAskLuna('Summarize my inbox')}
            >
              Summarize in Chat
            </button>
          </div>

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
