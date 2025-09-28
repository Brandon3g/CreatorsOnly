// src/services/friendRequests.ts
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { FriendRequest, FriendRequestStatus } from '../types';
import { subscribeToTable } from './realtime';

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
}

function rowToFriendRequest(row: any): FriendRequest {
  return {
    id: row.id,
    fromUserId: row.sender_id,
    toUserId: row.receiver_id,
    status: row.status as FriendRequestStatus,
    timestamp: row.created_at ?? new Date().toISOString(),
  };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(receiverId: string): Promise<FriendRequest> {
  requireSupabase();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const payload = {
    sender_id: user.id,
    receiver_id: receiverId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('friend_requests')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return rowToFriendRequest(data);
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(id: string): Promise<FriendRequest> {
  requireSupabase();
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToFriendRequest(data);
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(id: string): Promise<FriendRequest> {
  requireSupabase();
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToFriendRequest(data);
}

export async function cancelFriendRequest(id: string): Promise<void> {
  requireSupabase();
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Get all friend requests for the current user (sent + received)
 */
export async function getMyFriendRequests(): Promise<FriendRequest[]> {
  requireSupabase();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToFriendRequest);
}

/**
 * Subscribe to realtime friend request changes
 *
 * @param onChange - callback fired when requests are inserted/updated/deleted
 * @returns cleanup function to unsubscribe
 */
export function subscribeToFriendRequests(onChange: (payload: any) => void) {
  if (!isSupabaseConfigured) {
    console.warn('[FriendRequests] Realtime subscription skipped: Supabase not configured.');
    return () => {};
  }
  return subscribeToTable({ table: 'friend_requests', event: '*' }, { onAny: onChange });
}
