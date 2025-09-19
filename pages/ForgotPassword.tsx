import React, { useState } from 'react';

interface ForgotPasswordProps {
    onSendResetLink: (email: string) => void;
    onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSendResetLink, onBackToLogin }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSendResetLink(email);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-md p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Forgot Password</h1>
                    <p className="mt-2 text-text-secondary">
                        Enter your email to receive a password reset link.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <input
                            id="email-forgot"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
                        >
                            Send Reset Link
                        </button>
                    </div>
                </form>

                <div className="text-sm text-center">
                    <span
                        onClick={onBackToLogin}
                        className="font-medium text-text-secondary hover:text-primary cursor-pointer"
                    >
                        Back to Login
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
