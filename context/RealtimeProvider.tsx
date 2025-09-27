// src/context/RealtimeProvider.tsx
// Tiny context that reports whether Realtime is "connected" (subscribed).
// Pages/components can use subscribeToAppRealtime for their own listeners;
// this provider only exposes a boolean and the current userId for convenience.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { subscribeToAppRealtime } from '../services/realtime';

type Ctx = {
  userId: string | null;
  connected: boolean;
};

const RealtimeCtx = createContext<Ctx>({ userId: null, connected: false });

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Track auth state => user id
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  // Keep a lightweight global subscription so we can say "connected"
  useEffect(() => {
    // We only need to know that the socket is up; no heavy handlers here.
    const off = subscribeToAppRealtime(userId ?? null, {
      profiles: {
        onAny: () => {
          // Any event means the channel is alive
          setConnected(true);
        },
      },
    });

    return off; // IMPORTANT: returns a function
  }, [userId]);

  const value = useMemo<Ctx>(() => ({ userId, connected }), [userId, connected]);

  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>;
};

export function useRealtimeContext() {
  return useContext(RealtimeCtx);
}
