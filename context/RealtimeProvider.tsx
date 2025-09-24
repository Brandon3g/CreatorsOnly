// src/context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRealtime } from '../services/hooks/useRealtime';
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

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<MyProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [user, setUser] = useState<any | null>(null);

  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const [isAuthed, setIsAuthed] = useState(false);

  // Determine auth on mount and react to changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data?.session);
      setUser(data?.session?.user ?? null);
      if (!data?.session) {
        // Signed out → keep things lightweight
        setProfiles([]);
        setPosts([]);
        setRequests([]);
        setIsLoadingProfiles(true);
        setIsLoadingPosts(true);
        setIsLoadingRequests(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setUser(session?.user ?? null);
      if (!session) {
        // Signed out → reset and avoid network spam
        setProfiles([]);
        setPosts([]);
        setRequests([]);
        setIsLoadingProfiles(true);
        setIsLoadingPosts(true);
        setIsLoadingRequests(true);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
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
      {/* Only render realtime subscriptions when authenticated.
          This avoids any network churn on Login / ForgotPassword screens. */}
      {isAuthed && (
        <RealtimeSubscriptions
          setProfiles={setProfiles}
          setPosts={setPosts}
          setRequests={setRequests}
          setIsLoadingProfiles={setIsLoadingProfiles}
          setIsLoadingPosts={setIsLoadingPosts}
          setIsLoadingRequests={setIsLoadingRequests}
          setUser={setUser}
        />
      )}
      {children}
    </RealtimeContext.Provider>
  );
}

// A small inner component that actually calls the hook.
// Rendering it conditionally is the safe way to “gate” a hook.
function RealtimeSubscriptions(props: {
  setProfiles: React.Dispatch<React.SetStateAction<MyProfile[]>>;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  setRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  setIsLoadingProfiles: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoadingPosts: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoadingRequests: React.Dispatch<React.SetStateAction<boolean>>;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
}) {
  const {
    setProfiles,
    setPosts,
    setRequests,
    setIsLoadingProfiles,
    setIsLoadingPosts,
    setIsLoadingRequests,
    setUser,
  } = props;

  useRealtime({
    refreshProfiles: (data) => {
      setProfiles(data);
      setIsLoadingProfiles(false);
    },
    refreshPosts: (data) => {
      setPosts(data);
      setIsLoadingPosts(false);
    },
    refreshFriendRequests: (data) => {
      setRequests(data);
      setIsLoadingRequests(false);
    },
    onAuthChange: (_event, session) => {
      setUser(session?.user ?? null);
    },
  });

  return null;
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

export default RealtimeProvider;
