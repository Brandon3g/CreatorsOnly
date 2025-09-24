// pages/NewPassword.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NewPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        setError('There was a problem validating your reset link. Please try again.');
        return;
      }
      if (!data?.session) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    })();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Your password has been updated. You can now log in.');
    }
  };

  const goToLogin = () => { window.location.hash = '#/Login'; };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-primary text-center">Set New Password</h1>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && (
          <div className="text-center">
            <p className="text-green-600 mb-4">{success}</p>
            <button
              type="button"
              onClick={goToLogin}
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Back to Login
            </button>
          </div>
        )}

        {!success && !error && (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-text-primary">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Update Password
            </button>
          </form>
        )}

        {!success && error && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => { window.location.hash = '#/ForgotPassword'; }}
              className="w-full py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Request New Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewPassword;
