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
  const [ghHandle, setGhHandle] = useState(githubUsername || '');
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

        const synced = await syncWithGithubToken(token, ghHandle.trim());
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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md neo-card-cream p-7 flex flex-col gap-5 shadow-[8px_8px_0px_#18181b]"
      >
        {/* Top Stamp + Outlined Hero Typography (Inspired by Left Screen of Pablo UI) */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f8de8c] border-2 border-dashed border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900">
              PROMETHEUS // EST. 2026
            </div>
            <div className="mt-3 leading-none">
              <div className="text-2xl neo-outline-title">SYNC YOUR</div>
              <div className="text-2xl neo-outline-title mt-0.5">WORKSPACE</div>
              <div className="text-2xl mt-0.5">
                <span className="neo-outline-title">WITH </span>
                <span className="neo-coral-title">GITHUB</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-600 mt-3 leading-relaxed">
              Welcome to your custom student planner! Made to organize your classes, deadlines, and GitHub repositories in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-900 text-xl font-extrabold px-2"
          >
            &times;
          </button>
        </div>

        {isSignedIn && (
          <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] flex items-center gap-3.5">
            {displayAvatar && (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-12 h-12 rounded-full border-2 border-zinc-900 object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-zinc-900 truncate">{displayName}</div>
              <div className="text-xs font-mono font-bold text-[#e0533c]">
                @{githubData?.username || githubUsername}
              </div>
              <div className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                {githubData?.public_repos ?? 0} Public Repos •{' '}
                {githubData?.contributions?.total ?? 0} Contributions
              </div>
            </div>
          </div>
        )}

        {/* Stacked Butter & Cream Buttons (Exact Pablo Left Screen Style) */}
        <button
          type="button"
          onClick={handleGithubOAuth}
          disabled={loading}
          className="w-full neo-btn-butter py-3.5 px-4 text-sm flex items-center justify-center gap-2.5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {loading ? 'Connecting GitHub...' : 'Continue with GitHub OAuth'}
        </button>

        <form onSubmit={handleDirectGithubSignIn} className="flex gap-2">
          <input
            type="text"
            value={ghHandle}
            onChange={(e) => setGhHandle(e.target.value)}
            placeholder="Or enter GitHub username..."
            className="flex-1 neo-input text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="neo-btn-white px-5 text-sm font-extrabold"
          >
            Sync
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-[#f4b6c2] border-2 border-zinc-900 text-zinc-900 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-extrabold text-zinc-700 underline hover:text-zinc-900"
          >
            Continue as guest
          </button>

          {isSignedIn && (
            <button
              type="button"
              onClick={handleFullSignOut}
              className="text-xs font-extrabold text-[#e0533c] underline"
            >
              Disconnect account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
