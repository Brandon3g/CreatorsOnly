// pages/SignUp.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ICONS } from '../constants';
import { trackEvent } from '../services/analytics';

type CreatorType = string;
const BIO_LIMIT = 150;

/** Creator types: local list (no dependency on constants export) */
const CREATOR_TYPES: string[] = ['Model', 'Photographer', 'Videographer'];

/** 50 states + DC (USPS codes) */
const US_STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

/** FIPS ↔ USPS mappings for Census API */
const STATE_ABBR_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
  '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
};
const FIPS_BY_STATE_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_BY_FIPS).map(([fips, abbr]) => [abbr, fips])
);

/** Minimal offline fallback so picker works without network (CA only) */
const LOCAL_FALLBACK_COUNTIES: Record<string, string[]> = {
  CA: [
    'Alameda','Alpine','Amador','Butte','Calaveras','Colusa','Contra Costa','Del Norte','El Dorado',
    'Fresno','Glenn','Humboldt','Imperial','Inyo','Kern','Kings','Lake','Lassen','Los Angeles','Madera',
    'Marin','Mariposa','Mendocino','Merced','Modoc','Mono','Monterey','Napa','Nevada','Orange','Placer',
    'Plumas','Riverside','Sacramento','San Benito','San Bernardino','San Diego','San Francisco',
    'San Joaquin','San Luis Obispo','San Mateo','Santa Barbara','Santa Clara','Santa Cruz','Shasta',
    'Sierra','Siskiyou','Solano','Sonoma','Stanislaus','Sutter','Tehama','Trinity','Tulare','Tuolumne',
    'Ventura','Yolo','Yuba',
  ],
};

/** Fetch all counties for a state via US Census (robust fallbacks across datasets) */
async function fetchCountiesForState(abbr: string, signal?: AbortSignal): Promise<string[]> {
  const fips = FIPS_BY_STATE_ABBR[abbr];
  if (!fips) return [];

  const SOURCES = [
    '2023/pep/population',
    '2022/pep/population',
    '2021/pep/population',
    '2020/pep/population',
    '2019/pep/population',
    '2019/acs/acs5',
  ];

  for (const src of SOURCES) {
    try {
      const url = `https://api.census.gov/data/${src}?get=NAME&for=county:*&in=state:${fips}`;
      const res = await fetch(url, { signal, cache: 'force-cache' });
      if (!res.ok) continue;

      const rows: string[][] = await res.json();
      if (!Array.isArray(rows) || rows.length < 2) continue;

      const header = rows[0].map((h) => h.toLowerCase());
      const nameIdx = header.indexOf('name');
      if (nameIdx === -1) continue;

      const names = rows
        .slice(1)
        .map((r) => (r[nameIdx] || '').replace(/,.*$/, '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      if (names.length) return names;
    } catch {
      // try next source
    }
  }
  return LOCAL_FALLBACK_COUNTIES[abbr] ?? [];
}

const SignUp: React.FC = () => {
  // Required fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Optional profile fields
  const [bio, setBio] = useState('');
  const [types, setTypes] = useState<CreatorType[]>([]);

  // Location
  const [stateCode, setStateCode] = useState('');
  const [county, setCounty] = useState('');

  // Counties cache and loading/error state
  const [countiesCache, setCountiesCache] = useState<Record<string, string[]>>(LOCAL_FALLBACK_COUNTIES);
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [countyError, setCountyError] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // UX flags
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Reset county & fetch when state changes
  useEffect(() => {
    setCounty('');
    setCountyError(null);
    if (!stateCode) return;

    // already cached?
    if (countiesCache[stateCode]?.length) return;

    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;
    setLoadingState(stateCode);

    fetchCountiesForState(stateCode, ac.signal)
      .then((list) => {
        setCountiesCache((prev) => ({ ...prev, [stateCode]: list }));
        if (!list.length) setCountyError('No counties were returned for this state.');
      })
      .catch(() => setCountyError('Failed to load counties. Try again.'))
      .finally(() => {
        setLoadingState((prev) => (prev === stateCode ? null : prev));
      });

    return () => ac.abort();
  }, [stateCode, countiesCache]);

  const countyOptions = useMemo(
    () => (stateCode ? countiesCache[stateCode] || [] : []),
    [stateCode, countiesCache]
  );

  const toggleType = (t: CreatorType) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  // Validation
  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwdValid = password.length >= 8;
  const nameValid = name.trim().length >= 2;
  const formValid = usernameValid && emailValid && pwdValid && nameValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      const problems = [
        !usernameValid && 'Username (3–20 letters/digits/underscore)',
        !pwdValid && 'Password (min 8 characters)',
        !nameValid && 'Name (min 2 characters)',
        !emailValid && 'Valid email',
      ]
        .filter(Boolean)
        .join(', ');
      setMsg({ type: 'error', text: `Please complete required fields: ${problems}.` });
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    setMsg(null);

    try {
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
          emailRedirectTo: `${location.origin}/#/Login?fresh=1`,
        },
      });

      if (error) throw error;

      trackEvent('signup_success', {
        method: 'email_password',
        userId: data.user?.id ?? 'n/a',
      });

      setMsg({
        type: 'success',
        text: data.session
          ? 'Account created! Redirecting…'
          : 'Account created. Check your email to confirm, then sign in.',
      });

      setTimeout(() => {
        window.location.hash = data.session ? '#/Feed' : '#/Login';
      }, 800);
    } catch (err: any) {
      console.error('[SignUp] error', err);
      const text = err?.message || 'Failed to create account.';
      trackEvent('signup_error', { message: text });
      setMsg({ type: 'error', text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-4 text-primary">
          {ICONS.camera}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2 text-center">
          Create your account
        </h1>
        <p className="text-sm text-foreground/70 text-center mb-6">
          Join the CreatorsOnly community
        </p>

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
            <label className="block text-sm text-foreground/80 mb-1">Username</label>
            <input
              type="text"
              placeholder="your_handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="3–20 characters: letters, digits, or underscores"
              aria-invalid={!usernameValid}
              className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="text-xs text-text-secondary mt-1">
              3–20 letters, digits, or underscores. Shown as <span className="opacity-80">@{username || 'username'}</span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-foreground/80 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                aria-invalid={!pwdValid}
                className="w-full bg-surface-light p-3 pr-11 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-text-secondary hover:text-text-primary"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (ICONS.close ?? ICONS.camera) : (ICONS.eye ?? ICONS.camera)}
              </button>
            </div>
            <div className="text-xs text-text-secondary mt-1">At least 8 characters.</div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-foreground/80 mb-1">Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              aria-invalid={!nameValid}
              className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-foreground/80 mb-1">Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!emailValid}
              className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Creator Types */}
          <div>
            <div className="flex items-baseline gap-2">
              <label className="block text-sm text-foreground/80">What kind of creator are you?</label>
              <span className="text-xs text-text-secondary">Select all that apply</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {CREATOR_TYPES.map((t) => {
                const active = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface-light text-text-primary border-surface-light hover:bg-surface'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-baseline gap-2">
              <label className="block text-sm text-foreground/80">Location</label>
              <span className="text-xs text-text-secondary">(Recommended)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select State</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                disabled={
                  !stateCode ||
                  loadingState === stateCode ||
                  (countiesCache[stateCode]?.length ?? 0) === 0
                }
                className="w-full bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">
                  {!stateCode
                    ? 'Select State first'
                    : loadingState === stateCode
                    ? 'Loading counties…'
                    : (countiesCache[stateCode]?.length ?? 0) > 0
                    ? 'Select County'
                    : countyError
                    ? 'No counties found'
                    : 'No counties found'}
                </option>
                {(countiesCache[stateCode] || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {countyError && stateCode && (
              <div className="mt-2 text-xs text-text-secondary">
                <span className="text-red-400">{countyError}</span>{' '}
                <button
                  type="button"
                  onPointerUp={() => {
                    // force refetch
                    setCountiesCache((prev) => {
                      const { [stateCode]: _, ...rest } = prev;
                      return rest as Record<string, string[]>;
                    });
                    setCountyError(null);
                    setStateCode(stateCode); // trigger effect again
                  }}
                  className="text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-baseline gap-2">
              <label className="block text-sm text-foreground/80">Bio</label>
              <span className="text-xs text-text-secondary">(Optional)</span>
            </div>
            <div className="relative mt-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_LIMIT))}
                placeholder="Tell us about yourself..."
                className="w-full h-28 bg-surface-light p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="absolute bottom-2 right-3 text-xs text-text-secondary">
                {bio.length}/{BIO_LIMIT}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!formValid || submitting}
            className="w-full rounded-full bg-primary text-white font-bold py-3 disabled:opacity-50 hover:bg-primary-hover mt-2"
          >
            {submitting ? 'Creating…' : 'Complete Setup & Join'}
          </button>
        </form>

        {/* Footer */}
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
