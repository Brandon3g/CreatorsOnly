// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { ICONS } from '../constants';

type Props = {
  onSendResetLink: (email: string) => Promise<{ data?: any; error?: any }>;
  onBackToLogin: () => void;
};

const ForgotPassword: React.FC<Props> = ({ onSendResetLink, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = email.trim();
    if (!value) {
      setError('Please enter the email tied to your account.');
      return;
    }

    setSending(true);
    try {
      const { error } = await onSendResetLink(value);
      if (error) {
        // Surface a friendly message but log the raw error for debugging
        console.error('[ForgotPassword] reset error:', error);
        setError(
          error.message ??
            'We couldn’t send a reset email. Double-check the address and try again.'
        );
        return;
      }
      setSent(true);
    } catch (err: any) {
      console.error('[ForgotPassword] unexpected:', err);
      setError('Something went wrong while sending the reset link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-surface border border-surface-light rounded-2xl p-6 shadow-lg">
        <button
          type="button"
          onClick={onBackToLogin}
          className="mb-4 inline-flex items-center text-text-secondary hover:text-text-primary"
        >
          <span className="mr-2">{ICONS.arrowLeft}</span>
          Back to sign in
        </button>

        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            {ICONS.refresh}
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-2">Reset your password</h1>
        <p className="text-center text-text-secondary mb-6">
          Enter your email and we’ll send you a secure link to set a new password.
        </p>

        {sent ? (
          <div className="bg-green-900/20 border border-green-900/40 text-green-300 rounded-md p-3 text-sm mb-4">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link
            has been sent. Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-light border border-surface-light rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-md px-3 py-2" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary-hover disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {sent && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-primary hover:underline"
            >
              Return to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
