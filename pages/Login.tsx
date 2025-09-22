// src/pages/Login.tsx
import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { signInWithEmail } from '../services/auth';

type LoginProps = {
  onForgotPassword?: () => void;
};

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { startRegistration } = useAppContext();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);

  // If a session already exists, let the user know
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAlreadySignedIn(!!user);
      if (user) setStatus('You are already signed in.');
    })();
  }, []);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus('Sending magic link…');
    try {
      await signInWithEmail(email.trim());
      setStatus('Magic link sent. Open the email on this device to finish signing in.');
    } catch (err: any) {
      console.error(err);
      setStatus(err?.message ?? 'Failed to send link.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">CreatorsOnly</h1>
          <p className="mt-2 text-text-secondary">A community for Creators</p>
        </div>

        <form className="space-y-6" onSubmit={handleSendLink}>
          <div className="rounded-md shadow-sm">
            <input
              id="email-login"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {onForgotPassword && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={onForgotPassword}
                className="font-medium text-text-secondary hover:text-primary"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {status && <p className="text-sm text-center opacity-80">{status}</p>}

          <div>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              {sending ? 'Sending…' : alreadySignedIn ? 'Resend Magic Link' : 'Send Magic Link'}
            </button>
          </div>
        </form>

        <div className="text-xs text-center opacity-60">
          Tip: The email link will bring you back and sign you in automatically.
        </div>

        <div className="text-sm text-center">
          <span
            onClick={startRegistration}
            className="font-medium text-text-secondary hover:text-primary cursor-pointer"
          >
            Don&apos;t have an account? Create one
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
