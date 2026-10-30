import React, { useState, useEffect } from 'react';

export default function SecondBrainTab({ authHeader, onAskLuna }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total_notes: 0, facts_count: 0 });
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState('note');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const loadBrain = async (q = '') => {
    try {
      const headers = await authHeader();
      const res = await fetch(`/brain/search?q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json();
      setResults(data.results || []);
      setStats({
        total_notes: data.total_notes ?? (data.results?.length || 0),
        facts_count: data.facts_count ?? 0
      });
    } catch (e) {
      console.error('Second Brain fetch error:', e);
    }
  };

  useEffect(() => {
    loadBrain('');
  }, []);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus('Chunking & storing in Second Brain…');
    try {
      const headers = await authHeader();
      const res = await fetch('/brain/ingest', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Note',
          content: content.trim(),
          source_type: sourceType,
          url: url.trim()
        })
      });
      const data = await res.json();
      setStatus(`✓ Saved ${data.chunks_added || 1} chunk(s) to Second Brain.`);
      setTitle('');
      setUrl('');
      setContent('');
      loadBrain(searchQuery);
    } catch (e) {
      setStatus('Failed to save note.');
    }
  };

  return (
    <div className="tab-workspace">
      <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 14, flex: 1, minHeight: 0 }}>
        {/* Left Panel: Ingest Notes / Docs / Links */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Add to Second Brain</div>
            <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', fontWeight: 700 }}>
              POST /brain/ingest
            </span>
          </div>

          <form onSubmit={handleIngest} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 4 }}>
                TITLE / TOPIC
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Roadmap, Study Notes, Recipe…"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 13
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 4 }}>
                  SOURCE TYPE
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-surface)',
                    color: 'var(--nds-text)',
                    fontSize: 12.5,
                    fontWeight: 700
                  }}
                >
                  <option value="note">Note</option>
                  <option value="link">Link</option>
                  <option value="pdf">Document</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 4 }}>
                  OPTIONAL URL
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-surface)',
                    color: 'var(--nds-text)',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 4 }}>
                KNOWLEDGE CONTENT (AUTO-CHUNKED FOR RAG)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste any knowledge, articles, facts, or instructions here. Luna automatically retrieves top-k chunks and cites [Source: Title] when answering you…"
                style={{
                  flex: 1,
                  minHeight: 160,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button type="submit" className="btn-send" style={{ padding: '10px 16px', fontSize: 13 }}>
              + Save & Index in Second Brain
            </button>

            {status && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--nds-blue-dark)' }}>
                {status}
              </div>
            )}
          </form>
        </div>

        {/* Right Panel: Search & Browse Knowledge Base */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Second Brain Knowledge & Long-Term Memory</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, fontWeight: 700, color: 'var(--nds-text-muted)' }}>
              <span>{stats.total_notes} Notes</span>
              <span>·</span>
              <span>{stats.facts_count} Long-Term Facts</span>
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--nds-border-light)', background: 'var(--nds-surface)' }}>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadBrain(e.target.value);
              }}
              placeholder="Search across your Second Brain notes and Luna's long-term memory…"
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 6,
                border: '1.5px solid var(--nds-border-main)',
                background: 'var(--nds-card-bg)',
                color: 'var(--nds-text)',
                fontSize: 13
              }}
            />
          </div>

          <div className="chatlog" style={{ padding: 16, gap: 10 }}>
            {results.length === 0 ? (
              <div className="empty">No matching Second Brain chunks found.</div>
            ) : (
              results.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: 'var(--nds-card-bg)',
                    border: '1.5px solid var(--nds-border-main)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="plat Luna">{item.source_type || 'note'}</span>
                      <b style={{ fontSize: 13.5, color: 'var(--nds-blue-dark)' }}>{item.title}</b>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost sm"
                      onClick={() => onAskLuna(`Based on my Second Brain note "${item.title}", tell me about it.`)}
                    >
                      Ask Luna in Chat →
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--nds-text)', lineHeight: 1.5 }}>
                    {item.content}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11.5, color: 'var(--nds-blue-dark)' }}
                    >
                      {item.url}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

