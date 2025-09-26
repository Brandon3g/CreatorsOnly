// context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { subscribeToAppRealtime, type RealtimeHandlers } from '../services/realtime';

type RealtimeCtx = { status: string };
const Ctx = createContext<RealtimeCtx>({ status: 'INIT' });
export const useRealtimeContext = () => useContext(Ctx);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState('INIT');

  useEffect(() => {
    const handlers: RealtimeHandlers = {
      onOpen: () => setStatus('SUBSCRIBED'),
      onClose: (s) => setStatus(s),

      // You can wire these to invalidate local caches if needed:
      onProfileUpdate: () => {},
      onPostInsert: () => {},
      onPostUpdate: () => {},
      onPostDelete: () => {},
      onNotificationInsert: () => {},
      onNotificationUpdate: () => {},
      onNotificationDelete: () => {},
      onMessageInsert: () => {},
      onRequestInsert: () => {},
      onConversationInsert: () => {},
      onConversationMemberInsert: () => {},
      onFeedbackInsert: () => {},
      onCollaborationInsert: () => {},
    };

    const unsub = subscribeToAppRealtime(handlers);
    return typeof unsub === 'function' ? unsub : undefined;
  }, []);

  const value = useMemo(() => ({ status }), [status]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
