// src/context/RealtimeProvider.tsx
import React, { createContext, useContext, useState } from 'react';
import { useRealtime } from '../services/hooks/useRealtime'; // ✅ fixed path
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
    onAuthChange: (event, session) => setUser(session?.user ?? null),
  });

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
