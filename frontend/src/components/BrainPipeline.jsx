import React, { useRef, useEffect } from 'react';

export default function BrainPipeline({ 
  activeNodes, 
  stageMs = {},
  traces, 
  onResetMemory 
}) {
  const brainlogRef = useRef(null);

  useEffect(() => {
    if (brainlogRef.current) {
      brainlogRef.current.scrollTop = brainlogRef.current.scrollHeight;
    }
  }, [traces]);

  const nodes = [
    { id: 'chat', label: 'Chat' },
    { id: 'route', label: 'Router' },
    { id: 'intent', label: 'Intent' },
    { id: 'rag', label: 'RAG' },
    { id: 'llm', label: 'LLM' }
  ];

  return (
    <div className="panel brain-panel">
      {/* Header */}
      <div className="panel-head">
        <div className="panel-title">
          Brain <span style={{ opacity: 0.65 }}>· live pipeline</span>
        </div>
        <button 
          className="btn-ghost sm" 
          onClick={onResetMemory}
          title="Clear Luna's short-term conversation memory (POST /memory/reset)"
        >
          reset memory
        </button>
      </div>

      {/* Visual Pipeline Nodes with Real MS Timings */}
      <div className="pipeline">
        {nodes.map((node, i) => {
          const msVal = stageMs[node.id];
          return (
            <React.Fragment key={node.id}>
              <div className={`node ${activeNodes[node.id] ? 'on' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
                <span>{node.label}</span>
                {msVal != null && (
                  <small style={{ fontSize: 8.5, opacity: 0.85, fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                    {msVal}ms
                  </small>
                )}
              </div>
              {i < nodes.length - 1 && <i></i>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Trace Log */}
      <div className="brainlog" ref={brainlogRef}>
        {traces.length === 0 ? (
          <div className="empty">
            Every message Luna handles is traced here:<br />
            <span>{'routing priority -> intent -> Second Brain RAG -> LLM inference.'}</span>
          </div>
        ) : (
          traces.map((trace, i) => {
            if (trace.isSep) {
              return (
                <div key={i} className="row sep">
                  <hr />
                </div>
              );
            }

            return (
              <div key={i} className={`row ${trace.isErr ? 'err' : ''}`}>
                <span className="ic">{trace.icon || '>'}</span>
                <span className="tx" dangerouslySetInnerHTML={{ __html: trace.html || trace.detail || '' }} />
                {trace.ms != null ? (
                  <span className={`ms ${trace.ms > 1500 ? 'slow' : ''}`}>
                    {trace.ms} ms
                  </span>
                ) : (
                  <span></span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
