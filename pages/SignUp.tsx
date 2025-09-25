// src/pages/SignUp.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as CONST from '../constants';
import { trackEvent } from '../services/analytics';

type CreatorType = string;

const BIO_LIMIT = 150;

/** Icons from your constants */
const ICONS = CONST.ICONS;

/** Creator types: use repo constant if present, else fallbacks */
const DEFAULT_CREATOR_TYPES: string[] = ['Model', 'Photographer', 'Videographer'];
const CREATOR_TYPES_LIST =
  Array.isArray((CONST as any).CREATOR_TYPES) && (CONST as any).CREATOR_TYPES.length
    ? ((CONST as any).CREATOR_TYPES as string[])
    : DEFAULT_CREATOR_TYPES;

/** Canonical 50 states + DC with USPS codes (we always use codes to match county data) */
const US_STATES_LIST: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

/** FIPS ↔ USPS code mapping for Census responses */
const STATE_ABBR_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
};
const FIPS_BY_STATE_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBR_BY_FIPS).map(([fips, abbr]) => [abbr, fips])
);

/** Small local fallback so the selector still works without network (CA only) */
const LOCAL_FALLBACK_COUNTIES: Record<string, string[]> = {
  CA: [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte',
    'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake',
    'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc',
    'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange', 'Placer', 'Plumas', 'Riverside',
    'Sacramento', 'San Benito', 'San Bernardino', 'San Diego', 'San Francisco', 'San Joaquin',
    'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta',
    'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity',
    'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
  ],
};

/** Robust per-state Census fetch with multiple dataset fallbacks */
async function fetchCountiesForState(abbr: string, signal?: AbortSignal): Promise<string[]> {
  const fips = FIPS_BY_STATE_ABBR[abbr];
  if (!fips) return [];

  // Preferred -> fallback datasets (all expose NAME, state + county)
  const SOURCES = [
    '2023/pep/population',
    '2022/pep/population',
    '2021/pep/population',
    '2020/pep/population',
    '2019/pep/population',
    '2019/acs/acs5',
  ];

  // try each dataset until success
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

  // final fallback (offline seed for CA)
  return LOCAL_FALLBACK_COUNTIES[abbr] ?? [];
}

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

  // cache counties per state and track loading/errors per state
  const [countiesCache, setCountiesCache] = useState<Record<string, string[]>>(
    LOCAL_FALLBACK_COUNTIES
  );
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [countyError, setCountyError] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Reset county when state changes and kick off fetch if needed
  useEffect(() => {
    setCounty('');
    setCountyError(null);

    if (!stateCode) return;

    // already cached?
    if (countiesCache[stateCode]?.length) return;

    // cancel in-flight request
    fetchAbortRef.current?.abort();

    const ac = new AbortController();
    fetchAbortRef.current = ac;

    setLoadingState(stateCode);
    fetchCountiesForState(stateCode, ac.signal)
      .then((list) => {
        setCountiesCache((prev) => ({ ...prev, [stateCode]: list }));
        if (!list.length) {
          setCountyError('No counties were returned for this state.');
        }
      })
      .catch(() => {
        setCountyError('Failed to load counties. Try again.');
      })
      .finally(() => {
        setLoadingState((prev) => (prev === stateCode ? null : prev));
      });

    return () => ac.abort();
  }, [stateCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const countyOptions = useMemo(
    () => (stateCode ? countiesCache[stateCode] || [] : []),
    [stateCode, countiesCache]
  );

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
              3–20 letters, digits, or underscores. Shown as{' '}
              <span className="opacity-80">@{username || 'username'}</span>
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
                {(ICONS as any).eye
                  ? (ICONS as any).eye
                  : showPwd
                  ? (ICONS as any).close
                  : (ICONS as any).camera}
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
              {CREATOR_TYPES_LIST.map((t) => {
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
              })}
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
                {US_STATES_LIST.map((s) => (
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
                className="w-full bg-surface-light p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-red-300">{countyError}</span>
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
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
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
