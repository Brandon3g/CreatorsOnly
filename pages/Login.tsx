// src/pages/Login.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';

interface LoginProps {
  onForgotPassword: () => void;
}

async function waitForSession(timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  const first = await supabase.auth.getSession();
  if (first.data.session) return true;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 120));
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
  }
  return false;
}

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we already have a session, bounce to Feed.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.hash = '#/Feed';
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const id = identifier.trim();
    const pw = password;

    if (!id || !pw) {
      setError('Please enter both your email/username and password.');
      return;
    }

    setSubmitting(true);
    try {
      let emailToUse = id;

      // If the user typed a username (no "@"), try to resolve it to an email.
      if (!id.includes('@')) {
        try {
          // Assumes a "profiles" table with a "username" and "email" column.
          // If this query fails in your project, it will simply fall back to using
          // the identifier as an email.
          const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .ilike('username', id)
            .maybeSingle();

          if (!error && data?.email) {
            emailToUse = data.email;
          }
        } catch {
          // ignore, we'll just try the identifier as an email
        }
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: pw,
      });
      if (signInErr) {
        // If we tried mapping a username and it failed, one more try as raw email
        if (emailToUse !== id) {
          const { error: secondErr } = await supabase.auth.signInWithPassword({
            email: id,
            password: pw,
          });
          if (secondErr) throw secondErr;
        } else {
          throw signInErr;
        }
      }

      // Wait until the session is actually established so the app routes correctly.
      const ok = await waitForSession(2500);
      if (!ok) throw new Error('Auth session not established yet. Try again.');

      // Hand off to the app; AuthGate/AppContext will pick up the session.
      window.location.hash = '#/Feed';
    } catch (err: any) {
      console.error('[Login] error:', err);
      setError(err?.message ?? 'Invalid credentials. Double-check and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-surface-light rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            {ICONS.camera}
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-1">Welcome back</h1>
        <p className="text-center text-text-secondary mb-6">
          Sign in to continue to CreatorsOnly
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Username or Email
            </label>
            <input
              type="text"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. yourname or you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? ICONS.eyeOff ?? ICONS.close : ICONS.eye ?? ICONS.copy}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-md px-3 py-2"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-primary hover:underline"
            >
              Forgot password?
            </button>

            <a
              href="#/SignUp"
              className="text-text-secondary hover:text-text-primary"
            >
              Create account
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
