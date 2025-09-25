// pages/Login.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { trackEvent } from '../services/analytics';

type LoginProps = {
  onForgotPassword?: () => void;
};

// Inline icons to guarantee visibility (no dependency on ICONS set)
const Eye = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 5c-5 0-9 4.5-9 7s4 7 9 7 9-4.5 9-7-4-7-9-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M3.27 2 2 3.27 5.11 6.4C3.24 7.73 2 9.5 2 12c0 2.5 4 7 10 7 2.06 0 3.9-.58 5.43-1.52l3.3 3.3L22 19.98 3.27 2Zm11.51 11.51L9.49 8.71a4 4 0 0 1 5.29 5.29ZM12 17a4.98 4.98 0 0 1-3.53-1.46l7.07-7.07A5 5 0 0 1 12 17Zm10-5c0-2.12-1.63-4.3-3.91-5.78l-1.4 1.4C18.44 8.83 20 10.39 20 12c0 .88-.48 1.88-1.29 2.83l1.43 1.43C21.13 15.1 22 13.42 22 12Z"
      fill="currentColor"
    />
  </svg>
);

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { getUserByUsername } = useAppContext();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Treat input as email if it contains "@", otherwise attempt username → email
  const resolveEmail = (id: string): string | null => {
    const trimmed = id.trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) return trimmed;
    const byUser = getUserByUsername(trimmed);
    return byUser?.email ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const email = resolveEmail(identifier);
    if (!email) {
      setErr('Enter a valid email or existing username.');
      return;
    }
    if (!password) {
      setErr('Enter your password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg =
          /invalid/.test(error.message.toLowerCase())
            ? 'Invalid credentials. Double-check and try again.'
            : error.message || 'Sign-in failed. Please try again.';
        setErr(msg);
        trackEvent('login_failed', { reason: msg });
        return;
      }
      trackEvent('login_success', { method: 'email_password' });
      // Let AuthGate/AppContext take over. Small nudge to reflect state instantly:
      if (!location.hash || location.hash.toLowerCase() === '#/login') {
        location.hash = '#/Feed';
      }
    } catch (e) {
      console.error('[Login] unexpected', e);
      setErr('Unexpected error. Please try again.');
      trackEvent('login_failed', { reason: 'unexpected' });
    } finally {
      setLoading(false);
    }
  };

  const goForgot = () => (onForgotPassword ? onForgotPassword() : (location.hash = '#/ForgotPassword'));
  const goSignUp = () => (location.hash = '#/SignUp');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-surface-light p-6 shadow-lg">
        {/* Header icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            {ICONS.camera}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
        <p className="text-center text-text-secondary mb-6">
          Sign in to continue to CreatorsOnly
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Username or Email</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              inputMode="email"
              className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com or yourusername"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-surface-light p-3 pr-11 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-text-secondary hover:text-text-primary"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {err && (
            <div className="text-sm bg-red-500/10 text-red-300 border border-red-500/30 rounded-md p-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={goForgot} className="text-primary hover:text-primary-hover">
            Forgot password?
          </button>
          <button onClick={goSignUp} className="text-text-secondary hover:text-text-primary">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
