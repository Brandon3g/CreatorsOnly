// src/pages/NewPassword.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';

/**
 * NewPassword
 * - This page is shown after the user clicks the Supabase reset link.
 * - The reset link temporarily signs the user in (session is in the URL).
 * - Here we call supabase.auth.updateUser({ password }) to set a new password.
 * - On success, we sign out that temporary session and send them back to #/Login.
 */
const NewPassword: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Basic guard: ensure the reset/session is present
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        // If no session, the link may have expired or was opened in another browser.
        setError(
          'This reset link is invalid or has expired. Please request a new one.'
        );
      }
      setReady(true);
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
    // Adjust rules as needed (symbols, uppercase, etc.)
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
      const { error: updateErr } = await supabase.auth.updateUser({
        password: pw1,
      });
      if (updateErr) {
        console.error('[NewPassword] update error:', updateErr);
        setError(updateErr.message ?? 'Could not set your new password.');
        return;
      }

      setMsg('Password updated! Redirecting you to sign in…');

      // End the temporary recovery session
      await supabase.auth.signOut();

      // Give the UI a beat to show the success message, then send to Login.
      setTimeout(() => {
        window.location.hash = '#/Login';
      }, 1200);
    } catch (err: any) {
      console.error('[NewPassword] unexpected:', err);
      setError('Something went wrong while updating your password.');
    } finally {
      setSubmitting(false);
    }
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
          onClick={() => (window.location.hash = '#/Login')}
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

          {msg && (
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
      </div>
    </div>
  );
};

export default NewPassword;
