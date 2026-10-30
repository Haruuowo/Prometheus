import React, { useState, useEffect } from 'react';
import { api } from '../api';

// 1. Chat Tool (Default Home)
export function ChatToolView({ messages, onSendMessage, thinking, user, lunaPng }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'You';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--nds-surface)',
        border: '1.5px solid var(--nds-border-main)',
        borderRadius: 8,
        boxShadow: '2px 2px 0px var(--nds-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <b style={{ fontSize: 13, letterSpacing: '0.04em' }}>PROMETHEUS // CHAT CORE</b>
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>ONLINE</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          Ask Luna anything or command any tool
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '14px 16px',
        background: 'var(--nds-card-bg)',
        border: '1.5px solid var(--nds-border-main)',
        borderRadius: 8
      }}>
        {messages.map((msg, i) => {
          const isLuna = msg.user === 'Luna' || msg.platform === 'Luna';
          return (
            <div
              key={msg.id || i}
              style={{
                display: 'flex',
                flexDirection: isLuna ? 'row' : 'row-reverse',
                gap: 10,
                maxWidth: '85%',
                alignSelf: isLuna ? 'flex-start' : 'flex-end'
              }}
            >
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: isLuna ? '1.5px solid var(--nds-border-main)' : '1.5px solid var(--nds-border-outer)',
                background: isLuna ? 'var(--nds-surface)' : 'var(--nds-blue-dark)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 800
              }}>
                {isLuna ? (
                  <img src={lunaPng || '/luna.png'} alt="Luna" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userDisplayName[0].toUpperCase()
                )}
              </div>

              <div>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  marginBottom: 3,
                  color: isLuna ? 'var(--nds-blue-dark)' : 'var(--nds-text-muted)',
                  textAlign: isLuna ? 'left' : 'right'
                }}>
                  {isLuna ? 'LUNA AI' : userDisplayName}
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isLuna ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  background: isLuna ? 'var(--nds-surface)' : 'var(--nds-blue-dark)',
                  color: isLuna ? 'var(--nds-text)' : '#ffffff',
                  border: isLuna ? '1.5px solid var(--nds-border-main)' : '1.5px solid var(--nds-border-outer)',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  boxShadow: '2px 2px 0px var(--nds-shadow)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {thinking && (
          <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start', alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--nds-border-main)', overflow: 'hidden' }}>
              <img src={lunaPng || '/luna.png'} alt="Luna" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '8px 14px', borderRadius: '4px 12px 12px 12px', background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-light)', fontSize: 12, color: 'var(--nds-text-muted)', fontWeight: 700 }}>
              Luna is reasoning...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Luna or command tools (e.g. 'summarize this', 'add reminder', 'research AI')..."
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: 6,
            border: '1.5px solid var(--nds-border-main)',
            background: 'var(--nds-surface)',
            color: 'var(--nds-text)',
            fontSize: 13.5,
            outline: 'none'
          }}
        />
        <button type="submit" className="btn-send" style={{ padding: '0 24px', fontSize: 13 }}>
          Send
        </button>
      </form>
    </div>
  );
}

// 2. Second Brain / Notes Tool
export function NotesToolView({ authHeader, onAskLuna }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');

  const loadNotes = async () => {
    const headers = await authHeader();
    const data = await api.getNotes(headers);
    setNotes(data);
  };

  useEffect(() => { loadNotes(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus('Ingesting note...');
    const headers = await authHeader();
    await api.ingestNote({ title: title.trim() || 'Untitled Note', content: content.trim() }, headers);
    setStatus('Saved & indexed.');
    setTitle('');
    setContent('');
    loadNotes();
    setTimeout(() => setStatus(''), 2000);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14, height: '100%' }}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <b style={{ fontSize: 13 }}>CAPTURE TO SECOND BRAIN</b>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topic or Title..." style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)' }} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste any knowledge, notes, or instructions for Luna to remember..." rows={8} style={{ flex: 1, padding: '10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--nds-blue-dark)', fontWeight: 800 }}>{status}</span>
          <button type="submit" className="btn-send" style={{ padding: '8px 16px', fontSize: 12 }}>+ Save Note</button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8, overflowY: 'auto' }}>
        <b style={{ fontSize: 13 }}>INDEXED KNOWLEDGE VAULT ({notes.length})</b>
        {notes.map((n, i) => (
          <div key={n.id || i} style={{ padding: 12, borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 13, color: 'var(--nds-blue-dark)' }}>{n.title}</b>
              <button type="button" className="btn-ghost sm" onClick={() => onAskLuna(`Regarding my note "${n.title}": ${n.content}, explain it.`)}>Ask Luna</button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--nds-text-muted)' }}>{n.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Reminders Tool
export function RemindersToolView({ authHeader, onAskLuna }) {
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('Tomorrow, 3:00 PM');

  const loadReminders = async () => {
    const headers = await authHeader();
    const data = await api.getReminders(headers);
    setReminders(data);
  };

  useEffect(() => { loadReminders(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const headers = await authHeader();
    await api.addReminder(title.trim(), time, headers);
    setTitle('');
    loadReminders();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 8, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task, reminder, meeting..." style={{ padding: '8px 12px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)' }} />
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="When" style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)' }} />
        <button type="submit" className="btn-send">+ Add Reminder</button>
      </form>

      <div style={{ flex: 1, padding: 14, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b style={{ fontSize: 13 }}>ACTIVE REMINDERS & SCHEDULE</b>
        {reminders.map((r, i) => (
          <div key={r.id || i} style={{ padding: 12, borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ fontSize: 13.5 }}>{r.title}</b>
              <div style={{ fontSize: 12, color: 'var(--nds-text-muted)' }}>{r.time}</div>
            </div>
            <button type="button" className="btn-ghost sm" onClick={() => onAskLuna(`Schedule reminder: ${r.title} (${r.time})`)}>Sync Luna</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Summarizer Tool
export function SummarizerToolView({ authHeader, onAskLuna }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const data = await api.summarizeText(text, headers);
    setResult(data.summary || '');
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <b style={{ fontSize: 13 }}>INPUT TEXT / ARTICLE TO SUMMARIZE</b>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste any article, email thread, or document here..." style={{ flex: 1, padding: 12, borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', resize: 'none' }} />
        <button type="button" className="btn-send" onClick={handleSummarize} disabled={loading} style={{ padding: '9px 16px' }}>
          {loading ? 'Synthesizing...' : 'Summarize Content'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 13 }}>EXECUTIVE SUMMARY</b>
          {result && <button type="button" className="btn-ghost sm" onClick={() => onAskLuna(`Save summary to Second Brain:\n${result}`)}>Save to Brain</button>}
        </div>
        <pre style={{ flex: 1, margin: 0, padding: 12, borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {result || 'Paste content on the left and click "Summarize Content".'}
        </pre>
      </div>
    </div>
  );
}

// 5. Research Tool
export function ResearchToolView({ authHeader, onAskLuna }) {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleResearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const data = await api.researchTopic(topic, headers);
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <form onSubmit={handleResearch} style={{ display: 'flex', gap: 8, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic or query to research with citations (e.g. 'LLM memory architectures', 'Vite 8 benchmarks')..." style={{ flex: 1, padding: '10px 14px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)' }} />
        <button type="submit" className="btn-send" disabled={loading} style={{ padding: '0 22px' }}>
          {loading ? 'Researching...' : 'Deep Research'}
        </button>
      </form>

      <div style={{ flex: 1, padding: 16, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {result ? (
          <div>
            <b style={{ fontSize: 13.5, color: 'var(--nds-blue-dark)' }}>SYNTHESIZED INSIGHTS</b>
            <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{result.insights}</p>
            <b style={{ fontSize: 12, marginTop: 12, display: 'block' }}>PRIMARY SOURCES & CITATIONS:</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {result.citations.map((c, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 6, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)' }}>
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: 'var(--nds-blue-dark)' }}>{c.title}</a>
                  <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', marginTop: 2 }}>{c.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty">Enter a topic above to launch the Prometheus research engine with real citations.</div>
        )}
      </div>
    </div>
  );
}

// 6. Writing Tool
export function WritingToolView({ authHeader, onAskLuna }) {
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('article');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWrite = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const data = await api.writeContent({ prompt, format }, headers);
    setDraft(data.draft || '');
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14, height: '100%' }}>
      <form onSubmit={handleWrite} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <b style={{ fontSize: 13 }}>WRITING ASSISTANT BRIEF</b>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What do you want to write? (e.g. 'Technical spec for Prometheus monorepo', 'Blog post on AI agents')..." rows={5} style={{ padding: 10, borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', resize: 'none' }} />
        <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)', fontWeight: 700 }}>
          <option value="article">Article / Technical Spec</option>
          <option value="email">Professional Email</option>
          <option value="documentation">Documentation / README</option>
          <option value="creative">Creative Concept</option>
        </select>
        <button type="submit" className="btn-send" disabled={loading} style={{ padding: '9px 16px' }}>
          {loading ? 'Drafting...' : 'Generate Piece'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        <b style={{ fontSize: 13 }}>GENERATED DOCUMENT DRAFT</b>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Draft will generate here..." style={{ flex: 1, padding: 12, borderRadius: 6, border: '1.5px solid var(--nds-border-light)', background: 'var(--nds-surface)', color: 'var(--nds-text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, resize: 'none' }} />
      </div>
    </div>
  );
}

// 7. Study Tool
export function StudyToolView({ onAskLuna }) {
  const [cardIndex, setCardIndex] = useState(0);
  const flashcards = [
    { q: "What is Retrieval-Augmented Generation (RAG)?", a: "Combining an external vector/document store with an LLM prompt to ground responses in user facts." },
    { q: "What is Low-Latency Function Calling?", a: "Detecting user intent in single-digit ms to trigger tools before running heavier inference steps." },
    { q: "How does the Prometheus Pipeline operate?", a: "6 stages: Chat -> Router -> Intent -> RAG -> LLM -> Avatar dispatch with telemetry ms tracking." }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 540, padding: 28, borderRadius: 12, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', boxShadow: '3px 3px 0px var(--nds-shadow)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-blue-dark)', letterSpacing: '0.06em' }}>
          FLASHCARD {cardIndex + 1} OF {flashcards.length}
        </span>
        <h3 style={{ fontSize: 18, margin: '14px 0 8px 0' }}>{flashcards[cardIndex].q}</h3>
        <p style={{ fontSize: 14, color: 'var(--nds-text-muted)', lineHeight: 1.5 }}>{flashcards[cardIndex].a}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button type="button" className="btn-ghost" onClick={() => setCardIndex((cardIndex - 1 + flashcards.length) % flashcards.length)}>Previous</button>
          <button type="button" className="btn-send" onClick={() => setCardIndex((cardIndex + 1) % flashcards.length)}>Next Card</button>
          <button type="button" className="btn-ghost" onClick={() => onAskLuna(`Test me on this topic: ${flashcards[cardIndex].q}`)}>Quiz with Luna</button>
        </div>
      </div>
    </div>
  );
}

// 8. GitHub Explorer Tool
export function GitHubToolView({ onAskLuna }) {
  const [user, setUser] = useState('Haruuowo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGithub = async (targetUser) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/github/overview?user=${encodeURIComponent(targetUser || 'Haruuowo')}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchGithub('Haruuowo');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); fetchGithub(user); }}
        style={{ display: 'flex', gap: 8, padding: 14, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}
      >
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="GitHub Username (e.g. Haruuowo)..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1.5px solid var(--nds-border-main)', background: 'var(--nds-card-bg)', color: 'var(--nds-text)' }}
        />
        <button type="submit" className="btn-send" disabled={loading} style={{ padding: '0 20px' }}>
          {loading ? 'Fetching...' : 'Query Repos'}
        </button>
      </form>

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 8, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={data.avatar_url} alt={data.username} style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid var(--nds-border-main)' }} />
            <div>
              <b style={{ fontSize: 16 }}>{data.username}</b>
              <div style={{ fontSize: 12, color: 'var(--nds-text-muted)' }}>
                {data.public_repos} Public Repositories &bull; {data.followers} Followers
              </div>
            </div>
            <a href={`https://github.com/${data.username}`} target="_blank" rel="noreferrer" className="btn-ghost sm" style={{ marginLeft: 'auto' }}>
              View Profile &rarr;
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {(data.repos || []).map((repo) => (
              <div key={repo.id} style={{ padding: 14, borderRadius: 8, background: 'var(--nds-surface)', border: '1px solid var(--nds-border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, fontSize: 14, color: 'var(--nds-blue-dark)', textDecoration: 'none' }}>
                    {repo.name}
                  </a>
                  <p style={{ fontSize: 12, color: 'var(--nds-text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                    {repo.description || 'No description provided.'}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--nds-text-muted)' }}>
                  <span>● {repo.language || 'Code'}</span>
                  <button type="button" className="btn-ghost sm" onClick={() => onAskLuna(`Analyze GitHub repository ${repo.name} by ${data.username}`)}>
                    Ask Luna
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 9. Photo & Canvas Studio (Background Remover, Resizer, Compressor, Palette)
export function ImageStudioToolView({ initialMode = 'remover' }) {
  const [subTool, setSubTool] = useState(initialMode);
  const [imageSrc, setImageSrc] = useState(null);
  const [processedSrc, setProcessedSrc] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [quality, setQuality] = useState(0.8);
  const [palette, setPalette] = useState([]);
  const canvasRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      setProcessedSrc(null);
      // Load into canvas to extract initial dimensions
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
        extractPalette(img);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const extractPalette = (img) => {
    const cvs = document.createElement('canvas');
    cvs.width = 100;
    cvs.height = 100;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, 100, 100);
    const data = ctx.getImageData(0, 0, 100, 100).data;
    const colors = [];
    for (let i = 0; i < data.length; i += 400) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      if (!colors.includes(hex)) colors.push(hex);
      if (colors.length >= 6) break;
    }
    setPalette(colors);
  };

  const handleRemoveBackground = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
      const d = imgData.data;
      // Key out top-left corner background color
      const bgR = d[0], bgG = d[1], bgB = d[2];
      const tolerance = 45;
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB);
        if (diff < tolerance) {
          d[i + 3] = 0; // Transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setProcessedSrc(cvs.toDataURL('image/png'));
    };
    img.src = imageSrc;
  };

  const handleResize = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = parseInt(dimensions.width) || 800;
      cvs.height = parseInt(dimensions.height) || 600;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
      setProcessedSrc(cvs.toDataURL('image/png'));
    };
    img.src = imageSrc;
  };

  const handleCompress = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setProcessedSrc(cvs.toDataURL('image/jpeg', parseFloat(quality)));
    };
    img.src = imageSrc;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto' }}>
      {/* Subtool Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: 8, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', borderRadius: 8 }}>
        {[
          { id: 'remover', label: 'Background Remover' },
          { id: 'resizer', label: 'Image Resizer' },
          { id: 'compressor', label: 'Image Compressor' },
          { id: 'palette', label: 'Color Palette' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={subTool === t.id ? 'btn-send' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={() => setSubTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <div style={{ padding: 18, border: '2px dashed var(--nds-border-main)', borderRadius: 10, background: 'var(--nds-card-bg)', textAlign: 'center' }}>
        <input type="file" accept="image/*" id="img-upload-input" onChange={handleFileChange} style={{ display: 'none' }} />
        <label htmlFor="img-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24 }}>🖼️</span>
          <b style={{ fontSize: 13.5 }}>Click or Drag an Image to Process</b>
          <span style={{ fontSize: 11.5, color: 'var(--nds-text-muted)' }}>Supports PNG, JPG, WebP</span>
        </label>
      </div>

      {/* Controls & Previews */}
      {imageSrc && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Action Panel */}
          <div style={{ padding: 16, borderRadius: 8, background: 'var(--nds-surface)', border: '1.5px solid var(--nds-border-main)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <b style={{ fontSize: 13 }}>TOOL CONTROLS</b>
            
            {subTool === 'remover' && (
              <div>
                <p style={{ fontSize: 12.5, color: 'var(--nds-text-muted)', marginBottom: 10 }}>
                  Click below to key out background matching colors automatically.
                </p>
                <button type="button" className="btn-send" onClick={handleRemoveBackground} style={{ width: '100%', padding: 10 }}>
                  Erase Background Now
                </button>
              </div>
            )}

            {subTool === 'resizer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ flex: 1, fontSize: 12 }}>
                    Width:
                    <input type="number" value={dimensions.width} onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--nds-border-main)' }} />
                  </label>
                  <label style={{ flex: 1, fontSize: 12 }}>
                    Height:
                    <input type="number" value={dimensions.height} onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--nds-border-main)' }} />
                  </label>
                </div>
                <button type="button" className="btn-send" onClick={handleResize} style={{ padding: 10 }}>
                  Resize Image
                </button>
              </div>
            )}

            {subTool === 'compressor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12 }}>
                  Quality: {Math.round(quality * 100)}%
                  <input type="range" min="0.1" max="1.0" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} style={{ width: '100%' }} />
                </label>
                <button type="button" className="btn-send" onClick={handleCompress} style={{ padding: 10 }}>
                  Compress Image
                </button>
              </div>
            )}

            {subTool === 'palette' && (
              <div>
                <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Extracted Color Swatches:</b>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {palette.map((hex, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigator.clipboard.writeText(hex)}
                      style={{ padding: '8px 12px', background: hex, color: '#fff', textShadow: '0 1px 2px #000', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                      title="Click to copy hex"
                    >
                      {hex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {processedSrc && (
              <a href={processedSrc} download={`prometheus_${subTool}.png`} className="btn-send" style={{ textAlign: 'center', textDecoration: 'none', padding: 10, marginTop: 10 }}>
                ⬇️ Download Processed Image
              </a>
            )}
          </div>

          {/* Preview Panel */}
          <div style={{ padding: 16, borderRadius: 8, background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
            <img
              src={processedSrc || imageSrc}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 6 }}
            />
            <span style={{ fontSize: 11, color: 'var(--nds-text-muted)', marginTop: 8 }}>
              {processedSrc ? '✓ Processed Result' : 'Original Preview'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Central Tool Registry ──
export const TOOL_REGISTRY = [
  {
    id: 'chat',
    name: 'AI Chat',
    icon: 'CHAT',
    badge: 'CORE',
    isHolidayPick: true,
    category: 'INTELLIGENCE',
    description: '1-on-1 low-latency conversational AI with Luna, rolling memory, and tool routing.',
    component: ChatToolView
  },
  {
    id: 'brain',
    name: 'Notes & Second Brain',
    icon: 'VAULT',
    badge: 'READY',
    isHolidayPick: true,
    category: 'KNOWLEDGE',
    description: 'Ingest personal documents, auto-chunk for RAG, and cite knowledge chunks.',
    component: NotesToolView
  },
  {
    id: 'reminders',
    name: 'Reminders & Tasks',
    icon: 'TASK',
    badge: 'SYNC',
    isHolidayPick: true,
    category: 'PRODUCTIVITY',
    description: 'Schedule deadlines, upcoming agendas, and track pending action items.',
    component: RemindersToolView
  },
  {
    id: 'research',
    name: 'Deep Research',
    icon: 'WEB',
    badge: 'CITATIONS',
    isHolidayPick: true,
    category: 'SEARCH',
    description: 'Perform web searches with verified primary sources, titles, and cited answers.',
    component: ResearchToolView
  },
  {
    id: 'summarizer',
    name: 'Text Summarizer',
    icon: 'DOC',
    badge: 'READY',
    category: 'CONTENT',
    description: 'Extract concise executive summaries and action items from long articles or emails.',
    component: SummarizerToolView
  },
  {
    id: 'write',
    name: 'Writing Assistant',
    icon: 'PEN',
    badge: 'READY',
    category: 'CREATION',
    description: 'Draft articles, technical specs, documentation, and polished communications.',
    component: WritingToolView
  },
  {
    id: 'study',
    name: 'Study & Flashcards',
    icon: 'CARD',
    badge: 'STUDY',
    category: 'LEARNING',
    description: 'Interactive flashcards, concept retention tests, and Luna quiz mode.',
    component: StudyToolView
  },
  {
    id: 'github',
    name: 'GitHub Explorer',
    icon: 'CODE',
    badge: 'LIVE',
    category: 'DEVELOPER',
    description: 'Inspect live GitHub repositories, stars, languages, and repo files for Haruuowo.',
    component: GitHubToolView
  },
  {
    id: 'image_tools',
    name: 'Background Remover',
    icon: 'IMAGE',
    badge: 'HOLIDAY PICK',
    isHolidayPick: true,
    category: 'PHOTO & IMAGE',
    description: 'Erase image backgrounds instantly. Click to key out matching colors, or use manual eraser.',
    component: ImageStudioToolView
  },
  {
    id: 'img_resizer',
    name: 'Image Resizer',
    icon: 'IMAGE',
    badge: 'HOLIDAY PICK',
    isHolidayPick: true,
    category: 'PHOTO & IMAGE',
    description: 'Resize images to precise dimensions using Canvas.',
    component: ImageStudioToolView
  },
  {
    id: 'img_compressor',
    name: 'Image Compressor',
    icon: 'IMAGE',
    badge: 'HOLIDAY PICK',
    isHolidayPick: true,
    category: 'PHOTO & IMAGE',
    description: 'Reduce image file sizes with real-time quality scale.',
    component: ImageStudioToolView
  },
  {
    id: 'palette_extractor',
    name: 'Color Palette Extractor',
    icon: 'IMAGE',
    badge: 'READY',
    category: 'PHOTO & IMAGE',
    description: 'Extract key color swatches and hex codes.',
    component: ImageStudioToolView
  }
];
