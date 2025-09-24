// pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ForgotPasswordProps {
  onSendResetLink: (email: string) => void; // App.tsx uses this to switch to the "sent" screen
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onSendResetLink,
  onBackToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setLoading(true);

    try {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://creatorzonly.com';
      const redirectTo = `${base}/#/NewPassword`;

      // This triggers the real email
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      // Log to help debugging in DevTools
      // (You can remove this after you confirm it’s working.)
      console.log('[Recover] POST /auth/v1/recover →', {
        email: email.trim(),
        redirectTo,
        error: error?.message ?? null,
      });

      if (error) {
        setErrorMsg(error.message || 'Could not send reset email. Please try again.');
        setLoading(false);
        return;
      }

      // Only advance to the "Check your email" screen if the call succeeded
      onSendResetLink(email.trim());
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-surface rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-primary text-center">Forgot Password</h1>
        <p className="text-text-secondary text-center">
          Enter your email to receive a password reset link.
        </p>

        {errorMsg && (
          <p className="text-center text-red-500 text-sm">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-surface-light text-text-primary"
              placeholder="Email address"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-primary hover:text-primary-hover"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
