import React, { useState } from 'react';

export default function OdysseusToolsGrid({ tools, onSelectTool, onAskLuna }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['ALL', 'PHOTO & IMAGE', 'INTELLIGENCE', 'KNOWLEDGE', 'PRODUCTIVITY', 'CONTENT & SEARCH', 'DEVELOPER'];

  const filteredTools = tools.filter((tool) => {
    const matchesCat =
      activeCategory === 'ALL' ||
      (tool.category && tool.category.toUpperCase().includes(activeCategory)) ||
      (activeCategory === 'PHOTO & IMAGE' && tool.category === 'PHOTO & IMAGE') ||
      (activeCategory === 'CONTENT & SEARCH' && (tool.category === 'CONTENT' || tool.category === 'SEARCH' || tool.category === 'CREATION'));

    const matchesSearch =
      !searchQuery.trim() ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.category && tool.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: 16,
      overflowY: 'auto',
      padding: '4px 8px 24px 8px'
    }}>
      {/* Odysseus Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(22, 26, 36, 0.95), rgba(15, 18, 25, 0.98))',
        border: '1.5px solid #283042',
        borderRadius: 14,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#f59e0b',
              fontWeight: 800,
              letterSpacing: '0.12em',
              background: 'rgba(245, 158, 11, 0.12)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              ODYSSEUS AI // TOOL MATRIX
            </span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>● ALL SYSTEMS READY</span>
          </div>
          <h2 style={{
            margin: '6px 0 2px 0',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff'
          }}>
            Prometheus Modular Tools
          </h2>
          <p style={{
            margin: 0,
            fontSize: 12.5,
            color: '#94a3b8'
          }}>
            Self-contained modules with direct Luna routing. Click <b>Open &rarr;</b> or speak with Luna to trigger.
          </p>
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools, formats, or intent..."
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #333d52',
              background: '#1a1f2c',
              color: '#f1f5f9',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Category Pills Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              border: activeCategory === cat ? '1px solid #f59e0b' : '1px solid #283042',
              background: activeCategory === cat ? 'rgba(245, 158, 11, 0.15)' : '#161922',
              color: activeCategory === cat ? '#f59e0b' : '#94a3b8',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3-Column Tool Cards Grid matching screenshot media_1793371803184_73caee83.jpg */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 16
      }}>
        {filteredTools.map((tool) => {
          const hasHolidayPick = tool.isHolidayPick || tool.badge === 'CORE' || tool.badge === 'HOT' || tool.id === 'bg_remover' || tool.id === 'img_resizer' || tool.id === 'img_compressor';
          const isReady = true;

          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px 22px',
                borderRadius: 16,
                background: '#151922',
                border: '1px solid #272f3f',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                position: 'relative',
                minHeight: 180
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.6)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.borderColor = '#272f3f';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.35)';
              }}
            >
              <div>
                {/* Top Row: Inset Icon Box + Badges */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}>
                  {/* Left: Rounded Square Icon */}
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#1f2533',
                    border: '1px solid #333d52',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                    fontSize: 16,
                    fontWeight: 800
                  }}>
                    {tool.iconSvg || (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    )}
                  </div>

                  {/* Right: Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {hasHolidayPick && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.09)',
                        border: '1px solid rgba(245, 158, 11, 0.45)'
                      }}>
                        <span>#</span> HOLIDAY PICK
                      </span>
                    )}
                    {isReady && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.35)'
                      }}>
                        <span>*</span> READY
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Title & Description */}
                <h3 style={{
                  margin: '14px 0 6px 0',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.01em'
                }}>
                  {tool.name}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: '#94a3b8',
                  lineHeight: 1.45,
                  minHeight: 36
                }}>
                  {tool.description}
                </p>
              </div>

              {/* Bottom Row: Category on left + Open -> on right */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 18,
                paddingTop: 12,
                borderTop: '1px solid #1f2533'
              }}>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#64748b',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {tool.category || 'TOOL'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTool(tool.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f59e0b',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  Open &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
