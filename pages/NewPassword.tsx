// pages/NewPassword.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';
import { trackEvent } from '../services/analytics';

/**
 * Parse ANY hash segments (works with "#/Route#access_token=...").
 * We merge params from all fragments after the first '#'.
 */
function parseAllHashParams(): Record<string, string> {
  const href = window.location.href || '';
  const parts = href.split('#').slice(1); // drop everything before first '#'
  const params: Record<string, string> = {};
  for (const frag of parts) {
    const qs = new URLSearchParams(frag);
    for (const [k, v] of qs.entries()) params[k] = v;
  }
  return params;
}

const NewPassword: React.FC = () => {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  // Detect explicit Supabase error passed in the URL (expired link, etc.)
  const urlErrorText = useMemo(() => {
    const params = parseAllHashParams();
    const err = params['error_description'] || params['error'];
    return err ? decodeURIComponent(err.replace(/\+/g, ' ')) : null;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) If Supabase already established a session, we're good.
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        if (data.session) {
          setHasSession(true);
          setChecking(false);
          return;
        }

        // 2) If no session yet, try to set it from hash tokens (works with "#/route#access_token=...")
        const params = parseAllHashParams();
        const access_token = params['access_token'];
        const refresh_token = params['refresh_token'];

        if (access_token && refresh_token) {
          const { data: setData, error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!alive) return;

          if (setErr) {
            setHasSession(false);
            setMessage({
              type: 'error',
              text:
                urlErrorText ||
                setErr.message ||
                'This reset link is invalid or has expired. Please request a new one.',
            });
          } else if (setData.session) {
            setHasSession(true);
          } else {
            setHasSession(false);
          }
        } else {
          // No tokens present; likely an old/invalid link
          setHasSession(false);
          if (urlErrorText) {
            setMessage({ type: 'error', text: urlErrorText });
          } else {
            setMessage({
              type: 'error',
              text: 'This reset link is invalid or has expired. Please request a new one.',
            });
          }
        }
      } catch (e: any) {
        if (!alive) return;
        setHasSession(false);
        setMessage({
          type: 'error',
          text: 'Unable to verify reset link. Please request a new one.',
        });
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [urlErrorText]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!hasSession) {
      setMessage({
        type: 'error',
        text: 'Auth session missing! Go back to Forgot password and open a fresh link.',
      });
      return;
    }
    if (pw1.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (pw1 !== pw2) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: pw1 });
      if (upErr) {
        setMessage({ type: 'error', text: upErr.message || 'Could not update password.' });
        trackEvent('password_update_failed', { message: upErr.message });
        return;
      }
      setMessage({ type: 'ok', text: 'Your password has been updated.' });
      trackEvent('password_update_success', {});
      setPw1('');
      setPw2('');
    } catch (err) {
      console.error('[NewPassword] update error', err);
      setMessage({ type: 'error', text: 'Unexpected error. Please try again.' });
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

        {/* Single consolidated alert (no duplicates) */}
        {message && (
          <div
            className={`text-sm rounded-md p-3 mb-4 border ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {message.text}{' '}
            {message.type === 'error' && (
              <>
                {message.text.includes('Forgot') ? null : (
                  <>
                    You can request a new link on the{' '}
                    <button onClick={goForgot} className="underline hover:opacity-80">
                      Forgot password
                    </button>{' '}
                    page.
                  </>
                )}
              </>
            )}
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
                disabled={checking || message?.type === 'ok' || !hasSession}
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
              disabled={checking || message?.type === 'ok' || !hasSession}
            />
          </div>

          <button
            type="submit"
            disabled={checking || loading || message?.type === 'ok' || !hasSession}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="mt-4 text-xs text-text-secondary">
          Tip: If this says “Auth session missing,” go back to{' '}
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
