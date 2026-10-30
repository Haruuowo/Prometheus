import React from 'react';

export default function PrometheusSidebar({
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  theme,
  toggleTheme,
  onOpenHow,
  isCollapsed,
  onToggleCollapse
}) {
  const navItems = [
    {
      id: 'chat',
      label: 'AI Chat (Luna)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      badge: 'CORE'
    },
    {
      id: 'tools',
      label: 'Explore Tools',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
      badge: 'GRID'
    },
    {
      id: 'brain',
      label: 'Notes / Second Brain',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
          <path d="M9 21h6"/>
        </svg>
      ),
      badge: 'RAG'
    },
    {
      id: 'reminders',
      label: 'Reminders & Tasks',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      badge: 'SYNC'
    },
    {
      id: 'study',
      label: 'Study & Flashcards',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      badge: 'QUIZ'
    },
    {
      id: 'summarizer',
      label: 'Text Summarizer',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="10" x2="3" y2="10"/>
          <line x1="21" y1="6" x2="3" y2="6"/>
          <line x1="21" y1="14" x2="3" y2="14"/>
          <line x1="18" y1="18" x2="3" y2="18"/>
        </svg>
      ),
      badge: 'FAST'
    },
    {
      id: 'research',
      label: 'Deep Research',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
      badge: 'CITE'
    },
    {
      id: 'write',
      label: 'Writing Assistant',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
      badge: 'AI'
    },
    {
      id: 'image_tools',
      label: 'Photo & Canvas Studio',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      ),
      badge: 'IMAGE'
    },
    {
      id: 'github',
      label: 'GitHub Explorer',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      ),
      badge: 'LIVE'
    }
  ];

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Guest User';
  const userPhoto = user?.photoURL;

  return (
    <aside style={{
      width: isCollapsed ? 68 : 250,
      minWidth: isCollapsed ? 68 : 250,
      height: '100%',
      background: 'var(--nds-surface)',
      borderRight: '1.5px solid var(--nds-border-outer)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'width 0.2s ease',
      zIndex: 10,
      userSelect: 'none'
    }}>
      {/* Top Prometheus Header */}
      <div>
        <div style={{
          padding: isCollapsed ? '16px 8px' : '16px 14px',
          borderBottom: '1px solid var(--nds-border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}>
          {!isCollapsed && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 900,
                  color: '#f59e0b',
                  letterSpacing: '0.1em'
                }}>
                  PROMETHEUS
                </span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--nds-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                ODYSSEUS WORKSPACE
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: 'transparent',
              border: '1px solid var(--nds-border-light)',
              borderRadius: 6,
              color: 'var(--nds-text)',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isCollapsed ? (
                <polyline points="9 18 15 12 9 6"/>
              ) : (
                <polyline points="15 18 9 12 15 6"/>
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Item List */}
        <div style={{
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 'calc(100vh - 210px)',
          overflowY: 'auto'
        }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: isCollapsed ? '10px 0' : '9px 12px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  border: isActive ? '1.5px solid var(--nds-blue-dark)' : '1.5px solid transparent',
                  background: isActive ? 'var(--nds-blue-soft)' : 'transparent',
                  color: isActive ? 'var(--nds-text)' : 'var(--nds-text-muted)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative'
                }}
              >
                <span style={{ color: isActive ? '#f59e0b' : 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>

                {!isCollapsed && (
                  <>
                    <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'var(--nds-card)',
                      color: isActive ? '#f59e0b' : 'var(--nds-text-muted)'
                    }}>
                      {item.badge}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile, Theme & Auth Section */}
      <div style={{
        padding: isCollapsed ? '12px 6px' : '12px',
        borderTop: '1px solid var(--nds-border-light)',
        background: 'var(--nds-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: isCollapsed ? 'center' : 'flex-start'
        }}>
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userDisplayName}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--nds-border-main)' }}
            />
          ) : (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--nds-blue-dark)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800
            }}>
              {userDisplayName[0].toUpperCase()}
            </div>
          )}

          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userDisplayName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--nds-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user ? (user.email || 'Google Account') : 'Local Guest'}
              </div>
            </div>
          )}
        </div>

        {/* Auth / Action Button */}
        {!isCollapsed ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={onOpenAuth}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--nds-border-main)',
                background: 'var(--nds-surface)',
                color: 'var(--nds-text)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {user ? 'Profile / Sign Out' : 'Sign In with Google'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--nds-border-main)',
                background: 'var(--nds-surface)',
                color: 'var(--nds-text)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            title={user ? 'Sign Out / Profile' : 'Sign In'}
            style={{
              padding: '6px 0',
              borderRadius: 6,
              border: '1px solid var(--nds-border-main)',
              background: 'var(--nds-surface)',
              color: 'var(--nds-text)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {user ? '🚪' : '🔑'}
          </button>
        )}
      </div>
    </aside>
  );
}
