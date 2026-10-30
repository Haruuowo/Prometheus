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

// ── 1. Deploy & Cloud Publishing Hub (Vercel, Render, GitHub Pages, Railway) ──
export function DeployHubToolView({ githubData, onAskLuna }) {
  const [selectedPlatform, setSelectedPlatform] = useState('vercel');
  const [selectedRepo, setSelectedRepo] = useState(
    githubData?.repos?.[0]?.name || 'Prometheus'
  );
  const [copied, setCopied] = useState(false);

  const platforms = [
    {
      id: 'vercel',
      name: 'Vercel',
      tag: 'BEST FOR REACT / VITE / NEXT.JS',
      freeTier: 'Free Hobby Tier • Auto HTTPS • GitHub CI/CD',
      url: 'https://vercel.com/new',
      desc: 'Zero-config frontend & serverless deployment. Pushes to your GitHub main branch deploy automatically in ~30 seconds.',
      configName: 'vercel.json',
      configContent: JSON.stringify(
        {
          rewrites: [{ source: '/(.*)', destination: '/index.html' }],
          buildCommand: 'npm run build',
          outputDirectory: 'dist'
        },
        null,
        2
      ),
      steps: [
        'Push your frontend folder to GitHub.',
        'Open vercel.com/new and select your GitHub repository.',
        'Set Framework Preset to "Vite" (or Next.js) and Root Directory to "frontend".',
        'Add your VITE_FIREBASE_* environment variables and click Deploy!'
      ]
    },
    {
      id: 'render',
      name: 'Render / Railway',
      tag: 'BEST FOR PYTHON FASTAPI / FLASK / NODE',
      freeTier: 'Free Web Service Tier • GitHub Auto-Deploy',
      url: 'https://dashboard.render.com/select-repo?type=web',
      desc: 'Ideal for hosting Python FastAPI/Flask backends, WebSockets, and API servers alongside your Vercel frontend.',
      configName: 'render.yaml',
      configContent: `services:\n  - type: web\n    name: ${selectedRepo.toLowerCase()}-api\n    env: python\n    buildCommand: pip install -r requirements.txt\n    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT`,
      steps: [
        'Ensure requirements.txt is in your repository root.',
        'Connect your GitHub repo on Render.com (New -> Web Service) or Railway.app.',
        'Set Start Command to: uvicorn backend.main:app --host 0.0.0.0 --port $PORT',
        'Add GROQ_API_KEY in Environment Variables and deploy.'
      ]
    },
    {
      id: 'ghpages',
      name: 'GitHub Pages',
      tag: 'BEST FOR PORTFOLIOS & DOCS',
      freeTier: '100% Free Forever • Hosted on github.io',
      url: `https://github.com/${githubData?.username || 'Haruuowo'}/${selectedRepo}/settings/pages`,
      desc: 'Host static personal portfolios, course project demos, and documentation directly from your GitHub repository.',
      configName: '.github/workflows/deploy.yml',
      configContent: `name: Deploy to GitHub Pages\non:\n  push:\n    branches: [ main ]\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm install && npm run build\n      - uses: peaceiris/actions-gh-pages@v3\n        with:\n          github_token: \${{ secrets.GITHUB_TOKEN }}\n          publish_dir: ./dist`,
      steps: [
        'Add the GitHub Actions workflow file above to .github/workflows/deploy.yml.',
        'Go to your Repo Settings -> Pages -> Source and select "gh-pages" branch.',
        'Your site goes live at https://<username>.github.io/<repo>!'
      ]
    },
    {
      id: 'netlify',
      name: 'Netlify & Firebase Hosting',
      tag: 'SPA & FULL-STACK ALTERNATIVES',
      freeTier: 'Free Starter Tier • Global CDN • Preview Links',
      url: 'https://app.netlify.com/start',
      desc: 'Drag-and-drop your dist/ folder or link GitHub for automatic pull-request preview URLs—great for group CS projects.',
      configName: 'netlify.toml',
      configContent: `[build]\n  base = "frontend/"\n  publish = "dist/"\n  command = "npm run build"\n\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200`,
      steps: [
        'Create netlify.toml at the root of your repository.',
        'Import your GitHub repo on app.netlify.com/start.',
        'Every PR automatically gets a shareable preview URL for teammates/TAs.'
      ]
    }
  ];

  const active = platforms.find((p) => p.id === selectedPlatform) || platforms[0];

  const copyConfig = () => {
    navigator.clipboard?.writeText(active.configContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Platform Selector Pills + Repo Picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              style={{
                ...btnSubtle,
                borderColor: selectedPlatform === p.id ? '#f59e0b' : '#2b303c',
                background: selectedPlatform === p.id ? 'rgba(245, 158, 11, 0.14)' : '#14171d',
                color: selectedPlatform === p.id ? '#f59e0b' : '#e5e7eb'
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {githubData?.repos?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Target Repo:</span>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: 12.5 }}
            >
              {githubData.repos.map((r) => (
                <option key={r.name} value={r.name}>{r.name} ({r.language})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Platform Detail & Config Generator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 18 }}>
        <div style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', fontWeight: 700 }}>
              {active.tag}
            </span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4 }}>{active.name}</h3>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: 600 }}>{active.freeTier}</div>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginTop: 10 }}>{active.desc}</p>

            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 12, color: '#e5e7eb', fontFamily: 'JetBrains Mono, monospace' }}>DEPLOYMENT CHECKLIST FOR {selectedRepo.toUpperCase()}:</b>
              <ol style={{ marginTop: 8, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                {active.steps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              style={{ ...btnGold, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Launch {active.name} Dashboard &rarr;
            </a>
            <button
              type="button"
              style={btnSubtle}
              onClick={() => onAskLuna(`Help me deploy my GitHub repo "${selectedRepo}" to ${active.name} step-by-step.`)}
            >
              Ask Luna to Guide Me
            </button>
          </div>
        </div>

        {/* Auto-Generated Config File */}
        <div style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>
              {active.configName}
            </span>
            <button type="button" onClick={copyConfig} style={btnSubtle}>
              {copied ? '✓ Copied!' : 'Copy Config'}
            </button>
          </div>
          <pre style={{
            flex: 1,
            background: '#14171d',
            border: '1px solid #222631',
            borderRadius: 10,
            padding: 14,
            color: '#e5e7eb',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            lineHeight: 1.5,
            overflowX: 'auto'
          }}>
            {active.configContent}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── 2. Algorithm & Big-O Complexity Analyzer ─────────────────────────────────
export function BigOAnalyzerToolView({ onAskLuna }) {
  const [code, setCode] = useState(
`def find_duplicates(arr):
    duplicates = []
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j] and arr[i] not in duplicates:
                duplicates.append(arr[i])
    return duplicates`
  );
  const [analysis, setAnalysis] = useState(null);

  const analyzeComplexity = () => {
    const lines = code.split('\n');
    let loopDepth = 0;
    let maxLoopDepth = 0;
    let hasHalfSplit = /\/\/\s*2|>>\s*1|mid\s*=|binary/i.test(code);
    let hasSort = /\.sort\(|sorted\(/i.test(code);
    let hasHashSet = /set\(|dict\(|\{\}/i.test(code);

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (/^(for |while )/.test(trimmed)) {
        loopDepth += 1;
        if (loopDepth > maxLoopDepth) maxLoopDepth = loopDepth;
      }
    });

    let time = 'O(n)';
    let space = 'O(1)';
    let tip = 'Linear scan detected. Good baseline performance.';

    if (maxLoopDepth >= 3) {
      time = 'O(n³)';
      tip = 'Triple nested loop detected. Consider dynamic programming, memoization, or hash maps to reduce complexity.';
    } else if (maxLoopDepth === 2) {
      time = 'O(n²)';
      tip = 'Nested loop detected. You can often optimize O(n²) lookups down to O(n) Time and O(n) Space using a Hash Set or Hash Map!';
    } else if (hasSort) {
      time = 'O(n log n)';
      tip = 'Sorting dominates runtime at O(n log n) via Timsort/Quicksort.';
    } else if (hasHalfSplit && maxLoopDepth === 1) {
      time = 'O(log n)';
      tip = 'Logarithmic search space halving (Binary Search pattern). Very fast!';
    } else if (maxLoopDepth === 0) {
      time = 'O(1)';
      tip = 'Constant time operations with no iterative loops.';
    }

    if (hasHashSet || /append\(|\.push\(/i.test(code)) {
      space = 'O(n)';
    }

    setAnalysis({ time, space, tip });
  };

  useEffect(() => {
    analyzeComplexity();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>PASTE CODE SNIPPET (PYTHON, C++, JAVA, JS)</b>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={11}
          style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={analyzeComplexity} style={btnGold}>
            Analyze Big-O Complexity
          </button>
          <button
            type="button"
            style={btnSubtle}
            onClick={() => onAskLuna(`Analyze the Time and Space Big-O complexity of this code and rewrite it in the most optimal way:\n\n${code}`)}
          >
            Optimize with Luna &rarr;
          </button>
        </div>
      </div>

      <div style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>COMPLEXITY REPORT</b>
        {analysis && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 12, background: '#14171d', border: '1px solid #262b36' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>TIME COMPLEXITY</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>{analysis.time}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: '#14171d', border: '1px solid #262b36' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>SPACE COMPLEXITY</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>{analysis.space}</div>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: '#14171d', border: '1px solid #262b36', fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
              <b style={{ color: '#10b981', display: 'block', marginBottom: 4 }}>Optimization Insight:</b>
              {analysis.tip}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 3. GitHub README & Student Portfolio Generator ───────────────────────────
export function ReadmeBuilderToolView({ githubData }) {
  const repos = githubData?.repos || [];
  const [projectName, setProjectName] = useState(repos[0]?.name || 'Prometheus');
  const [tagline, setTagline] = useState(repos[0]?.description || 'Full-stack AI workspace for Computer Science students');
  const [techStack, setTechStack] = useState('React, Vite, FastAPI, Python, Firebase, Groq LLM');
  const [liveUrl, setLiveUrl] = useState('https://prometheus-demo.vercel.app');
  const [copied, setCopied] = useState(false);

  const handleSelectRepo = (name) => {
    setProjectName(name);
    const found = repos.find((r) => r.name === name);
    if (found) {
      setTagline(found.description || 'CS Project Repository');
      if (found.language) setTechStack(`${found.language}, Git, REST API`);
    }
  };

  const markdown = `# 🚀 ${projectName}

> ${tagline}

![Status](https://img.shields.io/badge/Status-Active-10b981)
![License](https://img.shields.io/badge/License-MIT-f59e0b)
![PRs](https://img.shields.io/badge/PRs-Welcome-38bdf8)

## ✨ Overview
**${projectName}** is built to streamline workflows with clean architecture and responsive performance.

- 🔗 **Live Demo:** [${liveUrl}](${liveUrl})
- 🛠️ **Tech Stack:** ${techStack}

## ⚡ Quick Start

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${githubData?.username || 'Haruuowo'}/${projectName}.git
cd ${projectName}

# 2. Install dependencies & run locally
npm install
npm run dev
\`\`\`

## 📂 Project Architecture
\`\`\`
${projectName}/
├── frontend/       # Client UI & components
├── backend/        # FastAPI service & tools
└── README.md       # Documentation
\`\`\`

---
Built by [@${githubData?.username || 'Haruuowo'}](https://github.com/${githubData?.username || 'Haruuowo'})`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0e1014', padding: 18, borderRadius: 14, border: '1px solid #232730' }}>
        <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>PROJECT DETAILS</b>
        {repos.length > 0 && (
          <label style={{ fontSize: 12, color: '#9ca3af' }}>
            Auto-fill from your GitHub Repo:
            <select
              value={projectName}
              onChange={(e) => handleSelectRepo(e.target.value)}
              style={{ ...inputStyle, marginTop: 4 }}
            >
              {repos.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </label>
        )}
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project Title" style={inputStyle} />
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short tagline..." style={inputStyle} />
        <input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="Tech stack (comma separated)" style={inputStyle} />
        <input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Live Demo URL (e.g. Vercel link)" style={inputStyle} />
        <button
          type="button"
          style={btnGold}
          onClick={() => {
            navigator.clipboard?.writeText(markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? '✓ Copied README.md!' : 'Copy README.md'}
        </button>
      </div>

      <pre style={{
        background: '#0e1014',
        border: '1px solid #232730',
        borderRadius: 14,
        padding: 18,
        color: '#e5e7eb',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12.5,
        lineHeight: 1.5,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap'
      }}>
        {markdown}
      </pre>
    </div>
  );
}

// ── 4. Python & DSA Code Sandbox ─────────────────────────────────────────────
export function SandboxToolView() {
  const [code, setCode] = useState(
`# Test algorithms & data structures in Python
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("Index of 23:", binary_search(nums, 23))`
  );
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
      setOutput(data.output || 'Executed with no stdout.');
    } catch (e) {
      setOutput('Error executing script.');
    }
    setRunning(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={12} style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5 }} />
        <button type="button" onClick={runCode} style={btnGold} disabled={running}>
          {running ? 'Running in Sandbox...' : '▶ Run Python Script'}
        </button>
      </div>
      <pre style={{ background: '#0e1014', border: '1px solid #232730', borderRadius: 12, padding: 16, color: '#10b981', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, overflowX: 'auto' }}>
        {output || '// Stdout console ready'}
      </pre>
    </div>
  );
}

// ── 5. CS Flashcards & Technical Interview Prep ──────────────────────────────
export function CSFlashcardsToolView({ onAskLuna }) {
  const decks = [
    { topic: 'DSA • Hash Tables', q: 'What is the average vs. worst-case time complexity of Hash Map lookup, and how are collisions resolved?', a: 'Average: O(1). Worst-case: O(n) (or O(log n) with balanced trees). Collisions are resolved via Separate Chaining (linked lists/buckets) or Open Addressing (linear/quadratic probing).' },
    { topic: 'Operating Systems', q: 'What is the difference between a Process and a Thread?', a: 'A Process is an independent executing program with its own isolated virtual address space. A Thread is a lightweight unit of execution within a process that shares heap memory and file descriptors with peer threads.' },
    { topic: 'Databases • ACID', q: 'What do the ACID properties stand for in relational databases?', a: 'Atomicity (all-or-nothing transactions), Consistency (valid state transitions), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes).' },
    { topic: 'Networking', q: 'What happens during the TCP 3-Way Handshake?', a: '1. Client sends SYN (synchronize sequence number). 2. Server replies with SYN-ACK. 3. Client responds with ACK, establishing a reliable full-duplex connection.' },
    { topic: 'Algorithms • Graphs', q: 'When should you use BFS vs. Dijkstra’s Algorithm for shortest paths?', a: 'Use BFS for unweighted graphs in O(V + E). Use Dijkstra’s Algorithm with a Min-Heap for weighted graphs with non-negative edge weights in O((V + E) log V).' }
  ];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = decks[idx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          width: '100%',
          maxWidth: 640,
          minHeight: 220,
          background: '#0e1014',
          border: '1px solid #f59e0b',
          borderRadius: 16,
          padding: 28,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>
          <span>{card.topic}</span>
          <span>CARD {idx + 1} / {decks.length} • CLICK TO FLIP</span>
        </div>

        <div style={{ margin: '18px 0' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.45 }}>
            {card.q}
          </div>
          {flipped && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #232730', fontSize: 14, color: '#10b981', lineHeight: 1.55 }}>
              {card.a}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11.5, color: '#6b7280' }}>
          {flipped ? 'Showing Answer' : 'Click card to reveal answer'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={btnSubtle} onClick={() => { setFlipped(false); setIdx((idx - 1 + decks.length) % decks.length); }}>
          &larr; Previous
        </button>
        <button type="button" style={btnGold} onClick={() => { setFlipped(false); setIdx((idx + 1) % decks.length); }}>
          Next Card &rarr;
        </button>
        <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Give me a technical interview follow-up question on: ${card.topic} (${card.q})`)}>
          Mock Interview with Luna
        </button>
      </div>
    </div>
  );
}

// ── 6. Git Command & Workflow Cheat Sheet ────────────────────────────────────
export function GitHelperToolView() {
  const [filter, setFilter] = useState('');
  const commands = [
    { title: 'Undo last commit (keep changes staged)', cmd: 'git reset --soft HEAD~1', desc: 'Great when you committed too early and want to edit files before re-committing.' },
    { title: 'Create & switch to a new feature branch', cmd: 'git checkout -b feat/new-feature', desc: 'Standard workflow for group projects before opening a Pull Request.' },
    { title: 'Sync your branch with main', cmd: 'git fetch origin && git rebase origin/main', desc: 'Keeps your commit history linear and up to date with teammates.' },
    { title: 'Temporarily save uncommitted work', cmd: 'git stash push -m "wip" && git stash pop', desc: 'Stash changes when switching branches quickly, then pop them back.' },
    { title: 'Check which files changed & line diffs', cmd: 'git status -s && git diff --stat', desc: 'Compact summary of modified and untracked files.' },
    { title: 'Fix wrong commit message on last commit', cmd: 'git commit --amend -m "New message"', desc: 'Updates the most recent commit message without creating a second commit.' }
  ];

  const shown = commands.filter(
    (c) => !filter || c.title.toLowerCase().includes(filter.toLowerCase()) || c.cmd.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search Git scenario (e.g. undo commit, branch, stash, rebase)..." style={inputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {shown.map((item, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <b style={{ fontSize: 14, color: '#fff' }}>{item.title}</b>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{item.desc}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#14171d', padding: '8px 12px', borderRadius: 8, border: '1px solid #222631' }}>
              <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#f59e0b' }}>{item.cmd}</code>
              <button type="button" style={{ ...btnSubtle, padding: '4px 8px', fontSize: 11 }} onClick={() => navigator.clipboard?.writeText(item.cmd)}>
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7. Second Brain Lecture Notes Vault ──────────────────────────────────────
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
    setStatus('Indexing lecture note...');
    const headers = await authHeader();
    await api.ingestNote({ title: title.trim() || 'CS Lecture Note', content: content.trim() }, headers);
    setTitle('');
    setContent('');
    setStatus('Saved to Second Brain RAG!');
    loadNotes();
    setTimeout(() => setStatus(''), 2200);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0e1014', padding: 18, borderRadius: 14, border: '1px solid #232730' }}>
        <b style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>SAVE LECTURE / COURSE NOTE</b>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course / Topic (e.g. CS301 Graph Theory)..." style={inputStyle} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste lecture notes, definitions, or theorems..." rows={6} style={inputStyle} />
        <button type="submit" style={btnGold}>+ Save to Second Brain</button>
        {status && <span style={{ fontSize: 12, color: '#10b981' }}>{status}</span>}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map((n, i) => (
          <div key={n.id || i} style={{ padding: 14, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <b style={{ fontSize: 14, color: '#fff' }}>{n.title}</b>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{n.content}</p>
            </div>
            <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Quiz me on my lecture note "${n.title}": ${n.content}`)}>
              Quiz Me
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 8. Assignment, Lab & Hackathon Deadlines ─────────────────────────────────
export function RemindersToolView({ authHeader, onAskLuna }) {
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('Friday, 11:59 PM');

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
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment, lab submission, or exam..." style={inputStyle} />
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Due date / time..." style={inputStyle} />
        <button type="submit" style={btnGold}>+ Add Deadline</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reminders.map((r, i) => (
          <div key={r.id || i} style={{ padding: 14, borderRadius: 12, background: '#0e1014', border: '1px solid #232730', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b style={{ fontSize: 14, color: '#fff' }}>{r.title}</b>
              <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>Due: {r.time}</div>
            </div>
            <button type="button" style={btnSubtle} onClick={() => onAskLuna(`Help me break down a study/coding plan for "${r.title}" due ${r.time}.`)}>
              Plan with Luna
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 9. Deep Research & Paper Summarizer ──────────────────────────────────────
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
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research CS topic, documentation, or paper with citations..." style={inputStyle} />
        <button type="submit" style={btnGold} disabled={loading}>{loading ? 'Searching...' : 'Search & Cite'}</button>
      </form>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#0e1014', padding: 18, borderRadius: 14, border: '1px solid #232730' }}>
          <p style={{ fontSize: 13.5, color: '#e5e7eb', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{result.insights}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

// ── Central CS Student Tool Registry ─────────────────────────────────────────
export const TOOL_REGISTRY = [
  {
    id: 'deploy_hub',
    name: 'Site Publisher & Deploy Hub',
    category: 'DEPLOY & HOSTING',
    isHolidayPick: true,
    description: 'Publish your frontend & backend projects for free on Vercel, Render, Railway, or GitHub Pages with auto-generated configs.',
    component: DeployHubToolView
  },
  {
    id: 'bigo_analyzer',
    name: 'Algorithm & Big-O Analyzer',
    category: 'CS FUNDAMENTALS',
    isHolidayPick: true,
    description: 'Analyze Time & Space complexity O(n) of your code snippets, spot nested bottlenecks, and optimize with Luna.',
    component: BigOAnalyzerToolView
  },
  {
    id: 'readme_builder',
    name: 'GitHub README & Portfolio Builder',
    category: 'GITHUB & CAREER',
    isHolidayPick: true,
    description: 'Auto-generate recruiter-ready README.md documentation with badges, architecture trees, and live links from your repos.',
    component: ReadmeBuilderToolView
  },
  {
    id: 'sandbox',
    name: 'Python & DSA Code Sandbox',
    category: 'CODE & LABS',
    isHolidayPick: false,
    description: 'Write and execute Python scripts, test data structures, and verify homework algorithms in an isolated sandbox.',
    component: SandboxToolView
  },
  {
    id: 'cs_flashcards',
    name: 'DSA & Technical Interview Prep',
    category: 'INTERVIEW PREP',
    isHolidayPick: false,
    description: 'Active-recall flashcards for Data Structures, Operating Systems, Databases (ACID), and Networks + Luna Mock Interviews.',
    component: CSFlashcardsToolView
  },
  {
    id: 'git_helper',
    name: 'Git Workflow & Command Finder',
    category: 'GITHUB & CAREER',
    isHolidayPick: false,
    description: 'Quickly search and copy Git commands for undoing commits, rebasing, resolving merge conflicts, and branching.',
    component: GitHelperToolView
  },
  {
    id: 'brain',
    name: 'Second Brain Lecture Notes',
    category: 'STUDY & NOTES',
    isHolidayPick: false,
    description: 'Save course notes, theorems, and study material into RAG memory so Luna can cite them and quiz you.',
    component: NotesToolView
  },
  {
    id: 'reminders',
    name: 'Assignment & Hackathon Tracker',
    category: 'PRODUCTIVITY',
    isHolidayPick: false,
    description: 'Track CS lab deadlines, midterms, hackathon submissions, and internship applications.',
    component: RemindersToolView
  },
  {
    id: 'research',
    name: 'CS Research & Docs Explorer',
    category: 'STUDY & NOTES',
    isHolidayPick: false,
    description: 'Search technical documentation, computer science papers, and web references with cited sources.',
    component: ResearchToolView
  }
];
