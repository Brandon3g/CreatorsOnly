// pages/ResetPasswordSent.tsx
import React from 'react';

interface ResetPasswordSentProps {
  email: string;
  onBackToLogin: () => void;
}

const ResetPasswordSent: React.FC<ResetPasswordSentProps> = ({
  email,
  onBackToLogin,
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg text-center">
        <h1 className="text-3xl font-bold text-primary">Check Your Email</h1>
        <p className="text-text-secondary">
          If an account exists for{' '}
          <strong className="text-text-primary">{email}</strong>, you’ll get an
          email with instructions to reset your password. <br />
          Be sure to check your spam or junk folder if you don’t see it within a
          few minutes.
        </p>

        <div>
          <button
            type="button"
            onClick={onBackToLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordSent;
