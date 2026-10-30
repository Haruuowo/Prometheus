import React, { useRef, useEffect, useState } from 'react';

const SUGGESTIONS = [
  'What is in my Second Brain?',
  'Save to second brain: Project deadline is Friday at 5 PM',
  'Summarize my inbox',
  'What is on my schedule?',
  'Help me brainstorm a new feature',
  'Who made you?'
];

export default function LiveChat({ 
  messages, 
  onSendMessage, 
  onClearChat,
  thinking,
  lunaPng,
  user
}) {
  const [inputText, setInputText] = useState('');
  const chatlogRef = useRef(null);

  useEffect(() => {
    if (chatlogRef.current) {
      chatlogRef.current.scrollTop = chatlogRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), user?.displayName || 'You', 'Console');
    setInputText('');
  };

  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'You';
  const userInitial = (userDisplayName[0] || 'Y').toUpperCase();

  return (
    <div className="panel chat-panel" style={{ height: '100%' }}>
      {/* Panel Header */}
      <div className="panel-head" style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={lunaPng || '/luna.png'}
            alt="Luna"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid var(--nds-border-main)',
              background: 'var(--nds-surface)'
            }}
          />
          <div className="panel-title" style={{ fontSize: 13 }}>ODYSSEUS // LUNA CHAT</div>
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>ONLINE</span>
        </div>
        {onClearChat && (
          <button type="button" className="btn-ghost sm" onClick={onClearChat}>
            Clear Chat
          </button>
        )}
      </div>

      {/* Main Chatbot Conversation Area with Avatars next to Bubbles */}
      <div className="chatlog" ref={chatlogRef} style={{ padding: '18px 20px', gap: 16 }}>
        {messages.map((msg, i) => {
          const isLuna = msg.user === 'Luna' || msg.platform === 'Luna';
          return (
            <div
              key={msg.id || i}
              style={{
                display: 'flex',
                flexDirection: isLuna ? 'row' : 'row-reverse',
                alignItems: 'flex-start',
                gap: 12,
                alignSelf: isLuna ? 'flex-start' : 'flex-end',
                maxWidth: '84%'
              }}
            >
              {/* Avatar Next to Message */}
              {isLuna ? (
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: '1.5px solid var(--nds-border-main)',
                  background: 'var(--nds-surface)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '2px 2px 0px var(--nds-shadow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={lunaPng || '/luna.png'}
                    alt="Luna"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: '1.5px solid var(--nds-border-outer)',
                  background: 'var(--nds-blue-dark)',
                  color: '#ffffff',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '2px 2px 0px var(--nds-shadow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14
                }}>
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={userDisplayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
              )}

              {/* Message Content Column */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isLuna ? 'flex-start' : 'flex-end',
                minWidth: 0
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 4,
                  color: isLuna ? 'var(--nds-blue-dark)' : 'var(--nds-text-muted)'
                }}>
                  {isLuna ? 'Luna' : userDisplayName}
                </div>

                <div style={{
                  padding: '10px 14px',
                  borderRadius: isLuna ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                  background: isLuna ? 'var(--nds-surface)' : 'var(--nds-blue-dark)',
                  color: isLuna ? 'var(--nds-text)' : '#ffffff',
                  border: isLuna ? '1.5px solid var(--nds-border-main)' : '1.5px solid var(--nds-border-outer)',
                  boxShadow: '2px 2px 0px var(--nds-shadow)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {thinking && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            alignSelf: 'flex-start'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: '1.5px solid var(--nds-border-main)',
              background: 'var(--nds-surface)',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '2px 2px 0px var(--nds-shadow)'
            }}>
              <img
                src={lunaPng || '/luna.png'}
                alt="Luna"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{
              padding: '9px 14px',
              borderRadius: '4px 12px 12px 12px',
              background: 'var(--nds-surface)',
              border: '1.5px solid var(--nds-border-light)',
              fontSize: 12.5,
              color: 'var(--nds-text-muted)',
              fontWeight: 700
            }}>
              Luna is thinking...
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="chips" style={{ padding: '8px 14px 4px' }}>
        {SUGGESTIONS.map((text, i) => (
          <button 
            key={i} 
            type="button" 
            onClick={() => onSendMessage(text, userDisplayName, 'Console')}
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form className="chatform" onSubmit={handleSubmit} style={{ padding: '10px 14px 14px' }}>
        <input 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message Luna..."
          maxLength={500}
          style={{ padding: '11px 14px', fontSize: 14 }}
        />
        <button type="submit" className="btn-send" style={{ padding: '0 22px', fontSize: 13 }}>
          Send
        </button>
      </form>
    </div>
  );
}
