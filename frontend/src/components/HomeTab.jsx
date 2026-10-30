import React, { useState, useEffect } from 'react';

const ODYSSEUS_TOOLS = [
  {
    id: 'github',
    category: 'DEVELOPER // ENGINE',
    title: 'GitHub Repositories & API',
    description: 'Direct integration with GitHub API. Inspect public repositories, check commit status, star counts, and recent project activity.',
    actionLabel: 'Inspect GitHub',
    prompt: 'Check my GitHub repositories on Haruuowo'
  },
  {
    id: 'inbox',
    category: 'COMMUNICATION // SYNC',
    title: 'Gmail & Inbox Triage',
    description: 'Real-time open-source inbox connector. Triage unread messages, summarize conversations, and search personal emails.',
    actionLabel: 'Triage Inbox',
    prompt: 'Summarize my inbox'
  },
  {
    id: 'search',
    category: 'INTELLIGENCE // SEARCH',
    title: 'Web Search with Citations',
    description: 'Instant DuckDuckGo web search engine with real-time web citations, source titles, and live question answering.',
    actionLabel: 'Search Web',
    prompt: 'Search the web for latest AI agent architectures'
  },
  {
    id: 'sandbox',
    category: 'EXECUTION // CODE',
    title: 'Code Sandbox Helper',
    description: 'Isolated Python subprocess sandbox to run code snippets, calculate algorithms, and test logic with zero overhead.',
    actionLabel: 'Open Sandbox',
    tab: 'jarvis'
  },
  {
    id: 'brain',
    category: 'KNOWLEDGE // RAG',
    title: 'Second Brain Knowledge Vault',
    description: 'Personal memory and documentation store. Ingests notes, links, and documents with automatic semantic chunking.',
    actionLabel: 'Query Second Brain',
    prompt: 'What is stored in my Second Brain?'
  },
  {
    id: 'smartsort',
    category: 'AUTOMATION // DISK',
    title: 'SmartSort File Organizer',
    description: 'Intelligent file organization tool that scans folders and classifies files into Images, Documents, Code, Audio, and Archives.',
    actionLabel: 'Organize Files',
    tab: 'jarvis'
  },
  {
    id: 'music',
    category: 'AUDIO // PLAYBACK',
    title: 'Spotify & Media Playback',
    description: 'Integrated media playback controller with voice-activated track navigation, pause, resume, and study radio.',
    actionLabel: 'Play Study Music',
    prompt: 'Play study music'
  },
  {
    id: 'calendar',
    category: 'WORKFLOW // CALENDAR',
    title: 'Calendar, Drive & Notion',
    description: 'Unified workspace connectors linking your Google Calendar meetings, Google Drive files, and Notion workspace databases.',
    actionLabel: 'View Schedule',
    prompt: 'What is on my schedule today?'
  }
];

export default function HomeTab({
  lunaPng,
  brainBadge,
  llmAvg,
  authHeader,
  onSelectTab,
  onAskLuna
}) {
  const [quickInput, setQuickInput] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [brainStats, setBrainStats] = useState({ total_notes: 0, facts_count: 0 });
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = await authHeader();
        const [ghRes, brainRes, toolsRes] = await Promise.all([
          fetch('/api/github/overview?user=Haruuowo'),
          fetch('/brain/search?q=', { headers }),
          fetch('/tools/pending', { headers })
        ]);

        if (ghRes.ok) {
          const gh = await ghRes.json();
          setGithubData(gh);
        }
        if (brainRes.ok) {
          const b = await brainRes.json();
          setBrainStats({
            total_notes: b.total_notes ?? 0,
            facts_count: b.facts_count ?? 0
          });
        }
        if (toolsRes.ok) {
          const t = await toolsRes.json();
          if (t.inbox) setInboxCount(t.inbox.unread_count || 0);
        }
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      }
    };
    fetchDashboardData();
  }, []);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onAskLuna(quickInput.trim());
    setQuickInput('');
  };

  return (
    <div className="tab-workspace" style={{ overflowY: 'auto', padding: '20px 24px', gap: 20 }}>
      {/* ── 1. ODYSSEUS HERO HEADER (PewDiePie Odysseus Theme) ── */}
      <section style={{
        background: 'var(--nds-surface)',
        border: '1.5px solid var(--nds-border-main)',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '3px 3px 0px var(--nds-shadow)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 24,
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'var(--nds-blue-soft)',
            border: '1px solid var(--nds-blue-dark)',
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--nds-blue-dark)',
            letterSpacing: '0.08em',
            marginBottom: 10
          }}>
            <span>Ω</span>
            <span>ODYSSEUS PERSONAL AI SYSTEM // LUNA CORE</span>
            <span>·</span>
            <span style={{ color: '#10b981' }}>ONLINE</span>
          </div>

          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            margin: '0 0 8px 0',
            letterSpacing: '-0.03em',
            color: 'var(--nds-text)',
            lineHeight: 1.15
          }}>
            Welcome Back, Kai. What are we building today?
          </h1>

          <p style={{
            fontSize: 13.5,
            color: 'var(--nds-text-muted)',
            margin: '0 0 16px 0',
            maxWidth: 680,
            lineHeight: 1.5
          }}>
            Odysseus is your autonomous personal command center: orchestrating real-time GitHub repository inspection,
            instant web search, second-brain memory retrieval, and personal productivity tools.
          </p>

          {/* Quick Stats Pill Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
            <span style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--nds-card-bg)', border: '1px solid var(--nds-border-light)' }}>
              <b>GitHub:</b> {githubData?.public_repos || 4} Repos ({githubData?.repos?.[0]?.name || 'Prometheus'})
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--nds-card-bg)', border: '1px solid var(--nds-border-light)' }}>
              <b>Second Brain:</b> {brainStats.total_notes} Notes
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--nds-card-bg)', border: '1px solid var(--nds-border-light)' }}>
              <b>Inbox:</b> {inboxCount} Unread
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--nds-card-bg)', border: '1px solid var(--nds-border-light)' }}>
              <b>Inference:</b> {brainBadge.toUpperCase()} ({llmAvg}ms)
            </span>
          </div>
        </div>

        {/* Luna Portrait Badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8
        }}>
          <div style={{
            width: 110,
            height: 110,
            borderRadius: 16,
            border: '2px solid var(--nds-border-main)',
            background: 'var(--nds-card-bg)',
            overflow: 'hidden',
            padding: 6,
            boxShadow: '2px 2px 0px var(--nds-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={lunaPng || '/luna.png'}
              alt="Luna Odysseus Core"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
          <button
            type="button"
            className="btn-send"
            style={{ padding: '5px 14px', fontSize: 11 }}
            onClick={() => onSelectTab('chat')}
          >
            Launch Chat
          </button>
        </div>
      </section>

      {/* ── 2. UNIFIED COMMAND CONSOLE ── */}
      <section style={{
        background: 'var(--nds-surface)',
        border: '1.5px solid var(--nds-border-main)',
        borderRadius: 10,
        padding: '14px 18px',
        boxShadow: '2px 2px 0px var(--nds-shadow)'
      }}>
        <form onSubmit={handleCommandSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Command Odysseus: 'Check my GitHub repos', 'Search web for...', 'Summarize inbox', or ask Luna anything..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 6,
              border: '1.5px solid var(--nds-border-main)',
              background: 'var(--nds-card-bg)',
              color: 'var(--nds-text)',
              fontSize: 13.5,
              outline: 'none'
            }}
          />
          <button type="submit" className="btn-send" style={{ padding: '0 26px', fontSize: 13 }}>
            Execute
          </button>
        </form>
      </section>

      {/* ── 3. ODYSSEUS TOOLS SUITE (Below Heading) ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>
              ODYSSEUS TOOLS & CAPABILITIES
            </h2>
            <div style={{ fontSize: 12, color: 'var(--nds-text-muted)', marginTop: 2 }}>
              Select any capability below or command Luna directly through the console
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-ghost sm"
              onClick={() => onSelectTab('jarvis')}
            >
              Open Full Tools Workspace
            </button>
          </div>
        </div>

        {/* 8 Odysseus Multi-Tool Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14
        }}>
          {ODYSSEUS_TOOLS.map((tool) => (
            <div
              key={tool.id}
              style={{
                background: 'var(--nds-surface)',
                border: '1.5px solid var(--nds-border-main)',
                borderRadius: 8,
                padding: '16px',
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
                  color: 'var(--nds-blue-dark)',
                  letterSpacing: '0.08em',
                  marginBottom: 4
                }}>
                  {tool.category}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--nds-text)', marginBottom: 6 }}>
                  {tool.title}
                </div>
                <p style={{ fontSize: 12, color: 'var(--nds-text-muted)', lineHeight: 1.45, margin: 0 }}>
                  {tool.description}
                </p>
              </div>

              <div style={{ paddingTop: 8, borderTop: '1px solid var(--nds-border-light)' }}>
                <button
                  type="button"
                  className="btn-ghost sm"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 11.5 }}
                  onClick={() => {
                    if (tool.tab) {
                      onSelectTab(tool.tab);
                    } else if (tool.prompt) {
                      onAskLuna(tool.prompt);
                    }
                  }}
                >
                  {tool.actionLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. LIVE GITHUB REPOSITORIES STRIP ── */}
      {githubData && (
        <section style={{
          background: 'var(--nds-surface)',
          border: '1.5px solid var(--nds-border-main)',
          borderRadius: 10,
          padding: '16px 20px',
          boxShadow: '2px 2px 0px var(--nds-shadow)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="plat Luna">GITHUB</span>
              <b style={{ fontSize: 14 }}>Active Repositories // {githubData.username}</b>
            </div>
            <a
              href={`https://github.com/${githubData.username}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: 'var(--nds-blue-dark)', fontWeight: 700 }}
            >
              View GitHub Profile
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {(githubData.repos || []).map((repo, i) => (
              <a
                key={i}
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'var(--nds-card-bg)',
                  border: '1px solid var(--nds-border-light)',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 13, color: 'var(--nds-blue-dark)' }}>{repo.name}</b>
                  <span style={{ fontSize: 11, color: 'var(--nds-text-muted)' }}>★ {repo.stars}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--nds-text-muted)', lineHeight: 1.4 }}>
                  {repo.description}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--nds-text-muted)', marginTop: 2 }}>
                  {repo.language} · Updated {repo.updated_at}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
