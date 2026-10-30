import React, { useState, useEffect } from 'react';

export default function HomeTab({
  lunaPng,
  mood,
  brainBadge,
  llmAvg,
  authHeader,
  onSelectTab,
  onAskLuna
}) {
  const [quickInput, setQuickInput] = useState('');
  const [brainStats, setBrainStats] = useState({ total_notes: 0, facts_count: 0, notes: [] });
  const [schedule, setSchedule] = useState([]);
  const [inboxSummary, setInboxSummary] = useState({ unread_count: 0, highlights: [], emails: [] });
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [quickNoteStatus, setQuickNoteStatus] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('Tomorrow, 3:00 PM');

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
          notes: (bData.results || []).slice(0, 4)
        });
      }
      if (toolsRes.ok) {
        const tData = await toolsRes.json();
        setSchedule(tData.events || []);
        if (tData.inbox) {
          setInboxSummary({
            unread_count: tData.inbox.unread_count || 0,
            highlights: tData.inbox.highlights || [],
            emails: (tData.inbox.emails || []).slice(0, 3)
          });
        }
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleQuickCommand = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onAskLuna(quickInput.trim());
    setQuickInput('');
  };

  const handleQuickNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    setQuickNoteStatus('Saving note to Second Brain...');
    try {
      const headers = await authHeader();
      const res = await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle.trim() || 'Quick Note',
          content: newNoteContent.trim(),
          source_type: 'note'
        })
      });
      if (res.ok) {
        setQuickNoteStatus('Saved to Second Brain.');
        setNewNoteTitle('');
        setNewNoteContent('');
        setTimeout(() => setQuickNoteStatus(''), 2500);
        fetchOverview();
      }
    } catch (err) {
      setQuickNoteStatus('Failed to save note.');
    }
  };

  const handleQuickEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    onAskLuna(`Schedule an event: ${newEventTitle.trim()} (${newEventTime})`);
    setNewEventTitle('');
  };

  return (
    <div className="tab-workspace" style={{ overflowY: 'auto', padding: '16px 20px', gap: 16 }}>
      {/* 1. Top Dashboard Header & Telemetry Stat Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              PROMETHEUS // COMMAND DASHBOARD
            </h1>
            <div style={{ fontSize: 12.5, color: 'var(--nds-text-muted)', marginTop: 2 }}>
              Central intelligence hub for Luna AI, Second Brain knowledge, and daily productivity
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-send"
              style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={() => onSelectTab('chat')}
            >
              Open AI Chat
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              onClick={fetchOverview}
              title="Refresh Dashboard Data"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Stat KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12
        }}>
          {/* KPI 1 */}
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-text-muted)', letterSpacing: '0.06em' }}>
              ASSISTANT CORE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--nds-blue-dark)' }}>
                Luna Online
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>
                ACTIVE
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 4 }}>
              Inference: {brainBadge.toUpperCase()} · Mood: {mood?.label || 'ready'}
            </div>
          </div>

          {/* KPI 2 */}
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-text-muted)', letterSpacing: '0.06em' }}>
              SECOND BRAIN
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--nds-text)' }}>
                {brainStats.total_notes} Notes
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-blue-dark)' }}>
                {brainStats.facts_count} Facts
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 4 }}>
              Automatic semantic chunking & RAG
            </div>
          </div>

          {/* KPI 3 */}
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-text-muted)', letterSpacing: '0.06em' }}>
              SCHEDULE & TASKS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--nds-text)' }}>
                {schedule.length} Events
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-blue-dark)' }}>
                UPCOMING
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 4 }}>
              Next: {schedule[0] ? schedule[0].title : 'None'}
            </div>
          </div>

          {/* KPI 4 */}
          <div className="panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--nds-text-muted)', letterSpacing: '0.06em' }}>
              INBOX STATUS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: inboxSummary.unread_count > 0 ? '#ef4444' : 'var(--nds-text)' }}>
                {inboxSummary.unread_count} Unread
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)' }}>
                {llmAvg}ms LLM
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 4 }}>
              Personal message triage ready
            </div>
          </div>
        </div>
      </div>

      {/* 2. Command Bar Console */}
      <div className="panel" style={{ padding: 14 }}>
        <form onSubmit={handleQuickCommand} style={{ display: 'flex', gap: 8 }}>
          <input
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Command Console: Ask Luna, search notes, schedule tasks, or ask 'Summarize my inbox'..."
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
          <button type="submit" className="btn-send" style={{ padding: '0 24px', fontSize: 13 }}>
            Execute
          </button>
        </form>
      </div>

      {/* 3. Main Dashboard Widgets Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr 1fr',
        gap: 14,
        flex: 1,
        minHeight: 0
      }}>
        {/* Widget 1: Luna Core Assistant & Actions */}
        <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">LUNA AI // CORE</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>ONLINE</span>
          </div>

          <div style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--nds-surface)',
            borderBottom: '1.5px solid var(--nds-border-light)'
          }}>
            <div style={{
              width: 140,
              height: 140,
              borderRadius: 12,
              border: '1.5px solid var(--nds-border-main)',
              background: 'var(--nds-card-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
              boxShadow: '2px 2px 0px var(--nds-shadow)',
              marginBottom: 10
            }}>
              <img
                src={lunaPng || '/luna.png'}
                alt="Luna AI"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ fontSize: 15, fontWeight: 800 }}>Luna Assistant</div>
            <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', textAlign: 'center', marginTop: 2 }}>
              Personal AI Companion & Knowledge Engine
            </div>
          </div>

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', letterSpacing: '0.05em' }}>
                QUICK DISPATCH
              </div>
              <button
                type="button"
                className="btn-ghost sm"
                style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}
                onClick={() => onAskLuna('Summarize my inbox')}
              >
                Summarize my inbox
              </button>
              <button
                type="button"
                className="btn-ghost sm"
                style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}
                onClick={() => onAskLuna('What is on my schedule today?')}
              >
                What is on my schedule today?
              </button>
              <button
                type="button"
                className="btn-ghost sm"
                style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}
                onClick={() => onAskLuna('Query my Second Brain: What are my key priorities?')}
              >
                Query my Second Brain
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn-send"
                style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
                onClick={() => onSelectTab('chat')}
              >
                Chat Interface
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={() => onSelectTab('persona')}
              >
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Widget 2: Second Brain Vault & Quick Capture */}
        <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">SECOND BRAIN // VAULT</div>
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => onSelectTab('brain')}
            >
              Open Vault
            </button>
          </div>

          {/* Quick Note Ingest */}
          <form onSubmit={handleQuickNote} style={{ padding: 14, borderBottom: '1.5px solid var(--nds-border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)' }}>
              QUICK CAPTURE NOTE
            </div>
            <input
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Title or Topic..."
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid var(--nds-border-main)',
                background: 'var(--nds-surface)',
                color: 'var(--nds-text)',
                fontSize: 12.5
              }}
            />
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Paste notes, thoughts, or facts for Luna to remember..."
              rows={2}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 6,
                border: '1.5px solid var(--nds-border-main)',
                background: 'var(--nds-surface)',
                color: 'var(--nds-text)',
                fontSize: 12.5,
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--nds-blue-dark)', fontWeight: 700 }}>
                {quickNoteStatus}
              </span>
              <button type="submit" className="btn-send" style={{ padding: '6px 14px', fontSize: 11.5 }}>
                + Capture Note
              </button>
            </div>
          </form>

          {/* Recent Notes List */}
          <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)' }}>
              RECENT KNOWLEDGE CHUNKS ({brainStats.notes.length})
            </div>
            {brainStats.notes.length === 0 ? (
              <div className="empty">No notes in Second Brain yet. Use Quick Capture above.</div>
            ) : (
              brainStats.notes.map((n, idx) => (
                <div
                  key={n.id || idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--nds-surface)',
                    border: '1px solid var(--nds-border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 12.5, color: 'var(--nds-blue-dark)' }}>{n.title}</b>
                    <span style={{ fontSize: 10, color: 'var(--nds-text-muted)' }}>{n.source_type || 'note'}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--nds-text)', lineHeight: 1.4, maxHeight: 36, overflow: 'hidden' }}>
                    {n.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 3: Schedule & Inbox Triage */}
        <div className="panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div className="panel-title">SCHEDULE & INBOX // PRODUCTIVITY</div>
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => onSelectTab('jarvis')}
            >
              Open Tools
            </button>
          </div>

          {/* Quick Schedule Input */}
          <form onSubmit={handleQuickEvent} style={{ padding: 14, borderBottom: '1.5px solid var(--nds-border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)' }}>
              SCHEDULE AN EVENT
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 6 }}>
              <input
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Meeting or task title..."
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12.5
                }}
              />
              <input
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                placeholder="When"
                style={{
                  padding: '7px 8px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12
                }}
              />
              <button type="submit" className="btn-send" style={{ padding: '6px 12px', fontSize: 11.5 }}>
                + Add
              </button>
            </div>
          </form>

          {/* Schedule List & Inbox Snapshot */}
          <div style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 6 }}>
                UPCOMING AGENDA ({schedule.length})
              </div>
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
                    <div>
                      <b style={{ fontSize: 12.5 }}>{evt.title}</b>
                      <div style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>{evt.time}</div>
                    </div>
                    <span className="plat Twitch">{evt.tag || 'EVENT'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 6 }}>
                INBOX HIGHLIGHTS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inboxSummary.emails.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: 'var(--nds-surface)',
                      border: '1px solid var(--nds-border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: 12 }}>{m.subject}</b>
                      {m.unread && <span className="plat Luna" style={{ fontSize: 9 }}>UNREAD</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>{m.from}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
