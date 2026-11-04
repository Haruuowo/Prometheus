import React, { useState } from 'react';

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

// Deploy & Cloud Publishing Hub (Vercel, Render, GitHub Pages, Railway)
export default function DeployHub({ githubData, initialRepo }) {
  const [selectedPlatform, setSelectedPlatform] = useState('vercel');
  const [selectedRepo, setSelectedRepo] = useState(
    initialRepo || githubData?.repos?.[0]?.name || 'my-project'
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
      url: `https://github.com/${githubData?.username || 'your-username'}/${selectedRepo}/settings/pages`,
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
              onClick={copyConfig}
            >
              {copied ? 'Config Copied' : `Copy ${active.configName}`}
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
              {copied ? 'Copied' : 'Copy Config'}
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
