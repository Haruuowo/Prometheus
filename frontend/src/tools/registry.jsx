import React, { useState, useEffect } from 'react';
import { api } from '../api';

const inputStyle = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #2b303c',
  background: '#0e1014',
  color: '#f3f4f6',
  fontSize: 13.5,
  outline: 'none',
  width: '100%'
};

const btnGold = {
  padding: '10px 18px',
  borderRadius: 10,
  border: 'none',
  background: '#f59e0b',
  color: '#0b0c0e',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer'
};

const btnSubtle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #2b303c',
  background: '#181b22',
  color: '#e5e7eb',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer'
};

// ── 1. Photo & Image Canvas Studio (Handles all 9 Photo & Image tools) ──────
export function PhotoCanvasTool({ initialMode = 'bg_remover', onAskLuna }) {
  const [mode, setMode] = useState(initialMode);
  const [imageSrc, setImageSrc] = useState(null);
  const [processedSrc, setProcessedSrc] = useState(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [quality, setQuality] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [contrast, setContrast] = useState(120);
  const [watermarkText, setWatermarkText] = useState('ODYSSEUS // PROMETHEUS');
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [palette, setPalette] = useState(['#f59e0b', '#38bdf8', '#10b981', '#a78bfa', '#f472b6', '#1e293b']);
  const [tolerance, setTolerance] = useState(45);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      setImageSrc(src);
      setProcessedSrc(null);
      const img = new Image();
      img.onload = () => {
        setWidth(img.width);
        setHeight(img.height);
        extractColors(img);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const extractColors = (img) => {
    const cvs = document.createElement('canvas');
    cvs.width = 64;
    cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    const found = [];
    for (let i = 0; i < data.length; i += 256) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      if (!found.includes(hex)) found.push(hex);
      if (found.length >= 8) break;
    }
    if (found.length) setPalette(found);
  };

  const runProcess = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');

      if (mode === 'bg_remover') {
        cvs.width = img.width;
        cvs.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
        const d = imgData.data;
        const r0 = d[0], g0 = d[1], b0 = d[2];
        for (let i = 0; i < d.length; i += 4) {
          const dist = Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0);
          if (dist < tolerance) d[i + 3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'img_resizer') {
        cvs.width = Number(width) || img.width;
        cvs.height = Number(height) || img.height;
        ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'img_compressor') {
        cvs.width = img.width;
        cvs.height = img.height;
        ctx.drawImage(img, 0, 0);
        setProcessedSrc(cvs.toDataURL('image/jpeg', Number(quality)));
      } else if (mode === 'crop_rotate') {
        const rad = ((Number(rotation) || 90) * Math.PI) / 180;
        cvs.width = img.height;
        cvs.height = img.width;
        ctx.translate(cvs.width / 2, cvs.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'detail_enhancer') {
        cvs.width = img.width;
        cvs.height = img.height;
        ctx.filter = `contrast(${contrast}%) saturate(115%) brightness(103%)`;
        ctx.drawImage(img, 0, 0);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'watermark') {
        cvs.width = img.width;
        cvs.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.font = `bold ${Math.max(18, Math.round(img.width / 22))}px sans-serif`;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fillText(watermarkText, 24, cvs.height - 28);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'upscaler') {
        const scale = Number(upscaleFactor) || 2;
        cvs.width = img.width * scale;
        cvs.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
        setProcessedSrc(cvs.toDataURL('image/png'));
      } else if (mode === 'collage_maker') {
        cvs.width = img.width * 2 + 20;
        cvs.height = img.height * 2 + 20;
        ctx.fillStyle = '#0e1014';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, img.width + 20, 0);
        ctx.filter = 'sepia(80%)';
        ctx.drawImage(img, 0, img.height + 20);
        ctx.filter = 'contrast(135%)';
        ctx.drawImage(img, img.width + 20, img.height + 20);
        setProcessedSrc(cvs.toDataURL('image/png'));
      }
    };
    img.src = imageSrc;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Upload Box */}
      <div style={{
        padding: 24,
        borderRadius: 14,
        border: '1.5px dashed #323846',
        background: '#0e1014',
        textAlign: 'center'
      }}>
        <input type="file" accept="image/*" id="odysseus-img-input" onChange={handleUpload} style={{ display: 'none' }} />
        <label htmlFor="odysseus-img-input" style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>+ Select or Drop Image File</span>
          <span style={{ fontSize: 12, color: '#8e96a4' }}>Instant local HTML5 Canvas processing (PNG, JPG, WebP)</span>
        </label>
      </div>

      {/* Mode Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
        <div style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <b style={{ fontSize: 13, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>PARAMETERS // {mode.toUpperCase()}</b>

          {mode === 'bg_remover' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              Color Key Tolerance ({tolerance}):
              <input type="range" min="10" max="140" value={tolerance} onChange={(e) => setTolerance(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
            </label>
          )}

          {mode === 'img_resizer' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, fontSize: 12, color: '#9ca3af' }}>
                Width (px)
                <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              </label>
              <label style={{ flex: 1, fontSize: 12, color: '#9ca3af' }}>
                Height (px)
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              </label>
            </div>
          )}

          {mode === 'img_compressor' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              JPEG Quality ({Math.round(quality * 100)}%):
              <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
            </label>
          )}

          {mode === 'crop_rotate' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              Rotation Angle (deg):
              <input type="number" step="90" value={rotation} onChange={(e) => setRotation(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
            </label>
          )}

          {mode === 'detail_enhancer' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              Local Contrast ({contrast}%):
              <input type="range" min="100" max="180" value={contrast} onChange={(e) => setContrast(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
            </label>
          )}

          {mode === 'watermark' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              Watermark Overlay Text:
              <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
            </label>
          )}

          {mode === 'upscaler' && (
            <label style={{ fontSize: 12.5, color: '#9ca3af' }}>
              Bicubic Scale Factor ({upscaleFactor}x):
              <select value={upscaleFactor} onChange={(e) => setUpscaleFactor(e.target.value)} style={{ ...inputStyle, marginTop: 6 }}>
                <option value={2}>2x Resolution</option>
                <option value={3}>3x Resolution</option>
                <option value={4}>4x Resolution</option>
              </select>
            </label>
          )}

          {mode === 'palette_extractor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Extracted Swatches (Click to Copy):</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {palette.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(hex)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #2b303c',
                      background: hex,
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      fontWeight: 800,
                      fontSize: 11.5,
                      cursor: 'pointer'
                    }}
                  >
                    {hex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode !== 'palette_extractor' && (
            <button type="button" onClick={runProcess} style={btnGold} disabled={!imageSrc}>
              Apply & Render
            </button>
          )}

          {processedSrc && (
            <a
              href={processedSrc}
              download={`odysseus_${mode}.png`}
              style={{ ...btnSubtle, textAlign: 'center', textDecoration: 'none', color: '#10b981', borderColor: '#10b981' }}
            >
              Download Output Image &rarr;
            </a>
          )}
        </div>

        {/* Canvas Preview */}
        <div style={{
          background: '#0e1014',
          border: '1px solid #232730',
          borderRadius: 14,
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280
        }}>
          {processedSrc || imageSrc ? (
            <img
              src={processedSrc || imageSrc}
              alt="Canvas Preview"
              style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain', borderRadius: 8 }}
            />
          ) : (
            <span style={{ fontSize: 13, color: '#6b7280' }}>Upload an image above to preview & process on Canvas.</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 2. Second Brain / Notes Vault ────────────────────────────────────────────
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
    setStatus('Indexing into Second Brain...');
    const headers = await authHeader();
    await api.ingestNote({ title: title.trim() || 'Untitled Note', content: content.trim() }, headers);
    setTitle('');
    setContent('');
    setStatus('Saved & indexed for RAG!');
    loadNotes();
    setTimeout(() => setStatus(''), 2500);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0e1014', padding: 18, borderRadius: 14, border: '1px solid #232730' }}>
        <b style={{ fontSize: 13, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>CAPTURE NOTE TO VAULT</b>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title or topic..." style={inputStyle} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write facts, project docs, or instructions for Luna..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
        <button type="submit" style={btnGold}>+ Save to Second Brain</button>
        {status && <span style={{ fontSize: 12, color: '#10b981' }}>{status}</span>}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>INDEXED MEMORY CHUNKS ({notes.length})</b>
        {notes.map((n, i) => (
          <div key={n.id || i} style={{ padding: 14, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <b style={{ fontSize: 14, color: '#ffffff' }}>{n.title}</b>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, lineHeight: 1.45 }}>{n.content}</p>
            </div>
            <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Recall my note "${n.title}" and help me expand on it.`)}>
              Ask Luna
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Reminders & Tasks ─────────────────────────────────────────────────────
export function RemindersToolView({ authHeader, onAskLuna }) {
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('Tomorrow, 3:00 PM');

  const load = async () => {
    const headers = await authHeader();
    const list = await api.getReminders(headers);
    setReminders(list);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const headers = await authHeader();
    await api.addReminder(title.trim(), time, headers);
    setTitle('');
    load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 220px auto', gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task, deadline, or reminder..." style={inputStyle} />
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="When..." style={inputStyle} />
        <button type="submit" style={btnGold}>+ Add Reminder</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reminders.map((r, i) => (
          <div key={r.id || i} style={{ padding: 14, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ fontSize: 14, color: '#fff' }}>{r.title}</b>
              <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>{r.time}</div>
            </div>
            <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Remind me about "${r.title}" scheduled for ${r.time}.`)}>
              Sync with Luna
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Deep Web Research ─────────────────────────────────────────────────────
export function ResearchToolView({ authHeader }) {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const res = await api.researchTopic(topic, headers);
    setResult(res);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter topic or question to research with web citations..." style={inputStyle} />
        <button type="submit" style={btnGold} disabled={loading}>{loading ? 'Searching...' : 'Research'}</button>
      </form>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#0e1014', padding: 18, borderRadius: 14, border: '1px solid #232730' }}>
          <div>
            <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>SYNTHESIZED BRIEFING</b>
            <p style={{ fontSize: 13.5, color: '#e5e7eb', lineHeight: 1.55, marginTop: 6, whiteSpace: 'pre-wrap' }}>{result.insights}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>VERIFIED SOURCES</b>
            {(result.citations || []).map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ padding: 12, borderRadius: 10, background: '#14171d', border: '1px solid #262b36', textDecoration: 'none', color: '#38bdf8' }}>
                <b style={{ fontSize: 13 }}>{c.title}</b>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{c.snippet}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 5. Text Summarizer ───────────────────────────────────────────────────────
export function SummarizerToolView({ authHeader }) {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!text.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const data = await api.summarizeText(text, headers);
    setSummary(data.summary || '');
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste long article, notes, or email thread here..." rows={10} style={{ ...inputStyle, resize: 'vertical' }} />
        <button type="button" onClick={handleSummarize} style={btnGold} disabled={loading}>
          {loading ? 'Summarizing...' : 'Summarize Text'}
        </button>
      </div>
      <div style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55, color: '#e5e7eb' }}>
        {summary || 'Executive bullet-point summary will appear here.'}
      </div>
    </div>
  );
}

// ── 6. AI Writing Studio ─────────────────────────────────────────────────────
export function WritingToolView({ authHeader }) {
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('article');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWrite = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    const headers = await authHeader();
    const res = await api.writeContent({ prompt, format }, headers);
    setDraft(res.draft || '');
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <form onSubmit={handleWrite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What should Luna draft for you?" rows={6} style={inputStyle} />
        <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
          <option value="article">Technical Spec / Article</option>
          <option value="email">Professional Email</option>
          <option value="documentation">README / Documentation</option>
        </select>
        <button type="submit" style={btnGold} disabled={loading}>{loading ? 'Drafting...' : 'Generate Draft'}</button>
      </form>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Generated draft will appear here..." rows={12} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
    </div>
  );
}

// ── 7. GitHub API Explorer ───────────────────────────────────────────────────
export function GitHubToolView({ onAskLuna }) {
  const [username, setUsername] = useState('Haruuowo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadGithub = async (u) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/github/overview?user=${encodeURIComponent(u || 'Haruuowo')}`);
      if (res.ok) setData(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadGithub('Haruuowo'); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={(e) => { e.preventDefault(); loadGithub(username); }} style={{ display: 'flex', gap: 10 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="GitHub username..." style={inputStyle} />
        <button type="submit" style={btnGold}>{loading ? 'Loading...' : 'Fetch GitHub'}</button>
      </form>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {(data.repos || []).map((repo) => (
            <div key={repo.id} style={{ padding: 16, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14.5, textDecoration: 'none' }}>
                  {repo.name}
                </a>
                <p style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 6 }}>{repo.description || 'Active repository'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#6b7280' }}>
                <span>{repo.language || 'Code'} • ★ {repo.stars || 0}</span>
                <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Tell me about the GitHub repo ${repo.name}: ${repo.description || ''}`)}>
                  Ask Luna
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 8. Python Code Sandbox ───────────────────────────────────────────────────
export function SandboxToolView() {
  const [code, setCode] = useState('import math\nprint("Odysseus Sandbox Ready:", [math.factorial(n) for n in range(6)])');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const runCode = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tools/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'python' })
      });
      const data = await res.json();
      setOutput(data.output || 'Done (no stdout)');
    } catch (e) {
      setOutput('Error executing script.');
    }
    setRunning(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={10} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} />
        <button type="button" onClick={runCode} style={btnGold} disabled={running}>{running ? 'Executing...' : '▶ Run Python Script'}</button>
      </div>
      <pre style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 12, padding: 16, color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, overflowX: 'auto' }}>
        {output || '// Output console ready'}
      </pre>
    </div>
  );
}

// ── Central Tool Registry (Matches Screenshot + AI & Dev Tools) ──────────────
export const TOOL_REGISTRY = [
  // Row 1 from screenshot (Holiday Picks)
  {
    id: 'bg_remover',
    name: 'Background Remover',
    category: 'PHOTO & IMAGE',
    isHolidayPick: true,
    description: 'Erase image backgrounds instantly. Click to key out matching colors, or use manual eraser.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="bg_remover" />
  },
  {
    id: 'img_resizer',
    name: 'Image Resizer',
    category: 'PHOTO & IMAGE',
    isHolidayPick: true,
    description: 'Resize images to precise dimensions using Canvas.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="img_resizer" />
  },
  {
    id: 'img_compressor',
    name: 'Image Compressor',
    category: 'PHOTO & IMAGE',
    isHolidayPick: true,
    description: 'Reduce image file sizes with real-time quality scale.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="img_compressor" />
  },
  // Row 2 from screenshot
  {
    id: 'crop_rotate',
    name: 'Crop & Rotate Tool',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Crop or rotate photos to standard ratios.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="crop_rotate" />
  },
  {
    id: 'detail_enhancer',
    name: 'Image Detail Enhancer',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Enhance photo details using local contrast and color filters.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="detail_enhancer" />
  },
  {
    id: 'watermark',
    name: 'Watermark Tool',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Add logo or text watermarks overlay onto photos.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="watermark" />
  },
  // Row 3 from screenshot
  {
    id: 'upscaler',
    name: 'Image Upscaler',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Upscale dimensions using canvas bicubic interpolation.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="upscaler" />
  },
  {
    id: 'palette_extractor',
    name: 'Color Palette Extractor',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Extract key color swatches and hex codes.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="palette_extractor" />
  },
  {
    id: 'collage_maker',
    name: 'Collage Maker',
    category: 'PHOTO & IMAGE',
    isHolidayPick: false,
    description: 'Combine multiple images in editable canvas grids.',
    component: (props) => <PhotoCanvasTool {...props} initialMode="collage_maker" />
  },
  // AI, Second Brain & Developer Tools
  {
    id: 'brain',
    name: 'Notes & Second Brain',
    category: 'AI & KNOWLEDGE',
    isHolidayPick: true,
    description: 'Ingest personal documents, auto-chunk for RAG, and let Luna recall your knowledge.',
    component: NotesToolView
  },
  {
    id: 'research',
    name: 'Deep Web Research',
    category: 'AI & KNOWLEDGE',
    isHolidayPick: true,
    description: 'Perform live web searches with verified primary sources and cited answers.',
    component: ResearchToolView
  },
  {
    id: 'github',
    name: 'GitHub API Explorer',
    category: 'DEVELOPER',
    isHolidayPick: true,
    description: 'Inspect live GitHub repositories, stars, languages, and repo activity.',
    component: GitHubToolView
  },
  {
    id: 'reminders',
    name: 'Smart Reminders & Tasks',
    category: 'PRODUCTIVITY',
    isHolidayPick: false,
    description: 'Schedule deadlines, upcoming agendas, and track pending action items with Luna.',
    component: RemindersToolView
  },
  {
    id: 'summarizer',
    name: 'Executive Summarizer',
    category: 'AI & KNOWLEDGE',
    isHolidayPick: false,
    description: 'Extract concise executive summaries and action items from long articles or emails.',
    component: SummarizerToolView
  },
  {
    id: 'write',
    name: 'AI Writing Studio',
    category: 'AI & KNOWLEDGE',
    isHolidayPick: false,
    description: 'Draft articles, technical specs, documentation, and polished communications.',
    component: WritingToolView
  },
  {
    id: 'sandbox',
    name: 'Python Code Sandbox',
    category: 'DEVELOPER',
    isHolidayPick: false,
    description: 'Execute quick Python scripts in an isolated sandbox and inspect output.',
    component: SandboxToolView
  }
];
