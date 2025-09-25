// pages/SignUp.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setPending(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${location.origin}/#/Login?fresh=1`,
        },
      });
      if (error) throw error;

      if (data.user && !data.session) {
        setInfo('Check your email to confirm your account, then log in.');
      } else {
        location.replace('/#/Feed?fresh=' + Date.now());
      }
    } catch (err: any) {
      setError(err?.message ?? 'Sign up failed. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Create your account</h1>
          <p className="mt-2 text-text-secondary">Join the CreatorsOnly community</p>
        </div>

        <form className="space-y-6" onSubmit={handleSignUp} noValidate>
          <div className="space-y-3">
            <div>
              <label htmlFor="email-signup" className="sr-only">Email</label>
              <input
                id="email-signup"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-3 border border-surface-light bg-surface-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-signup" className="sr-only">Password</label>
              <input
                id="password-signup"
                type="password"
                required
                autoComplete="new-password"
                className="w-full px-3 py-3 border border-surface-light bg-surface-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-accent-red text-center">{error}</p>}
          {info && <p role="status" className="text-sm text-primary text-center">{info}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-full bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? 'Creating…' : 'Create account'}
          </button>

          <div className="text-sm text-center">
            <button
              type="button"
              onClick={() => (location.hash = '#/Login')}
              className="font-medium text-text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Already have an account? Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
