// services/auth.ts
import { supabase } from '../lib/supabaseClient';

const REDIRECT_PATH = '/#/test-auth';

/**
 * Build the URL Supabase should redirect back to after the magic-link is clicked.
 * Uses the current origin so it works in both local dev and production.
 */
function buildRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${REDIRECT_PATH}`;
}

/** Sign in via email magic link */
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: buildRedirectUrl(),
      // shouldCreateUser: true, // uncomment if you want Supabase to auto-create users
    },
  });
  if (error) throw error;
  return data;
}

/** Sign out the current user */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get the current user from the active session (if any) */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}
