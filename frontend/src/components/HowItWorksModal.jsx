import React from 'react';

export default function HowItWorksModal({ onClose }) {
  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="modal-card wide">
        <button className="modal-x" onClick={onClose}>✕</button>
        
        <h2>How Luna Personal AI Works</h2>
        <p>
          An Odysseus / Jarvis-style personal AI multi-tool combining low-latency conversational AI,
          a personal Second Brain RAG knowledge store, and personal productivity tools.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          margin: '20px 0'
        }}>
          <div style={{ background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--nds-blue-dark)', marginBottom: 6 }}>
              1. AI Chatbot
            </div>
            <ul style={{ fontSize: 12, listStyle: 'none', lineHeight: 1.6, color: 'var(--nds-text-muted)' }}>
              <li>• 1-on-1 Personal Chat</li>
              <li>• Custom Luna PNG Avatar</li>
              <li>• Rolling Context Memory</li>
              <li>• Firebase User Auth</li>
            </ul>
          </div>

          <div style={{ background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--nds-blue-dark)', marginBottom: 6 }}>
              2. Second Brain
            </div>
            <ul style={{ fontSize: 12, listStyle: 'none', lineHeight: 1.6, color: 'var(--nds-text-muted)' }}>
              <li>• Ingest Notes & Links</li>
              <li>• Auto-Chunking for RAG</li>
              <li>• Long-Term Fact Memory</li>
              <li>• Source Citations</li>
            </ul>
          </div>

          <div style={{ background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--nds-blue-dark)', marginBottom: 6 }}>
              3. AI Brain & Tools
            </div>
            <ul style={{ fontSize: 12, listStyle: 'none', lineHeight: 1.6, color: 'var(--nds-text-muted)' }}>
              <li>• Groq LLaMA Inference</li>
              <li>• Intent & Tool Router</li>
              <li>• Inbox Triage & Search</li>
              <li>• Schedule & Reminders</li>
            </ul>
          </div>

          <div style={{ background: 'var(--nds-card-bg)', border: '1.5px solid var(--nds-border-main)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--nds-blue-dark)', marginBottom: 6 }}>
              4. Live Pipeline
            </div>
            <ul style={{ fontSize: 12, listStyle: 'none', lineHeight: 1.6, color: 'var(--nds-text-muted)' }}>
              <li>• Real-Time Stage Tracing</li>
              <li>• Per-Stage MS Metrics</li>
              <li>• Custom System Prompts</li>
              <li>• Custom PNG Avatar</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button className="btn-send" onClick={onClose} style={{ padding: '8px 24px' }}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
