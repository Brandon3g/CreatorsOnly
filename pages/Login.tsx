// pages/Login.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type Props = { onForgotPassword: () => void };

async function waitForSession(timeoutMs = 1500): Promise<boolean> {
  const start = Date.now();
  const first = await supabase.auth.getSession();
  if (first.data.session) return true;
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 120));
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
  }
  return false;
}

const Login: React.FC<Props> = ({ onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const ok = await waitForSession(2000);
      if (!ok) throw new Error('Auth session not established yet. Please try again.');

      location.replace('/#/Feed?fresh=' + Date.now());
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

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
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-login" className="sr-only">Password</label>
              <input
                id="password-login"
                type="password"
                required
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <p role="alert" className="text-sm text-accent-red text-center">{error}</p>
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
            onClick={() => (location.hash = '#/SignUp')}
            className="font-medium text-text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Don’t have an account? Create one
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
