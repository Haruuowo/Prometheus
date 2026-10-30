import React, { useRef } from 'react';

export default function PersonaTab({
  customPrompt,
  onChangePrompt,
  temperature,
  onChangeTemperature,
  lunaPng,
  onChangeLunaPng,
  onResetLunaPng,
  onTestVoice,
  onResetMemory
}) {
  const fileRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeLunaPng(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="tab-workspace">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, flex: 1 }}>
        {/* Left: Persona & Prompt Studio */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Luna Persona & System Instructions</div>
            <button type="button" className="btn-ghost sm" onClick={onResetMemory}>
              Reset Short-Term Memory
            </button>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)', marginBottom: 6 }}>
                CUSTOM SYSTEM PROMPT
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  color: 'var(--nds-text)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--nds-text-muted)' }}>
                  RESPONSE TEMPERATURE (CREATIVITY)
                </label>
                <b style={{ fontSize: 12, color: 'var(--nds-blue-dark)' }}>{temperature}</b>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.2"
                step="0.05"
                value={temperature}
                onChange={(e) => onChangeTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Right: Custom PNG Avatar Settings */}
        <div className="panel" style={{ padding: 0 }}>
          <div className="panel-head">
            <div className="panel-title">Custom Luna PNG Avatar</div>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 180,
              height: 180,
              borderRadius: 12,
              border: '2px solid var(--nds-border-main)',
              background: 'var(--nds-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: 8
            }}>
              <img
                src={lunaPng || '/luna.png'}
                alt="Luna PNG Preview"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-send"
                style={{ padding: '8px 16px' }}
                onClick={() => fileRef.current?.click()}
              >
                Upload Custom PNG
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={onResetLunaPng}
              >
                Reset Default
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp,image/jpeg,image/gif"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
