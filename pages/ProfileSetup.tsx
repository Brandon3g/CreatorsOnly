// pages/ProfileSetup.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { US_COUNTIES_BY_STATE } from '../data/locations';

const ProfileSetup: React.FC = () => {
  const { registerAndSetup, cancelRegistration } = useAppContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // required in this mock flow
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [error, setError] = useState('');

  const BIO_LIMIT = 150;
  const availableTags = ['Model', 'Photographer', 'Videographer'];

  const states = Object.keys(US_COUNTIES_BY_STATE);
  const counties = selectedState ? US_COUNTIES_BY_STATE[selectedState] : [];

  useEffect(() => {
    // Always start at the top on this page (helps Safari/iOS too)
    window.scrollTo(0, 0);
  }, []);

  const handleTagToggle = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    setSelectedCounty('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const ok = registerAndSetup({
      username,
      password,
      name,
      email,
      bio,
      tags,
      state: selectedState,
      county: selectedCounty,
      // customLink omitted here; add if you decide to collect it
    });

    if (!ok) {
      setError('This username is already taken. Please choose another.');
    }
  };

  const inputCls =
    'mt-1 block w-full px-3 py-3 rounded-md border border-surface-light bg-surface-light ' +
    'placeholder-text-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary ' +
    'appearance-none';

  const selectCls =
    'w-full px-3 py-3 rounded-md border border-surface-light bg-surface-light text-text-primary ' +
    'focus:outline-none focus:ring-2 focus:ring-primary appearance-none disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-center min-h-screen bg-background safe-pads">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-surface rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Create Your Account</h1>
          <p className="mt-2 text-text-secondary">Join the community for creators.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Top fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm text-text-secondary mb-1">
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={inputCls}
                placeholder="yourhandle"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-text-secondary mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={inputCls}
                placeholder="Choose a secure password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm text-text-secondary mb-1">
                Display Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={inputCls}
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-text-secondary mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputCls}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Tag picker */}
          <div>
            <label className="block text-sm text-text-secondary">What kind of creator are you?</label>
            <p className="text-xs text-text-secondary mt-1">Select all that apply.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={
                      'px-4 py-2 rounded-full text-sm font-semibold transition-colors ' +
                      (selected
                        ? 'bg-primary text-white'
                        : 'bg-surface-light text-text-primary border border-surface-light hover:bg-surface')
                    }
                    aria-pressed={selected}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm text-text-secondary">Location (Recommended)</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={handleStateChange}
                  className={selectCls}
                >
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  id="county-select"
                  value={selectedCounty}
                  onChange={e => setSelectedCounty(e.target.value)}
                  disabled={!selectedState}
                  className={selectCls}
                >
                  <option value="">Select County</option>
                  {counties.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="relative">
            <label htmlFor="bio" className="block text-sm text-text-secondary mb-1">
              Bio (Recommended)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              className={
                'block w-full px-3 py-3 rounded-md border border-surface-light bg-surface-light ' +
                'placeholder-text-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none'
              }
              placeholder="Tell us about yourself…"
              value={bio}
              onChange={e => {
                if (e.target.value.length <= BIO_LIMIT) setBio(e.target.value);
              }}
            />
            <span className="absolute bottom-2 right-2 text-xs text-text-secondary">
              {bio.length}/{BIO_LIMIT}
            </span>
          </div>

          {error && <p className="text-sm text-accent-red text-center">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={cancelRegistration}
              className="px-5 py-3 rounded-full border border-surface-light text-text-secondary hover:bg-surface-light"
            >
              Back to Login
            </button>
            <button
              type="submit"
              disabled={!username || !password || !name || !email || tags.length === 0}
              className="px-5 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Setup &amp; Join
            </button>
          </div>
        </form>

        <p className="text-xs text-text-secondary text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;
