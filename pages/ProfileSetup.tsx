// src/pages/ProfileSetup.tsx
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';

// -------- Error Boundary (prevents black screen) ----------
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { err: undefined };
  }
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: any) {
    // Still render a visible message instead of a black screen.
    console.error('Create Account crashed:', err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm opacity-80">
              The Create Account screen hit a runtime error but we caught it so your app won’t
              go black. Check the browser console for details.
            </p>
            <pre className="mt-4 text-xs overflow-auto max-h-56 p-3 rounded bg-muted/30">
              {String(this.state.err?.message || this.state.err)}
            </pre>
            <button
              className="mt-6 w-full py-3 rounded-xl font-semibold bg-primary text-white"
              onClick={() => (window.location.href = '/')}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
// ---------------------------------------------------------

type CreatorRole = 'Model' | 'Photographer' | 'Videographer';
const ROLE_OPTIONS: CreatorRole[] = ['Model', 'Photographer', 'Videographer'];

const STATES: { code: string; name: string }[] = [
  { code: 'CA', name: 'California' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
];

const COUNTIES_BY_STATE: Record<string, string[]> = {
  CA: ['Los Angeles County', 'Orange County', 'San Diego County', 'Riverside County', 'San Bernardino County'],
  AZ: ['Maricopa County', 'Pima County', 'Pinal County'],
  NV: ['Clark County', 'Washoe County'],
  NY: ['New York County', 'Kings County', 'Queens County'],
  TX: ['Harris County', 'Dallas County', 'Tarrant County', 'Travis County'],
};

const MAX_BIO = 150;

const cls = {
  chipBase: 'px-3 py-1 rounded-full text-sm border transition select-none',
  chipOn: 'px-3 py-1 rounded-full text-sm border transition select-none bg-primary text-white border-primary',
  chipOff:
    'px-3 py-1 rounded-full text-sm border transition select-none bg-transparent text-foreground/80 border-border hover:bg-accent/20',
  input:
    'w-full bg-muted/20 text-foreground placeholder-foreground/50 rounded-md px-3 py-2 outline-none border border-border focus:border-primary focus:ring-2 focus:ring-primary/30',
  label: 'block text-sm text-foreground/80 mb-1',
  card: 'w-full max-w-xl mx-auto bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6 md:p-8',
  h1: 'text-2xl md:text-3xl font-semibold text-foreground mb-2 text-center',
  h2: 'text-sm text-foreground/70 text-center mb-6',
  btnPrimary: 'w-full py-3 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white disabled:opacity-60',
  back: 'block text-center mt-4 text-sm text-foreground/70 hover:text-foreground',
};

const ProfileSetup: React.FC = () => {
  // HARD GUARDS: if context isn’t ready, keep working without it (no crash).
  let ctx: any = {};
  try {
    ctx = useAppContext() || {};
  } catch {
    ctx = {};
  }
  const startRegistration: undefined | ((p: any) => Promise<boolean> | boolean) = ctx.startRegistration;
  const setPage: undefined | ((p: string) => void) = ctx.setPage;

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
  const toggleRole = (role: CreatorRole) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

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

    try {
      setSubmitting(true);
      if (typeof startRegistration === 'function') {
        const ok = await Promise.resolve(startRegistration(payload));
        if (!ok) throw new Error('Could not create your account. Please try again.');
      } else {
        // If context isn’t wired yet, don’t crash—simulate success so UI flows.
        console.warn('startRegistration not available; simulating success.', payload);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setSubmitting(false);
      return;
    }
  };

  const backToLogin = () => {
    if (typeof setPage === 'function') setPage('login');
    else window.location.assign('/'); // safest fallback
  };

  return (
    <PageErrorBoundary>
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <form onSubmit={onSubmit} className={cls.card} aria-labelledby="create-title">
          <h1 id="create-title" className={cls.h1}>Create Your Account</h1>
          <p className={cls.h2}>Join the community for creators.</p>

          <label className={cls.label} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Your unique @username"
            className={cls.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="mt-4">
            <label className={cls.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Choose a secure password"
              className={cls.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className={cls.label} htmlFor="displayName">Name</label>
            <input
              id="displayName"
              type="text"
              placeholder="Your display name"
              className={cls.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className={cls.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={cls.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <p className="text-sm text-foreground/80">What kind of creator are you?</p>
            <p className="text-xs text-foreground/60">Select all that apply.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {ROLE_OPTIONS.map((role) => {
                const on = roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    className={on ? cls.chipOn : cls.chipOff}
                    onClick={() => toggleRole(role)}
                    aria-pressed={on}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-foreground/80">Location (Recommended)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className={cls.label} htmlFor="state">State</label>
                <select
                  id="state"
                  className={cls.input}
                  value={stateCode}
                  onChange={(e) => {
                    setStateCode(e.target.value);
                    setCounty('');
                  }}
                >
                  <option value="">Select State</option>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={cls.label} htmlFor="county">County</label>
                <select
                  id="county"
                  className={cls.input}
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  disabled={!stateCode}
                >
                  <option value="">{stateCode ? 'Select County' : 'Select State first'}</option>
                  {(COUNTIES_BY_STATE[stateCode] ?? []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className={cls.label} htmlFor="bio">Bio (Recommended)</label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Tell us about yourself..."
              className={cls.input + ' resize-none'}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            />
            <div className="flex justify-end text-xs text-foreground/60 mt-1">
              {bio.length}/{MAX_BIO}
            </div>
          </div>

          {error && <div className="text-red-500 text-sm mt-2" role="alert">{error}</div>}

          <button type="submit" className={cls.btnPrimary + ' mt-6'} disabled={submitting}>
            {submitting ? 'Creating your account…' : 'Complete Setup & Join'}
          </button>

          <button type="button" onClick={backToLogin} className={cls.back}>
            Back to Login
          </button>
        </form>
      </div>
    </PageErrorBoundary>
  );
};

export default ProfileSetup;
