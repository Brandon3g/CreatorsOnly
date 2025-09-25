// src/pages/SignUp.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS, CREATOR_TYPES, US_STATES, COUNTIES_BY_STATE } from '../constants';
import { trackEvent } from '../services/analytics';

type CreatorType = string;

const BIO_LIMIT = 150;

const SignUp: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [county, setCounty] = useState('');
  const [types, setTypes] = useState<CreatorType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Counties for selected state
  const countyOptions = useMemo<string[]>(
    () => (stateCode ? (COUNTIES_BY_STATE[stateCode] || []) : []),
    [stateCode]
  );

  useEffect(() => {
    // reset county when state changes
    setCounty('');
  }, [stateCode]);

  const toggleType = (t: CreatorType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwdValid = password.length >= 8;
  const nameValid = name.trim().length >= 2;
  const formValid = usernameValid && emailValid && pwdValid && nameValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || submitting) return;

    setSubmitting(true);
    setMsg(null);

    try {
      // Create account and attach public user metadata we’ll read into the profile
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name,
            bio,
            creator_types: types,
            location_state: stateCode || null,
            location_county: county || null,
          },
        },
      });

      if (error) throw error;

      // Analytics
      trackEvent('signup_success', {
        method: 'email_password',
        userId: data.user?.id ?? 'n/a',
      });

      // If your project requires email confirmation, Supabase may return no session.
      // Either way, route into the app; the shell will link/finish profile.
      setMsg({
        type: 'success',
        text:
          data.session
            ? 'Account created! Redirecting…'
            : 'Account created. Check your email to confirm, then sign in.',
      });

      // Small delay to show success then move to feed or login
      setTimeout(() => {
        if (data.session) {
          // user is logged in right away
          window.location.hash = '#/Feed';
        } else {
          window.location.hash = '#/Login';
        }
      }, 700);
    } catch (err: any) {
      console.error('[SignUp] error', err);
      trackEvent('signup_error', { message: String(err?.message || err) });
      setMsg({ type: 'error', text: err?.message || 'Failed to create account.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md bg-surface rounded-2xl border border-surface-light p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              {ICONS.camera}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-center text-primary">
            Create Your Account
          </h1>
          <p className="text-center text-text-secondary mt-2">
            Join the community for creators.
          </p>
        </div>

        {/* Alerts */}
        {msg && (
          <div
            className={`mb-4 text-sm rounded-md px-3 py-2 border ${
              msg.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="username"
              placeholder="Your unique @username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-text-secondary">
              3–20 letters, digits, or underscores. Shown as <span className="opacity-80">@{username || 'username'}</span>
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Choose a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-light p-3 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                onPointerUp={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPwd ? ICONS.eyeOff ?? ICONS.close : ICONS.eye ?? ICONS.camera}
              </button>
            </div>
            <p className="mt-1 text-xs text-text-secondary">At least 8 characters.</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Creator Types */}
          <div>
            <label className="block text-sm font-medium">What kind of creator are you?</label>
            <p className="text-xs text-text-secondary mb-2">Select all that apply.</p>
            <div className="flex flex-wrap gap-2">
              {(CREATOR_TYPES?.length ? CREATOR_TYPES : ['Model', 'Photographer', 'Videographer']).map(
                (t) => {
                  const active = types.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onPointerUp={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-full border text-sm ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-light text-text-primary border-surface-light hover:bg-surface'
                      }`}
                    >
                      {t}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium">Location (Recommended)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select State</option>
                {(US_STATES?.length ? US_STATES : []).map((s: any) =>
                  typeof s === 'string' ? (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ) : (
                    <option key={s.code || s.value} value={s.code || s.value}>
                      {s.name || s.label}
                    </option>
                  )
                )}
              </select>

              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={!stateCode || countyOptions.length === 0}
                className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">{stateCode ? 'Select County' : 'Select State first'}</option>
                {countyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium">Bio (Recommended)</label>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_LIMIT))}
                placeholder="Tell us about yourself..."
                className="w-full h-28 bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="absolute bottom-2 right-3 text-xs text-text-secondary">
                {bio.length}/{BIO_LIMIT}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!formValid || submitting}
            className="w-full rounded-full bg-primary text-white font-bold py-3 disabled:opacity-50 hover:bg-primary-hover mt-2"
          >
            {submitting ? 'Creating…' : 'Complete Setup & Join'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            className="text-text-secondary hover:text-text-primary"
            onPointerUp={() => {
              window.location.hash = '#/Login';
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
