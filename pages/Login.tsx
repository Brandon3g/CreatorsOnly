// pages/Login.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import { trackEvent } from '../services/analytics';

type LoginProps = {
  onForgotPassword?: () => void;
};

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { getUserByUsername } = useAppContext();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resolveEmail = (id: string): string | null => {
    const trimmed = id.trim();
    if (!trimmed) return null;

    // If it's an email, just use it
    if (trimmed.includes('@')) return trimmed;

    // Otherwise treat as username and try to look up a mock user for its email
    const byUser = getUserByUsername(trimmed);
    if (byUser?.email) return byUser.email;

    return null;
    // NOTE: If you later back this with a real users table, swap this lookup for an API call.
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Friendly error messages
        const msg =
          /invalid/.test(error.message.toLowerCase())
            ? 'Invalid credentials. Double-check and try again.'
            : error.message || 'Sign-in failed. Please try again.';
        setErr(msg);
        trackEvent('login_failed', { reason: msg });
        return;
      }

      // Success: AppContext + AuthGate will take over and route into the app.
      trackEvent('login_success', { method: 'email_password' });

      // Optional: nudge hash so the UI reflects the state instantly.
      if (!location.hash || location.hash.toLowerCase() === '#/login') {
        location.hash = '#/Feed';
      }
    } catch (e: any) {
      setErr('Unexpected error. Please try again.');
      console.error('[Login] unexpected error:', e);
      trackEvent('login_failed', { reason: 'unexpected' });
    } finally {
      setLoading(false);
    }
  };

  const goForgot = () => {
    if (onForgotPassword) onForgotPassword();
    else location.hash = '#/ForgotPassword';
  };

  const goSignUp = () => {
    location.hash = '#/SignUp';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-surface-light p-6 shadow-lg">
        <button
          className="mb-4 inline-flex items-center text-text-secondary hover:text-text-primary"
          onClick={() => (location.hash = '#/Feed')}
          aria-label="Back"
        >
          {ICONS.back}
          <span className="ml-2">Back to feed</span>
        </button>

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
                className="w-full bg-surface-light p-3 pr-10 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
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
          <button
            onClick={goForgot}
            className="text-primary hover:text-primary-hover"
          >
            Forgot password?
          </button>
          <button
            onClick={goSignUp}
            className="text-text-secondary hover:text-text-primary"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
