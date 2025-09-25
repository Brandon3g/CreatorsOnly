// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';

interface LoginProps {
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { login, isAuthenticated } = useAppContext();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we somehow get here while already authenticated, just send to feed.
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      window.location.hash = '#/Feed';
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const u = usernameOrEmail.trim();
    const p = password;

    if (!u || !p) {
      setError('Please enter both your username/email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await Promise.resolve(login(u, p));
      if (!ok) {
        setError('Invalid credentials. Double-check and try again.');
        return;
      }
      // AppContext will flip isAuthenticated -> App routes will take over
    } catch (err: any) {
      console.error('[Login] unexpected error:', err);
      setError('Something went wrong while signing you in.');
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
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. elena or elena@example.com"
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
