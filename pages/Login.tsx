// src/pages/Login.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type LoginProps = {
  onForgotPassword: () => void;
};

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setPending(false);

    if (error) {
      setError(error.message || 'Login failed. Please try again.');
      return;
    }

    // Success: route into the app (providers wrap non-auth routes)
    window.location.hash = '#/Feed';
    // Ensure providers read the fresh session
    window.location.reload();
  };

  const hasError = !!error;
  const errorId = 'login-error';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">CreatorsOnly</h1>
          <p className="mt-2 text-text-secondary">A community for Creators</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin} noValidate>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-login" className="sr-only">Email</label>
              <input
                id="email-login"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                spellCheck={false}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
            </div>
            <div>
              <label htmlFor="password-login" className="sr-only">Password</label>
              <input
                id="password-login"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onForgotPassword}
              className="font-medium text-text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Forgot Password?
            </button>
          </div>

          {hasError && (
            <p
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="text-sm text-accent-red text-center"
            >
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={pending}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-hover disabled:opacity-60"
            >
              {pending ? 'Signing in…' : 'Log In'}
            </button>
          </div>
        </form>

        {/* Optional CTA — wire up later if you add a dedicated sign-up flow */}
        <div className="text-sm text-center text-text-secondary">
          Don’t have an account? Ask an admin to invite you.
        </div>
      </div>
    </div>
  );
};

export default Login;
