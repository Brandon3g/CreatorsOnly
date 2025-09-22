import { supabase } from '../lib/supabaseClient';

// Sign in with magic link
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user (from session)
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}
