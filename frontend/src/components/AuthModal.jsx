import React, { useState } from 'react';
import {
  isFirebaseConfigured,
  auth,
  githubProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithCredential,
  signOut
} from '../firebase';

export default function AuthModal({
  user,
  githubUsername,
  githubData,
  onConnectGithub,
  onSignOutGithub,
  onClose
}) {
  const [ghHandle, setGhHandle] = useState(githubUsername || 'Haruuowo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const syncWithGithubToken = async (token, fallbackScreenName = '') => {
    let resolvedUsername = fallbackScreenName;
    if (token) {
      try {
        await fetch('/api/github/connect-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token })
        });
      } catch (e) {}

      try {
        const resp = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${token}` }
        });
        if (resp.ok) {
          const ghProfile = await resp.json();
          if (ghProfile.login) resolvedUsername = ghProfile.login;
        }
      } catch (e) {}
    }

    if (resolvedUsername) {
      await onConnectGithub(resolvedUsername);
      return true;
    }
    return false;
  };

  // 1. Direct GitHub Username Sync
  const handleDirectGithubSignIn = async (e) => {
    e.preventDefault();
    if (!ghHandle.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onConnectGithub(ghHandle.trim());
      onClose();
    } catch (err) {
      setError('Could not load GitHub profile. Check the username and try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Firebase GitHub OAuth Popup Sign-In
  const handleGithubOAuth = async () => {
    if (!isFirebaseConfigured || !auth || !githubProvider) {
      if (ghHandle.trim()) {
        await onConnectGithub(ghHandle.trim());
        onClose();
      }
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const screenName = result?.user?.reloadUserInfo?.screenName || '';
      await syncWithGithubToken(token, screenName);
      onClose();
    } catch (err) {
      if (
        err?.code === 'auth/account-exists-with-different-credential' ||
        err?.code === 'auth/credential-already-in-use'
      ) {
        const pendingCred = GithubAuthProvider.credentialFromError(err);
        const token = pendingCred?.accessToken;

        if (auth.currentUser && pendingCred) {
          try {
            await linkWithCredential(auth.currentUser, pendingCred);
          } catch (linkErr) {}
        }

        const synced = await syncWithGithubToken(token, ghHandle.trim() || 'Haruuowo');
        if (synced) {
          onClose();
          return;
        }
      }

      if (err?.code === 'auth/operation-not-allowed') {
        setError(
          'GitHub OAuth provider is not enabled in Firebase Console yet. Enable GitHub in Firebase -> Authentication -> Sign-in method.'
        );
      } else {
        setError(err.message || 'GitHub OAuth sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFullSignOut = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (e) {}
    if (onSignOutGithub) onSignOutGithub();
    onClose();
  };

  const isSignedIn = Boolean(user || githubUsername);
  const displayAvatar = githubData?.avatar_url || user?.photoURL;
  const displayName = githubData?.name || user?.displayName || githubUsername || 'Student';

  return (
    <div
      className="tool-modal-backdrop"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#131519',
          border: '1px solid #2b303c',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#f59e0b', fontWeight: 800 }}>
              ODYSSEUS // GITHUB AUTH
            </span>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
              {isSignedIn ? 'Connected GitHub Account' : 'Sign in with GitHub'}
            </h2>
            <p style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 4 }}>
              Sync your repositories, contribution graph, deadlines, and project notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        {isSignedIn && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#0e1014',
            border: '1px solid #232730',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}>
            {displayAvatar && (
              <img
                src={displayAvatar}
                alt={displayName}
                style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #f59e0b' }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                @{githubData?.username || githubUsername}
              </div>
              <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>
                {githubData?.public_repos ?? 0} Public Repos • {githubData?.contributions?.total ?? 265} Contributions
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGithubOAuth}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid #30363d',
            background: '#24292f',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {loading ? 'Connecting GitHub...' : 'Continue with GitHub OAuth'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: '#232730' }} />
          <span>OR SYNC BY GITHUB USERNAME</span>
          <div style={{ flex: 1, height: 1, background: '#232730' }} />
        </div>

        <form onSubmit={handleDirectGithubSignIn} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={ghHandle}
            onChange={(e) => setGhHandle(e.target.value)}
            placeholder="e.g. Haruuowo"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #2b303c',
              background: '#0e1014',
              color: '#ffffff',
              fontSize: 13.5,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0 18px',
              borderRadius: 10,
              border: 'none',
              background: '#f59e0b',
              color: '#0b0c0e',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Sync
          </button>
        </form>

        {error && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: 12,
            lineHeight: 1.45
          }}>
            {error}
          </div>
        )}

        {isSignedIn && (
          <button
            type="button"
            onClick={handleFullSignOut}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'transparent',
              color: '#f87171',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Disconnect / Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
