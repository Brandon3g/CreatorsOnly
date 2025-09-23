// pages/Login.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface LoginProps {
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onForgotPassword }) => {
  const { login, startRegistration } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = login(username.trim(), password);
    if (!ok) setError('Invalid username or password.');
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
          <input type="hidden" name="remember" value="true" />

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              {/* Accessible label (visually hidden) */}
              <label htmlFor="username-login" className="sr-only">
                Username
              </label>
              <input
                id="username-login"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="text"
                spellCheck={false}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
              />
            </div>
            <div>
              {/* Accessible label (visually hidden) */}
              <label htmlFor="password-login" className="sr-only">
                Password
              </label>
              <input
                id="password-login"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-surface-light bg-surface-light placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
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

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-hover"
            >
              Log In
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
