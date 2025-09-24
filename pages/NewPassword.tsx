// pages/NewPassword.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const NewPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checking, setChecking] = useState(true);

  /** Params that appear AFTER the first hash, e.g. #/NewPassword?code=ABC */
  function getHashQueryParams(): URLSearchParams {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex >= 0) {
      return new URLSearchParams(hash.substring(qIndex + 1));
    }
    return new URLSearchParams('');
  }

  /** Params that appear as a SECOND hash, e.g. #/NewPassword#code=ABC or #/NewPassword#access_token=... */
  function getSecondHashParams(): URLSearchParams | null {
    const href = window.location.href;
    const firstHash = href.indexOf('#');
    if (firstHash === -1) return null;
    const secondHash = href.indexOf('#', firstHash + 1);
    if (secondHash === -1) return null;
    const fragment = href.substring(secondHash + 1);
    return new URLSearchParams(fragment);
  }

  useEffect(() => {
    (async () => {
      setChecking(true);
      setError('');

      // Collect params from all possible locations
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;          // ?code=... (before hash)
      const hashQuery = getHashQueryParams();         // #/NewPassword?code=...
      const secondHash = getSecondHashParams();       // #/NewPassword#code=... OR #/NewPassword#access_token=...

      const errDesc =
        searchParams.get('error_description') ||
        hashQuery.get('error_description') ||
        secondHash?.get('error_description');

      if (errDesc) {
        setError(errDesc);
        setChecking(false);
        return;
      }

      // 1) PKCE code (any location)
      const code =
        searchParams.get('code') ||
        hashQuery.get('code') ||
        secondHash?.get('code');

      if (code) {
        const { error: xErr } = await supabase.auth.exchangeCodeForSession(code);
        if (xErr) {
          setError('Your reset link could not be verified. Please request a new one.');
          setChecking(false);
          return;
        }
      } else {
        // 2) Token-in-fragment (implicit) double-hash
        const access_token = secondHash?.get('access_token') || undefined;
        const refresh_token = secondHash?.get('refresh_token') || undefined;

        if (access_token && refresh_token) {
          const { error: sErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sErr) {
            setError('Your reset link is invalid or expired. Please request a new one.');
            setChecking(false);
            return;
          }
        }
      }

      // 3) Confirm a session exists now
      const { data, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !data?.session) {
        setError('Invalid or expired reset link. Please request a new one.');
        setChecking(false);
        return;
      }

      setChecking(false);
    })();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message || 'Could not update password. Please try again.');
    } else {
      setSuccess('Your password has been updated. You can now log in.');
    }
  };

  const goToLogin = () => {
    window.location.hash = '#/Login';
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-primary">Verifying link…</h1>
          <p className="text-text-secondary">One moment while we open your reset form.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-primary text-center">Set New Password</h1>

        {error && (
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/ForgotPassword'; }}
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Request New Link
            </button>
          </div>
        )}

        {!error && success && (
          <div className="text-center">
            <p className="text-green-600 mb-4">{success}</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Back to Login
            </button>
          </div>
        )}

        {!error && !success && (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-text-primary">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewPassword;
