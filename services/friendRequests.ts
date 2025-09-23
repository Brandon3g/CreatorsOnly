// src/services/friendRequests.ts
import { supabase } from '../lib/supabaseClient';
import { subscribeToTable } from './realtime';

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
  updated_at?: string;
};

/**
 * Send a friend request
 */
export async function sendFriendRequest(receiverId: string): Promise<FriendRequest> {
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
  return data as FriendRequest;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(id: string): Promise<FriendRequest> {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as FriendRequest;
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(id: string): Promise<FriendRequest> {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as FriendRequest;
}

/**
 * Get all friend requests for the current user (sent + received)
 */
export async function getMyFriendRequests(): Promise<FriendRequest[]> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as FriendRequest[]) || [];
}

/**
 * Subscribe to realtime friend request changes
 *
 * @param onChange - callback fired when requests are inserted/updated/deleted
 * @returns cleanup function to unsubscribe
 */
export function subscribeToFriendRequests(onChange: (payload: any) => void) {
  return subscribeToTable('friend_requests', onChange);
}
