// pages/Login.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { startRegistration } = useAppContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setPending(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // Optional: small toast in console to verify
      console.log('[Auth] Logged in as:', data.user?.id, data.user?.email);

      // Reload so AppProvider re-reads the Supabase session
      window.location.reload();
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const hasError = Boolean(error);
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
          {info && (
            <p role="status" className="text-sm text-primary text-center">
              {info}
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

        <div className="text-sm text-center">
          <button
            type="button"
            onClick={startRegistration}
            className="font-medium text-text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Don&apos;t have an account? Create one
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
