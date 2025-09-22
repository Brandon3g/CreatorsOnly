// pages/TestAuth.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { signInWithEmail, signOut as doSignOut } from '../services/auth';
import { getMyProfile, upsertMyProfile } from '../services/profile';

type EditableProfile = {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
};

function emptyProfile(): EditableProfile {
  return { display_name: '', bio: '', avatar_url: '' };
}

// Robustly handle the “double-hash” case that Supabase emails can produce
// e.g. "#/test-auth#access_token=...&refresh_token=..."
function parseTokensFromHash(hash: string) {
  const fragment = (hash || '').split('#').pop() || '';
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token') ?? undefined;
  const refresh_token = params.get('refresh_token') ?? undefined;
  return { access_token, refresh_token };
}

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        // 1) If the URL contains tokens (from the magic link), set the session
        if (typeof window !== 'undefined') {
          const { access_token, refresh_token } = parseTokensFromHash(window.location.hash);
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            setStatus('Signed in');

            // Clean the URL (remove tokens) but keep us on #/test-auth
            window.history.replaceState({}, '', `${window.location.origin}/#/test-auth`);
          }
        }

        // 2) Get current user & load profile (if exists)
        const { data: { user }, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr) throw getUserErr;

        setUserId(user?.id ?? null);
        setStatus(user ? 'Signed in' : 'Signed out');

        if (user) {
          try {
            const p = await getMyProfile();
            setProfile(p ?? emptyProfile());
          } catch (e) {
            // If profiles table/policy returns “row not found”, we’ll just show an empty form
            console.warn('getMyProfile error (ignored if row not found):', e);
            setProfile(emptyProfile());
          }
        }
      } catch (e: any) {
        console.error(e);
        setStatus(e?.message ?? 'Auth error');
      }
    })();

    // Keep user & profile in sync with auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUserId(session?.user?.id ?? null);
        setStatus(session?.user ? 'Signed in' : 'Signed out');

        if (session?.user) {
          try {
            const p = await getMyProfile();
            setProfile(p ?? emptyProfile());
          } catch (e) {
            console.warn('getMyProfile (onAuthStateChange) error:', e);
            setProfile(emptyProfile());
          }
        } else {
          setProfile(null);
        }
      } catch (e: any) {
        console.error(e);
        setStatus(e?.message ?? 'Auth state error');
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    try {
      setStatus('Sending magic link…');
      await signInWithEmail(email);
      setStatus('Magic link sent. Check this device’s email.');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message ?? 'Failed to send magic link');
    }
  }

  async function handleLoad() {
    try {
      setStatus('Loading profile…');
      const p = await getMyProfile();
      setProfile(p ?? emptyProfile());
      setStatus('Loaded');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message ?? 'Failed to load profile');
    }
  }

  async function handleSave() {
    if (!profile) return;
    try {
      setSaving(true);
      setStatus('Saving…');
      const updated = await upsertMyProfile({
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        avatar_url: profile.avatar_url ?? '',
      });
      setProfile(updated);
      setStatus('Saved!');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      setStatus('Signing out…');
      await doSignOut();
      setProfile(null);
      setStatus('Signed out');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message ?? 'Sign out failed');
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Test Auth &amp; Profile</h1>
      <div className="text-sm opacity-80">Status: {status}</div>

      {!userId && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            <button onClick={handleSignOut} className="px-3 py-2 rounded bg-red-600 text-white">
              Sign Out
            </button>
          </div>

          {profile && (
            <div className="space-y-2 border rounded p-3">
              <label className="block text-sm">Display Name</label>
              <input
                className="border rounded px-3 py-2 w-full"
                value={profile.display_name ?? ''}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              />

              <label className="block text-sm mt-3">Bio</label>
              <textarea
                className="border rounded px-3 py-2 w-full"
                rows={3}
                value={profile.bio ?? ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />

              <label className="block text-sm mt-3">Avatar URL</label>
              <input
                className="border rounded px-3 py-2 w-full"
                value={profile.avatar_url ?? ''}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
              />

              <button
                disabled={saving}
                onClick={handleSave}
                className="mt-3 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
