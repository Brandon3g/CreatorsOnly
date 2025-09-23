// src/context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { subscribeToTable } from '../services/realtime'; // the lightweight channel helper we added earlier

// --- Types you can adjust to match your DB schema ---
export type RTProfile = {
  id: string;
  display_name: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
};

export type RTPost = {
  id: string;
  user_id: string;
  content?: string | null;
  media_url?: string | null;
  created_at?: string | null;
  // optional: likes/comments if your table has them
  likes?: number | null;
};

export type RTFriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string | null;
  updated_at?: string | null;
};

// --- Context shape ---
type RealtimeState = {
  profiles: RTProfile[];
  posts: RTPost[];
  requests: RTFriendRequest[];

  isLoadingProfiles: boolean;
  isLoadingPosts: boolean;
  isLoadingRequests: boolean;

  // simple refresh function if a consumer wants to force reload
  refetchAll: () => Promise<void>;
};

const RealtimeContext = createContext<RealtimeState | undefined>(undefined);

// --- Initial fetchers ---
async function fetchProfiles(): Promise<RTProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RTProfile[];
}

async function fetchPosts(): Promise<RTPost[]> {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RTPost[];
}

async function fetchRequests(): Promise<RTFriendRequest[]> {
  const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RTFriendRequest[];
}

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<RTProfile[]>([]);
  const [posts, setPosts] = useState<RTPost[]>([]);
  const [requests, setRequests] = useState<RTFriendRequest[]>([]);

  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // One place to refetch everything (used on init and from subscriptions)
  const refetchAll = async () => {
    try {
      setIsLoadingProfiles(true);
      setIsLoadingPosts(true);
      setIsLoadingRequests(true);

      const [pRes, poRes, rRes] = await Promise.all([
        fetchProfiles(),
        fetchPosts(),
        fetchRequests(),
      ]);

      setProfiles(pRes);
      setPosts(poRes);
      setRequests(rRes);
    } finally {
      setIsLoadingProfiles(false);
      setIsLoadingPosts(false);
      setIsLoadingRequests(false);
    }
  };

  // Initial load
  useEffect(() => {
    refetchAll().catch((e) => console.error('[RealtimeProvider] initial load failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscriptions: whenever any table changes, refetch ONLY that table for snappy updates
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // profiles
    unsubs.push(
      subscribeToTable('profiles', async () => {
        try {
          setIsLoadingProfiles(true);
          setProfiles(await fetchProfiles());
        } catch (e) {
          console.error('[RealtimeProvider] profiles refresh failed', e);
        } finally {
          setIsLoadingProfiles(false);
        }
      })
    );

    // posts
    unsubs.push(
      subscribeToTable('posts', async () => {
        try {
          setIsLoadingPosts(true);
          setPosts(await fetchPosts());
        } catch (e) {
          console.error('[RealtimeProvider] posts refresh failed', e);
        } finally {
          setIsLoadingPosts(false);
        }
      })
    );

    // friend requests
    unsubs.push(
      subscribeToTable('requests', async () => {
        try {
          setIsLoadingRequests(true);
          setRequests(await fetchRequests());
        } catch (e) {
          console.error('[RealtimeProvider] requests refresh failed', e);
        } finally {
          setIsLoadingRequests(false);
        }
      })
    );

    return () => {
      for (const u of unsubs) {
        try {
          u();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const value: RealtimeState = useMemo(
    () => ({
      profiles,
      posts,
      requests,
      isLoadingProfiles,
      isLoadingPosts,
      isLoadingRequests,
      refetchAll,
    }),
    [profiles, posts, requests, isLoadingProfiles, isLoadingPosts, isLoadingRequests]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export function useRealtimeContext(): RealtimeState {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return ctx;
}
