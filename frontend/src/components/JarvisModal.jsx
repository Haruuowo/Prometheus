import React, { useState, useEffect } from 'react';

export default function JarvisModal({ 
  authHeader, 
  pendingApprovals = [], 
  onApproveTool, 
  onClose 
}) {
  const [tab, setTab] = useState('brain'); // 'brain' | 'gmail'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [ingestStatus, setIngestStatus] = useState('');
  const [inboxData, setInboxData] = useState(null);
  const [eventsData, setEventsData] = useState([]);

  const fetchBrainSearch = async (q = '') => {
    try {
      const headers = await authHeader();
      const res = await fetch(`/brain/search?q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Brain search error:', err);
    }
  };

  const fetchJarvisTools = async () => {
    try {
      const headers = await authHeader();
      const res = await fetch('/tools/pending', { headers });
      const data = await res.json();
      setInboxData(data.inbox || null);
      setEventsData(data.events || []);
    } catch (err) {
      console.error('Tools fetch error:', err);
    }
  };

  useEffect(() => {
    fetchBrainSearch('');
    fetchJarvisTools();
  }, []);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setIngestStatus('Chunking & embedding into Second Brain…');
    try {
      const headers = await authHeader();
      const res = await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim() || 'Prometheus Note',
          content: noteContent.trim(),
          source_type: noteUrl ? 'link' : 'note',
          url: noteUrl.trim()
        })
      });
      const data = await res.json();
      setIngestStatus(`✓ Ingested ${data.chunks_added || 1} chunk(s) into your Second Brain.`);
      setNoteTitle('');
      setNoteContent('');
      setNoteUrl('');
      fetchBrainSearch(searchQuery);
    } catch (err) {
      setIngestStatus('Failed to ingest note.');
    }
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="modal-card wide">
        <button className="modal-x" onClick={onClose}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingRight: 32 }}>
          <div>
            <h2>Prometheus · Second Brain & Jarvis Tools</h2>
            <p>Per-user RAG knowledge base, Gmail inbox triage, and write-action approvals.</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{
                background: tab === 'brain' ? 'var(--nds-blue-dark)' : 'var(--nds-card-bg)',
                color: tab === 'brain' ? '#fff' : 'var(--nds-text)'
              }}
              onClick={() => setTab('brain')}
            >
              🧠 Second Brain
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{
                background: tab === 'gmail' ? 'var(--nds-blue-dark)' : 'var(--nds-card-bg)',
                color: tab === 'gmail' ? '#fff' : 'var(--nds-text)'
              }}
              onClick={() => setTab('gmail')}
            >
              ✉️ Jarvis Gmail & Calendar {pendingApprovals.length > 0 ? `(${pendingApprovals.length})` : ''}
            </button>
          </div>
        </div>

        {tab === 'brain' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
            {/* Left: Ingest Form (POST /brain/ingest) */}
            <form onSubmit={handleIngest} style={{
              background: 'var(--nds-card-bg)',
              border: '1.5px solid var(--nds-border-main)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--nds-blue-dark)', textTransform: 'uppercase' }}>
                Ingest Note / Link (POST /brain/ingest)
              </div>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Document / Note Title (e.g. Stream Schedule)"
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-light)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12.5
                }}
              />
              <input
                value={noteUrl}
                onChange={(e) => setNoteUrl(e.target.value)}
                placeholder="Optional Source URL (https://...)"
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-light)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12.5
                }}
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Paste notes, study material, or facts for Luna to cite in replies…"
                rows={5}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-light)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 12.5,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <button type="submit" className="btn-send" style={{ padding: '8px 14px' }}>
                + Ingest into Second Brain
              </button>
              {ingestStatus && (
                <div style={{ fontSize: 11.5, color: 'var(--nds-blue-dark)', fontWeight: 700 }}>
                  {ingestStatus}
                </div>
              )}
            </form>

            {/* Right: Search & Chunks (GET /brain/search?q=) */}
            <div style={{
              background: 'var(--nds-card-bg)',
              border: '1.5px solid var(--nds-border-main)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 340
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchBrainSearch(e.target.value);
                  }}
                  placeholder="Search Second Brain chunks (GET /brain/search?q=)…"
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-surface)',
                    color: 'var(--nds-text)',
                    fontSize: 12.5
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {searchResults.map((chunk, i) => (
                  <div key={chunk.id || i} style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'var(--nds-chat-row)',
                    border: '1px solid var(--nds-border-light)',
                    fontSize: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <b style={{ color: 'var(--nds-blue-dark)' }}>[{chunk.title}]</b>
                      <span style={{ fontSize: 10, color: 'var(--nds-text-muted)' }}>{chunk.source_type}</span>
                    </div>
                    <div style={{ color: 'var(--nds-text)', lineHeight: 1.4 }}>{chunk.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Pending Approvals & Inbox */}
            <div style={{
              background: 'var(--nds-card-bg)',
              border: '1.5px solid var(--nds-border-main)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--nds-blue-dark)', textTransform: 'uppercase' }}>
                Pending Write Actions (POST /tools/approve)
              </div>
              {pendingApprovals.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', padding: '8px 0' }}>
                  No pending write actions. Ask Luna: <i>"Draft a reply to Kai about launch"</i> to test the approval gate.
                </div>
              ) : (
                pendingApprovals.map((act) => (
                  <div key={act.action_id} style={{
                    padding: 10,
                    borderRadius: 6,
                    background: 'var(--nds-surface)',
                    border: '1.5px solid var(--nds-blue-dark)'
                  }}>
                    <b style={{ fontSize: 12.5 }}>{act.summary}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', margin: '6px 0', whiteSpace: 'pre-wrap' }}>
                      {act.payload?.body}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-ghost sm"
                        onClick={() => onApproveTool(act.action_id, false)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn-send"
                        style={{ padding: '4px 12px', fontSize: 11 }}
                        onClick={() => onApproveTool(act.action_id, true)}
                      >
                        ✓ Approve & Send Email
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--nds-blue-dark)', textTransform: 'uppercase', marginTop: 8 }}>
                Gmail Priority Inbox
              </div>
              {inboxData?.emails?.map((mail) => (
                <div key={mail.id} style={{
                  padding: 8,
                  borderRadius: 6,
                  background: 'var(--nds-chat-row)',
                  border: '1px solid var(--nds-border-light)',
                  fontSize: 12
                }}>
                  <div style={{ fontWeight: 700 }}>{mail.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--nds-blue-dark)' }}>{mail.from} · {mail.date}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', marginTop: 3 }}>{mail.snippet}</div>
                </div>
              ))}
            </div>

            {/* Calendar Events */}
            <div style={{
              background: 'var(--nds-card-bg)',
              border: '1.5px solid var(--nds-border-main)',
              borderRadius: 8,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--nds-blue-dark)', textTransform: 'uppercase' }}>
                Upcoming Schedule (Calendar Tool)
              </div>
              {eventsData.map((evt) => (
                <div key={evt.id} style={{
                  padding: 10,
                  borderRadius: 6,
                  background: 'var(--nds-chat-row)',
                  border: '1px solid var(--nds-border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12.5
                }}>
                  <div>
                    <b>{evt.title}</b>
                    <div style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>{evt.time}</div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--nds-blue-soft)',
                    color: 'var(--nds-blue-dark)'
                  }}>
                    {evt.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

