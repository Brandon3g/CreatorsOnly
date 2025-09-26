// context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

type RealtimeCtx = {
  // simple event fan-out you can listen to from pages if desired
  onPostChange?: (e: any) => void;
  onProfileChange?: (e: any) => void;
};

const Ctx = createContext<RealtimeCtx>({});
export const useRealtimeContext = () => useContext(Ctx);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // keep stable refs so callbacks don’t re-subscribe
  const onPostChangeRef = useRef<(e: any) => void>();
  const onProfileChangeRef = useRef<(e: any) => void>();

  useEffect(() => {
    let isMounted = true;

    // subscribe only after we have a valid session (auth token)
    const boot = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!isMounted) return;

      const token = sessionData?.session?.access_token;
      if (!token) {
        console.warn('[Realtime] no auth session; skipping Realtime subscribe');
        return;
      }

      // One compact channel for DB changes we care about
      const channel = supabase.channel('co-db', {
        config: { broadcast: { self: false } },
      });

      channel.on('postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          console.log('[Realtime] posts change', payload);
          onPostChangeRef.current?.(payload);
        }
      );

      channel.on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Realtime] profiles change', payload);
          onProfileChangeRef.current?.(payload);
        }
      );

      channel.subscribe((status) => {
        console.log('[Realtime] channel status:', status);
      });
      
      // clean up
      return () => {
        supabase.removeChannel(channel);
      };
    };

    const unsubAuth = supabase.auth.onAuthStateChange((_ev, _session) => {
      // do nothing here; we only subscribe once on mount
    });

    boot();

    return () => {
      isMounted = false;
      unsubAuth.data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<RealtimeCtx>(() => ({
    onPostChange: (cb) => { onPostChangeRef.current = cb; },
    onProfileChange: (cb) => { onProfileChangeRef.current = cb; },
  // @ts-expect-error: we’re intentionally exposing setters as functions
  }), []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export default RealtimeProvider;
