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

/** Session-storage keys used by index.html pre-boot script (if present). */
const RECOVERY_FLAG = 'co-recovery-active';
const STORED_AT = 'co-recovery-at';
const STORED_RT = 'co-recovery-rt';
const STORED_TS = 'co-recovery-ts'; // epoch ms

/** Read access/refresh tokens from sessionStorage (if a pre-boot script saved them). */
function readTokensFromStorage():
  | { access_token: string; refresh_token: string }
  | null {
  try {
    const at = sessionStorage.getItem(STORED_AT) || '';
    const rt = sessionStorage.getItem(STORED_RT) || '';
    const ts = Number(sessionStorage.getItem(STORED_TS) || '0');

    if (!at || !rt) return null;

    // Basic staleness guard: 15 minutes
    if (ts && Date.now() - ts > 15 * 60 * 1000) {
      sessionStorage.removeItem(STORED_AT);
      sessionStorage.removeItem(STORED_RT);
      sessionStorage.removeItem(STORED_TS);
      return null;
    }

    return { access_token: at, refresh_token: rt };
  } catch {
    return null;
  }
}

/** Clear any stored recovery state after we successfully establish a session. */
function clearStoredRecovery() {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG);
    sessionStorage.removeItem(STORED_AT);
    sessionStorage.removeItem(STORED_RT);
    sessionStorage.removeItem(STORED_TS);
  } catch {}
}

const NewPassword: React.FC = () => {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
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
        // 0) If Supabase already established a session, we're good.
        {
          const { data } = await supabase.auth.getSession();
          if (!alive) return;
          if (data.session) {
            setHasSession(true);
            setChecking(false);
            return;
          }
        }

        // 1) Try tokens that are still visible in the hash (if Supabase didn't already eat them).
        {
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
              // fall through to try storage
              console.warn('[NewPassword] setSession from hash failed:', setErr.message);
            } else if (setData.session) {
              setHasSession(true);
              setChecking(false);
              clearStoredRecovery();
              return;
            }
          }
        }

        // 2) Fallback: tokens previously captured by index.html and cached in sessionStorage
        {
          const stored = readTokensFromStorage();
          if (stored) {
            const { data: setData2, error: setErr2 } = await supabase.auth.setSession(stored);
            if (!alive) return;

            if (setErr2) {
              setHasSession(false);
              setMessage({
                type: 'error',
                text:
                  urlErrorText ||
                  setErr2.message ||
                  'This reset link is invalid or has expired.\nPlease request a new one.',
              });
            } else if (setData2.session) {
              setHasSession(true);
              clearStoredRecovery();
              setChecking(false);
              return;
            }
          }
        }

        // 3) If we get here, there is no session and no usable tokens.
        setHasSession(false);
        if (urlErrorText) {
          setMessage({ type: 'error', text: urlErrorText });
        } else {
          setMessage({
            type: 'error',
            text: 'This reset link is invalid or has expired.\nPlease request a new one.',
          });
        }
      } catch (e: any) {
        if (!alive) return;
        setHasSession(false);
        setMessage({
          type: 'error',
          text: 'Unable to verify reset link.\nPlease request a new one.',
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
        text:
          'Auth session missing! You can request a new link on the Forgot password page.',
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
      clearStoredRecovery();
    } catch (err) {
      console.error('[NewPassword] update error', err);
      setMessage({ type: 'error', text: 'Unexpected error.\nPlease try again.' });
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
      <div className="w-full max-w-md bg-surface rounded-xl border border-border p-6 shadow-lg">
        <button
          onClick={goLogin}
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          {ICONS.back} Back to sign in
        </button>

        <div className="mx-auto mb-4 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {ICONS.camera}
        </div>

        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-text-secondary">
          Enter and confirm your new password below.
        </p>

        {/* Single consolidated alert (no duplicates) */}
        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {message.text}{' '}
            {message.type === 'error' && (
              <>
                {message.text.includes('Forgot') ? null : (
                  <>
                    You can request a new link on the{' '}
                    <button
                      className="underline hover:text-text-primary"
                      onClick={goForgot}
                    >
                      Forgot password
                    </button>{' '}
                    page.
                  </>
                )}
              </>
            )}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleUpdate}>
          <label className="block text-sm font-medium">New password</label>
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

          <label className="block text-sm font-medium">Confirm new password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Re-enter password"
            className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            autoComplete="new-password"
            disabled={checking || message?.type === 'ok' || !hasSession}
          />

          <button
            type="submit"
            disabled={loading || checking || message?.type === 'ok' || !hasSession}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>

          <p className="text-xs text-text-secondary">
            Tip: If this still says “Auth session missing,” go back to{' '}
            <button className="underline hover:text-text-primary" onClick={goForgot}>
              Forgot password
            </button>{' '}
            and request a fresh link, then open it immediately.
          </p>
        </form>
      </div>
    </div>
  );
};

export default NewPassword;
