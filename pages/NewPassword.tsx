// src/pages/NewPassword.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';

/**
 * NewPassword
 * - Reads `access_token` & `refresh_token` from the URL hash (Supabase recovery link),
 *   hydrates a session with `supabase.auth.setSession(...)`,
 *   then lets the user set a new password.
 * - On success, we SHOW a clear success state and a button to go back to Login.
 *   (No auto-redirect; avoids the “did it work?” confusion.)
 */

function parseHashTokens() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '') || '';
  // Accept shapes:
  //   #/NewPassword&access_token=...&refresh_token=...&type=recovery
  //   #access_token=...&refresh_token=...&type=recovery
  const q = h.replace(/^#\/?NewPassword?\/?/, '').replace(/^#/, '');
  const params = new URLSearchParams(q);
  const access_token = params.get('access_token') || '';
  const refresh_token = params.get('refresh_token') || '';
  const type = params.get('type') || '';
  return { access_token, refresh_token, type };
}

const NewPassword: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Ensure a valid session exists by hydrating from hash tokens if present.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { access_token, refresh_token } = parseHashTokens();

        // 1) If tokens exist in the hash, seed a session explicitly.
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) console.error('[NewPassword] setSession error:', error);

          // Clean the URL so tokens don't linger in history
          history.replaceState(null, '', `${location.origin}/#/NewPassword`);
        }

        // 2) Check if we have a session (either pre-existing or just set)
        const { data: sess } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!sess.session) {
          setError(
            'This reset link is invalid or has expired. Please request a new one.'
          );
        }
      } catch (e) {
        console.error('[NewPassword] prepare error:', e);
        if (mounted)
          setError(
            'We could not validate your reset link. Please request a new one.'
          );
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    if (pw1.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Za-z]/.test(pw1) || !/\d/.test(pw1))
      return 'Use letters and at least one number.';
    if (pw1 !== pw2) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setError('Auth session missing! Please request a new reset link.');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: pw1,
      });
      if (updateErr) {
        console.error('[NewPassword] update error:', updateErr);
        setError(updateErr.message ?? 'Could not set your new password.');
        return;
      }

      // Clear inputs, show success UI (no auto-redirect).
      setPw1('');
      setPw2('');
      setMsg('Your password has been updated.');
      setSuccess(true);
      // Store a small flag so Login can optionally show a tiny toast/banner
      try {
        localStorage.setItem('co-pw-reset-success', Date.now().toString());
      } catch {}

    } catch (err: any) {
      console.error('[NewPassword] unexpected:', err);
      setError('Something went wrong while updating your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = async () => {
    // End the temporary recovery session then route to Login.
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.hash = '#/Login';
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <p className="text-text-secondary">Preparing reset form…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-surface-light rounded-2xl p-6 shadow-lg">
        <button
          type="button"
          onClick={goToLogin}
          className="mb-4 inline-flex items-center text-text-secondary hover:text-text-primary"
        >
          <span className="mr-2">{ICONS.arrowLeft}</span>
          Back to sign in
        </button>

        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            {ICONS.refresh}
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-2">Set a new password</h1>
        <p className="text-center text-text-secondary mb-6">
          Enter and confirm your new password below.
        </p>

        {success ? (
          <>
            <div
              className="text-sm text-green-300 bg-green-900/20 border border-green-900/40 rounded-md px-3 py-2 mb-4"
              role="status"
            >
              {msg ?? 'Password updated.'}
            </div>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-hover"
            >
              Return to sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">
                New password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <div
                className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-md px-3 py-2"
                role="alert"
              >
                {error}
              </div>
            )}

            {msg && !success && (
              <div
                className="text-sm text-green-300 bg-green-900/20 border border-green-900/40 rounded-md px-3 py-2"
                role="status"
              >
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <div className="text-xs text-text-secondary mt-4">
          Tip: If this still says “Auth session missing,” go back to{' '}
          <a href="#/ForgotPassword" className="text-primary underline">Forgot password</a> and
          request a fresh link, then open it immediately.
        </div>
      </div>
    </div>
  );
};

export default NewPassword;
