// pages/NewPassword.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';
import { trackEvent } from '../services/analytics';

const NewPassword: React.FC = () => {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // If Supabase redirected with an error in the URL hash (common on expired links)
  const hashError = useMemo(() => {
    const h = window.location.hash || '';
    if (!h.includes('error=')) return null;
    // strip leading #
    const qs = new URLSearchParams(h.slice(1));
    const desc = qs.get('error_description') || qs.get('error');
    if (!desc) return 'This reset link is invalid or has expired.';
    return decodeURIComponent(desc.replace(/\+/g, ' '));
  }, []);

  useEffect(() => {
    // Check if we have an authenticated recovery session
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setHasSession(!!data.session);
        if (!data.session && !hashError) {
          // Not an error in hash, just a stale page open
          setError('This reset link is invalid or has expired. Please request a new one.');
        }
      } catch {
        setHasSession(false);
        setError('Unable to verify reset link. Please request a new one.');
      }
    };
    run();
  }, [hashError]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!hasSession) {
      setError('Auth session missing! Go back to Forgot password and open a fresh link.');
      return;
    }
    if (pw1.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: pw1 });
      if (upErr) {
        setError(upErr.message || 'Could not update password.');
        trackEvent('password_update_failed', { message: upErr.message });
        return;
      }
      setOk('Your password has been updated.');
      trackEvent('password_update_success', {});
      setPw1('');
      setPw2('');
    } catch (err) {
      console.error('[NewPassword] update error', err);
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    location.hash = '#/Login';
  };

  const goForgot = () => (location.hash = '#/ForgotPassword');

  // Early error from the hash (expired link) overrides everything
  if (hashError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface rounded-2xl border border-surface-light p-6 shadow-lg">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              {ICONS.camera}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">Set a new password</h1>
          <p className="text-center text-text-secondary mb-4">
            Enter and confirm your new password below.
          </p>
          <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-md p-3 mb-4">
            {hashError}
          </div>
          <div className="flex justify-between">
            <button onClick={goForgot} className="px-4 py-2 rounded-md border border-surface-light hover:bg-surface-light">
              Forgot password
            </button>
            <button onClick={goLogin} className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary-hover">
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-surface-light p-6 shadow-lg">
        <button
          className="mb-4 inline-flex items-center text-text-secondary hover:text-text-primary"
          onClick={goLogin}
          aria-label="Back"
        >
          {ICONS.back}
          <span className="ml-2">Back to sign in</span>
        </button>

        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            {ICONS.camera}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Set a new password</h1>
        <p className="text-center text-text-secondary mb-6">
          Enter and confirm your new password below.
        </p>

        {/* If we already checked and there's no session, show inline guidance */}
        {hasSession === false && (
          <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-md p-3 mb-4">
            This reset link is invalid or has expired. Please request a new one on the{' '}
            <button onClick={goForgot} className="underline hover:text-red-200">Forgot password</button> page.
          </div>
        )}

        {ok && (
          <div className="text-sm bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md p-3 mb-4">
            {ok}
          </div>
        )}

        {error && (
          <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-surface-light p-3 pr-11 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                autoComplete="new-password"
                disabled={!!ok}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-text-secondary hover:text-text-primary"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPw ? ICONS.eyeOff : ICONS.eye}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Confirm new password</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              autoComplete="new-password"
              disabled={!!ok}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!ok || hasSession === false}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="mt-4 text-xs text-text-secondary">
          Tip: If this still says “Auth session missing,” go back to{' '}
          <button onClick={goForgot} className="underline hover:text-text-primary">
            Forgot password
          </button>{' '}
          and request a fresh link, then open it immediately.
        </p>
      </div>
    </div>
  );
};

export default NewPassword;
