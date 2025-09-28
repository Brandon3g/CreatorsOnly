// src/services/friendRequests.ts
import { supabase } from '../lib/supabaseClient';
import type { FriendRequest, FriendRequestStatus } from '../types';

type FriendRequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
};

function toFriendRequest(r: FriendRequestRow): FriendRequest {
  return {
    id: r.id,
    fromUserId: r.requester_id,
    toUserId: r.recipient_id,
    status: r.status,
    timestamp: r.created_at,
  };
}

export async function listFriendRequestsForUser(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as FriendRequestRow[]).map(toFriendRequest);
}

export async function sendFriendRequest(recipientId: string) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const requesterId = session?.user?.id;
  if (!requesterId) throw new Error('Not authenticated');
  if (requesterId === recipientId) throw new Error('Cannot send request to yourself');

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      requester_id: requesterId,
      recipient_id: recipientId,
      status: FriendRequestStatus.PENDING,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toFriendRequest(data as FriendRequestRow);
}

export async function setFriendRequestStatus(
  id: string,
  status: FriendRequestStatus,
) {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toFriendRequest(data as FriendRequestRow);
}

export async function cancelFriendRequest(id: string) {
  const { error } = await supabase.from('friend_requests').delete().eq('id', id);
  if (error) throw error;
}
