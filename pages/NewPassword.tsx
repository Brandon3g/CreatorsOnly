// pages/NewPassword.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NewPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Supabase injects a session in the URL hash after reset link is clicked
    // This ensures the user is authenticated temporarily to update their password
    const { data: { session }, error } = supabase.auth.getSession();
    if (error) {
      console.error('Session error:', error);
    }
    if (!session) {
      setError('Invalid or expired reset link. Please request a new one.');
    }
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-primary text-center">Set New Password</h1>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && <p className="text-green-600 text-center">{success}</p>}

        {!success && (
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
              className="w-full flex justify-center py-3 px-4 rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewPassword;
