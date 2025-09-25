// src/context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MyProfile } from '../services/profile';
import type { Post } from '../services/posts';
import type { FriendRequest } from '../services/friendRequests';

type RealtimeContextType = {
  profiles: MyProfile[];
  posts: Post[];
  requests: FriendRequest[];
  user: any | null;
  isLoadingProfiles: boolean;
  isLoadingPosts: boolean;
  isLoadingRequests: boolean;
};

const RealtimeContext = createContext<RealtimeContextType>({
  profiles: [],
  posts: [],
  requests: [],
  user: null,
  isLoadingProfiles: true,
  isLoadingPosts: true,
  isLoadingRequests: true,
});

const DEBUG = localStorage.getItem('DEBUG_REALTIME') === '1';
const DISABLE_REALTIME = localStorage.getItem('CO_DISABLE_REALTIME') === '1';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<MyProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [user, setUser] = useState<any | null>(null);

  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const booted = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refetchTimer = useRef<number | null>(null);

  // Debounced table refetch to avoid thrashing
  const scheduleRefetch = (table: 'profiles' | 'posts' | 'requests') => {
    if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(async () => {
      try {
        if (table === 'profiles') {
          const { data } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(200);
          if (data) setProfiles(data as any);
        } else if (table === 'posts') {
          const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(200);
          if (data) setPosts(data as any);
        } else {
          const { data } = await supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(200);
          if (data) setRequests(data as any);
        }
      } catch (_) {
        // swallow — we don’t want loops
      }
    }, 300);
  };

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    let cancelled = false;

    (async () => {
      // 1) Session
      const { data: sess } = await supabase.auth.getSession();
      if (!cancelled) setUser(sess?.session?.user ?? null);
      const { data: authSub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!cancelled) setUser(s?.user ?? null);
      });

      // 2) Initial fetches (once)
      try {
        const [p1, p2, p3] = await Promise.allSettled([
          supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(200),
          supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(200),
        ]);

        if (!cancelled) {
          if (p1.status === 'fulfilled' && p1.value.data) setProfiles(p1.value.data as any);
          if (p2.status === 'fulfilled' && p2.value.data) setPosts(p2.value.data as any);
          if (p3.status === 'fulfilled' && p3.value.data) setRequests(p3.value.data as any);

          // Always clear loading flags so the UI can render even if fetch failed
          setIsLoadingProfiles(false);
          setIsLoadingPosts(false);
          setIsLoadingRequests(false);
        }
      } catch (err) {
        if (DEBUG) console.warn('[Realtime] initial fetch failed:', err);
        if (!cancelled) {
          setIsLoadingProfiles(false);
          setIsLoadingPosts(false);
          setIsLoadingRequests(false);
        }
      }

      // 3) Realtime (guarded + debounced)
      if (!DISABLE_REALTIME && !cancelled) {
        const ch = supabase.channel('co_realtime');
        channelRef.current = ch;

        ch.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => scheduleRefetch('profiles')
        )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'posts' },
            () => scheduleRefetch('posts')
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'requests' },
            () => scheduleRefetch('requests')
          )
          .subscribe((status) => {
            if (DEBUG) console.debug('[Realtime] channel status:', status);
          });
      }

      // Cleanup
      return () => {
        cancelled = true;
        authSub?.subscription?.unsubscribe();
        if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
        if (channelRef.current) channelRef.current.unsubscribe();
        channelRef.current = null;
      };
    })();
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        profiles,
        posts,
        requests,
        user,
        isLoadingProfiles,
        isLoadingPosts,
        isLoadingRequests,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}
