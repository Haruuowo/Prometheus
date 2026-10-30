import React from 'react';

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard' },
  { id: 'chat', label: 'Odysseus Chat' },
  { id: 'brain', label: 'Second Brain' },
  { id: 'jarvis', label: 'Tools & Schedule' },
  { id: 'persona', label: 'Settings' },
];

export default function Topbar({ 
  activeTab,
  onSelectTab,
  brainBadge, 
  llmAvg, 
  theme, 
  toggleTheme, 
  onOpenHow, 
  onOpenAuth,
  user
}) {
  return (
    <header className="topbar">
      {/* Left Brand */}
      <div className="brand">
        <div className="logo">Ω</div>
        <div>
          <div className="brand-name">
            ODYSSEUS <span style={{ opacity: 0.65 }}>// LUNA AI</span>
          </div>
          <div className="brand-sub">Autonomous Personal Intelligence System</div>
        </div>
      </div>

      {/* Center Multi-Tool Navigation Bar */}
      <nav className="nav-tabs" aria-label="Features">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-tab ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Right System Controls & Auth */}
      <div className="stats">
        <div className="stat">
          <span>brain</span>
          <b>{brainBadge}</b>
        </div>
        <div className="stat">
          <span>LLM</span>
          <b>{llmAvg ? `${llmAvg} ms` : '--'}</b>
        </div>

        <button 
          className="btn-ghost" 
          onClick={toggleTheme} 
          title="Toggle Light / Midnight Theme"
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {user ? (
          <div 
            className="user-badge" 
            onClick={onOpenAuth} 
            style={{ cursor: 'pointer' }}
            title="Account Profile"
          >
            <div className="user-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                (user.displayName || user.email || 'U')[0].toUpperCase()
              )}
            </div>
            <span>{user.displayName || user.email?.split('@')[0]}</span>
          </div>
        ) : (
          <button 
            className="btn-ghost" 
            onClick={onOpenAuth}
            style={{ background: 'var(--nds-blue-soft)', borderColor: 'var(--nds-blue-dark)' }}
          >
            Sign In
          </button>
        )}

        <button className="btn-ghost" onClick={onOpenHow}>
          How it works
        </button>
      </div>
    </header>
  );
}
