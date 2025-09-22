// src/services/auth.ts
import { supabase } from '../lib/supabaseClient';

/**
 * Builds a redirect URL for Supabase magic links.
 * We send users back to the TestAuth page so the session
 * can be detected and stored by the client.
 */
function buildRedirectUrl() {
  // In Vercel/production this will be your deployed origin.
  // In local dev it will be http://localhost:5173 (or similar).
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/#/test-auth`;
}

/** Sign in via email magic link */
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: buildRedirectUrl(),
      // If you later enable email verification, you can also add:
      // shouldCreateUser: true
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
