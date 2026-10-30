import React, { useState } from 'react';
import { 
  isFirebaseConfigured, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  saveRuntimeFirebaseConfig
} from '../firebase';

export default function AuthModal({ user, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigPaste, setShowConfigPaste] = useState(!isFirebaseConfigured);
  const [configText, setConfigText] = useState('');

  const handleSavePastedConfig = (e) => {
    e.preventDefault();
    try {
      const apiKeyMatch = configText.match(/apiKey\s*:\s*["']([^"']+)["']/);
      const authDomainMatch = configText.match(/authDomain\s*:\s*["']([^"']+)["']/);
      const projectIdMatch = configText.match(/projectId\s*:\s*["']([^"']+)["']/);
      const storageBucketMatch = configText.match(/storageBucket\s*:\s*["']([^"']+)["']/);
      const messagingSenderIdMatch = configText.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
      const appIdMatch = configText.match(/appId\s*:\s*["']([^"']+)["']/);

      let parsed = null;
      if (apiKeyMatch && projectIdMatch) {
        parsed = {
          apiKey: apiKeyMatch[1],
          authDomain: authDomainMatch ? authDomainMatch[1] : `${projectIdMatch[1]}.firebaseapp.com`,
          projectId: projectIdMatch[1],
          storageBucket: storageBucketMatch ? storageBucketMatch[1] : '',
          messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
          appId: appIdMatch ? appIdMatch[1] : ''
        };
      } else {
        parsed = JSON.parse(configText);
      }

      if (!parsed?.apiKey || !parsed?.projectId) {
        setError('Could not find apiKey and projectId in pasted config.');
        return;
      }
      saveRuntimeFirebaseConfig(parsed);
    } catch (err) {
      setError('Paste the firebaseConfig object from Firebase Console -> Project Settings.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError('Firebase is not configured yet. Add your Firebase keys in .env or paste firebaseConfig below.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not configured yet. Add your Firebase keys in .env or paste firebaseConfig below.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    onClose();
  };

  return (
    <div className="modal" onClick={(e) => { if (e.target.className === 'modal') onClose(); }}>
      <div className="modal-card">
        <button className="modal-x" onClick={onClose}>✕</button>
        
        <h2>{user ? 'Account Profile' : isSignUp ? 'Create Account' : 'Sign in to Luna AI'}</h2>
        <p style={{ marginBottom: 14 }}>
          {user 
            ? `Signed in as ${user.email || user.displayName}` 
            : 'Sign in with Firebase to sync your conversation memory, Second Brain notes, and custom settings.'}
        </p>

        {!isFirebaseConfigured && !user && (
          <div style={{
            background: 'var(--nds-chat-row)',
            border: '1.5px dashed var(--nds-border-main)',
            padding: '12px 14px',
            borderRadius: 6,
            marginBottom: 14,
            fontSize: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: 'var(--nds-blue-dark)' }}>Connect Your Firebase Project</b>
              <button
                type="button"
                className="btn-ghost sm"
                onClick={() => setShowConfigPaste(!showConfigPaste)}
              >
                {showConfigPaste ? 'Hide' : 'Paste Config'}
              </button>
            </div>
            <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--nds-text-muted)' }}>
              Fill in <code>VITE_FIREBASE_*</code> in your root <code>.env</code> file, or paste your <code>firebaseConfig</code> snippet directly below:
            </p>
            {showConfigPaste && (
              <form onSubmit={handleSavePastedConfig} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                  placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "..."\n};'}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-card-bg)',
                    color: 'var(--nds-text)',
                    fontSize: 11.5,
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                />
                <button type="submit" className="btn-send" style={{ padding: '7px 12px', fontSize: 12 }}>
                  Save & Connect Firebase
                </button>
              </form>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 14
          }}>
            {error}
          </div>
        )}

        {user ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              background: 'var(--nds-surface)',
              borderRadius: 8,
              border: '1px solid var(--nds-border-light)',
              marginBottom: 16
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--nds-blue-dark)',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <b style={{ fontSize: 14 }}>{user.displayName || 'Personal Account'}</b>
                <div style={{ fontSize: 12, color: 'var(--nds-text-muted)' }}>{user.email}</div>
              </div>
            </div>

            <button 
              className="btn-live" 
              onClick={handleSignOut}
              style={{ width: '100%', justifyContent: 'center', background: '#e05252' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <button 
              className="btn-ghost" 
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                justifyContent: 'center',
                marginBottom: 16,
                background: '#ffffff',
                color: '#1e293b'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 11, color: 'var(--nds-text-muted)' }}>
              ── OR USE EMAIL ──
            </div>

            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--nds-text-muted)' }}>
                  EMAIL ADDRESS
                </label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-card-bg)',
                    color: 'var(--nds-text)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: 'var(--nds-text-muted)' }}>
                  PASSWORD
                </label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid var(--nds-border-main)',
                    background: 'var(--nds-card-bg)',
                    color: 'var(--nds-text)',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              <button 
                type="submit" 
                className="btn-live" 
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              >
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12 }}>
              <span style={{ color: 'var(--nds-text-muted)' }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--nds-blue-dark)',
                  fontWeight: 700,
                  textDecoration: 'underline'
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
