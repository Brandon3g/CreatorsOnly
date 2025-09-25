// src/pages/ProfileSetup.tsx
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

type CreatorRole = 'Model' | 'Photographer' | 'Videographer';

const ROLE_OPTIONS: CreatorRole[] = ['Model', 'Photographer', 'Videographer'];

// Small built-in list so the County select works out of the box.
// If you later plug a full dataset, just expand this map.
const STATES: { code: string; name: string }[] = [
  { code: 'CA', name: 'California' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
];

const COUNTIES_BY_STATE: Record<string, string[]> = {
  CA: [
    'Los Angeles County',
    'Orange County',
    'San Diego County',
    'Riverside County',
    'San Bernardino County',
  ],
  AZ: ['Maricopa County', 'Pima County', 'Pinal County'],
  NV: ['Clark County', 'Washoe County'],
  NY: ['New York County', 'Kings County', 'Queens County'],
  TX: ['Harris County', 'Dallas County', 'Tarrant County', 'Travis County'],
};

const MAX_BIO = 150;

const chipBase =
  'px-3 py-1 rounded-full text-sm border transition select-none';
const chipOn =
  chipBase + ' bg-primary text-white border-primary';
const chipOff =
  chipBase + ' bg-transparent text-foreground/80 border-border hover:bg-accent/20';

const inputBase =
  'w-full bg-muted/20 text-foreground placeholder-foreground/50 rounded-md px-3 py-2 outline-none border border-border focus:border-primary focus:ring-2 focus:ring-primary/30';

const labelBase = 'block text-sm text-foreground/80 mb-1';

const cardBase =
  'w-full max-w-xl mx-auto bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6 md:p-8';

const heading =
  'text-2xl md:text-3xl font-semibold text-foreground mb-2 text-center';
const subheading =
  'text-sm text-foreground/70 text-center mb-6';

const buttonPrimary =
  'w-full py-3 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white disabled:opacity-60 disabled:cursor-not-allowed';

const backLink =
  'block text-center mt-4 text-sm text-foreground/70 hover:text-foreground';

const errorText = 'text-red-500 text-sm mt-1';
const hintText = 'text-xs text-foreground/60 mt-1';

const ProfileSetup: React.FC = () => {
  const { startRegistration, setPage } = useAppContext() as any;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<CreatorRole[]>([]);
  const [stateCode, setStateCode] = useState('');
  const [county, setCounty] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counties = useMemo(() => COUNTIES_BY_STATE[stateCode] ?? [], [stateCode]);

  const toggleRole = (role: CreatorRole) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const bioCount = `${bio.length}/${MAX_BIO}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password || !displayName.trim() || !email.trim()) {
      setError('Please fill in Username, Password, Name, and Email.');
      return;
    }
    if (bio.length > MAX_BIO) {
      setError(`Bio must be ${MAX_BIO} characters or fewer.`);
      return;
    }

    try {
      setSubmitting(true);

      // Shape a single payload your AppContext can use.
      // If your context expects different keys, adjust here.
      const payload = {
        username: username.trim().replace(/^@?/, '@'),
        password,
        name: displayName.trim(),
        email: email.trim(),
        roles,
        state: stateCode || null,
        county: county || null,
        bio: bio.trim() || null,
      };

      // startRegistration should create the user and route to feed/profile.
      const ok = await Promise.resolve(startRegistration?.(payload));

      if (!ok) {
        setError('Could not create your account. Please try again.');
        setSubmitting(false);
        return;
      }
      // Success path is handled in AppContext (e.g., it sets auth + page).
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setSubmitting(false);
    }
  };

  const goBackToLogin = () => {
    if (typeof setPage === 'function') setPage('login');
    else if (window?.history?.length) window.history.back();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className={cardBase} aria-labelledby="create-title">
        <h1 id="create-title" className={heading}>
          Create Your Account
        </h1>
        <p className={subheading}>Join the community for creators.</p>

        {/* Username */}
        <label className={labelBase} htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="Your unique @username"
          className={inputBase}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        {/* Password */}
        <div className="mt-4">
          <label className={labelBase} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a secure password"
            className={inputBase}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Name */}
        <div className="mt-4">
          <label className={labelBase} htmlFor="displayName">Name</label>
          <input
            id="displayName"
            type="text"
            placeholder="Your display name"
            className={inputBase}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="mt-4">
          <label className={labelBase} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Roles */}
        <div className="mt-6">
          <p className="text-sm text-foreground/80">What kind of creator are you?</p>
          <p className={hintText}>Select all that apply.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {ROLE_OPTIONS.map((role) => {
              const on = roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  className={on ? chipOn : chipOff}
                  onClick={() => toggleRole(role)}
                  aria-pressed={on}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div className="mt-6">
          <p className="text-sm text-foreground/80">Location (Recommended)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
              <label className={labelBase} htmlFor="state">State</label>
              <select
                id="state"
                className={inputBase}
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value);
                  setCounty('');
                }}
              >
                <option value="">Select State</option>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelBase} htmlFor="county">County</label>
              <select
                id="county"
                className={inputBase}
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={!stateCode}
              >
                <option value="">{stateCode ? 'Select County' : 'Select State first'}</option>
                {counties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label className={labelBase} htmlFor="bio">Bio (Recommended)</label>
          <textarea
            id="bio"
            rows={4}
            placeholder="Tell us about yourself..."
            className={inputBase + ' resize-none'}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          />
          <div className="flex justify-end text-xs text-foreground/60 mt-1">
            {bioCount}
          </div>
        </div>

        {error && <div className={errorText} role="alert">{error}</div>}

        <button
          type="submit"
          className={buttonPrimary + ' mt-6'}
          disabled={submitting}
        >
          {submitting ? 'Creating your account…' : 'Complete Setup & Join'}
        </button>

        <button
          type="button"
          onClick={goBackToLogin}
          className={backLink}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
