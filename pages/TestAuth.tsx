// pages/TestAuth.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { signInWithEmail, signOut } from '../services/auth';
import { getMyProfile, upsertMyProfile } from '../services/profile';

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Parse tokens when we land on this page (handles the double-hash case)
  useEffect(() => {
    (async () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || ''; // e.g. "#/test-auth#access_token=...&refresh_token=..."
        const pieces = hash.split('#');
        // Look for the last fragment (after the second '#') which contains the tokens
        const maybeParams = pieces.length > 1 ? pieces[pieces.length - 1] : '';
        const hasTokens =
          maybeParams.includes('access_token=') && maybeParams.includes('refresh_token=');

        if (hasTokens) {
          const params = new URLSearchParams(maybeParams);
          const access_token = params.get('access_token') || undefined;
          const refresh_token = params.get('refresh_token') || undefined;

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              console.error('setSession error:', error);
              setStatus('Failed to set session');
            } else {
              setStatus('Signed in');
            }
          }

          // Clean the URL (remove tokens) but keep us on #/test-auth
          window.history.replaceState({}, '', `${window.location.origin}/#/test-auth`);
        }
      }

      // After any token handling, read the current user
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setStatus(user ? 'Signed in' : 'Signed out');
      if (user) {
        const p = await getMyProfile();
        setProfile(p);
      }
    })();

    // Keep userId/profile in sync with auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserId(session?.user?.id ?? null);
      setStatus(session?.user ? 'Signed in' : 'Signed out');
      if (session?.user) {
        const p = await getMyProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    setStatus('Sending magic link…');
    await signInWithEmail(email);
    setStatus('Magic link sent. Check this device’s email.');
  }

  async function handleLoad() {
    setStatus('Loading profile…');
    const p = await getMyProfile();
    setProfile(p);
    setStatus('Loaded');
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setStatus('Saving…');
    const updated = await upsertMyProfile({
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      avatar_url: profile.avatar_url ?? '',
    });
    setProfile(updated);
    setSaving(false);
    setStatus('Saved!');
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Test Auth & Profile</h1>
      <div className="text-sm opacity-80">Status: {status}</div>

      {!userId && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="border rounded px-3 py-2 flex-1"
          />
          <button onClick={handleLogin} className="px-4 py-2 rounded bg-blue-600 text-white">
            Send Magic Link
          </button>
        </div>
      )}

      {userId && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">User ID: {userId}</div>

          <div className="space-x-2">
            <button onClick={handleLoad} className="px-3 py-2 rounded bg-gray-700 text-white">
              Load My Profile
            </button>
            <button onClick={async () => { await signOut(); }} className="px-3 py-2 rounded bg-red-600 text-white">
              Sign Out
            </button>
          </div>

          {profile && (
            <div className="space-y-2 border rounded p-3">
              <label className="block text-sm">Display Name</label>
              <input
                className="border rounded px-3 py-2 w-full"
                value={profile.display_name ?? ''}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              />
              <label className="block text-sm mt-3">Bio</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                rows={3}
                value={profile.bio ?? ''}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
              />
              <button disabled={saving} onClick={handleSave} className="mt-3 px-4 py-2 rounded bg-green-600 text-white">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
