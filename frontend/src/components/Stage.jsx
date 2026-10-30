import React, { useRef } from 'react';

export default function Stage({ 
  mood, 
  thinking, 
  caption, 
  captionActive, 
  isTalking,
  lunaPng,
  onChangeLunaPng
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && onChangeLunaPng) {
        onChangeLunaPng(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const activeMood = mood || { color: '#a78bfa', label: 'chill & witty' };

  return (
    <section className="stage" style={{ minHeight: 280 }}>
      {/* Header Bar */}
      <div className="stage-tab-header" style={{ right: 14, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="stage-tab">ODYSSEUS // CORE</div>
          <button
            type="button"
            className="btn-ghost sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload your own custom PNG for Luna"
          >
            Change PNG
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Mood Chip */}
        <div className="mood-chip" style={{ position: 'static' }}>
          <span 
            className="mood-dot" 
            style={{ 
              background: activeMood.color || 'var(--nds-blue-dark)',
              boxShadow: `0 0 10px ${activeMood.color || 'var(--nds-blue-dark)'}` 
            }}
          ></span>
          <span>{activeMood.label || 'ready'}</span>
        </div>
      </div>

      {/* Grid Paper Texture */}
      <div className="stage-bg"></div>

      {/* Luna PNG Portrait */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '44px 16px 20px',
        overflow: 'hidden'
      }}>
        <img
          src={lunaPng || '/luna.png'}
          alt="Luna AI"
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
            borderRadius: 12,
            transition: 'transform 0.2s ease, filter 0.2s ease',
            transform: isTalking ? 'translateY(-4px) scale(1.02)' : 'none',
            filter: isTalking
              ? `drop-shadow(0 0 14px ${activeMood.color || '#6366f1'})`
              : 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))'
          }}
        />
      </div>

      {/* Thinking Bounce Animation */}
      <div className={`thinking ${thinking ? 'on' : ''}`}>
        <span></span>
        <span></span>
        <span></span>
        thinking
      </div>

      {/* Subtitles / Caption Wrap */}
      {captionActive && caption && (
        <div className="caption-wrap" style={{ bottom: 14 }}>
          <div className="caption on" style={{ fontSize: 13, padding: '7px 14px' }}>
            {caption}
          </div>
        </div>
      )}
    </section>
  );
}
