// pages/Notifications.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from '../context/AppContext';

type NotificationRow = {
  id: string;
  user_id: string;   // recipient
  actor_id: string;  // who triggered
  type: string;
  message: string | null;
  entity_id: string | null;
  is_read: boolean | null;
  created_at: string;
};

export default function Notifications() {
  const { session, track } = useAppContext();
  const dbUserId = session?.user?.id ?? null;
  const analyticsId = dbUserId ?? 'anon';

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('notifications_open', { page: 'notifications' }, analyticsId);

    if (!dbUserId) {
      setLoading(false);
      setRows([]);
      return;
    }

    let canceled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(
            'id, user_id, actor_id, type, message, entity_id, is_read, created_at'
          )
          .eq('user_id', dbUserId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!canceled) setRows((data ?? []) as NotificationRow[]);
      } catch (err) {
        console.error('[Notifications] load error ›', err);
        if (!canceled) setRows([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [dbUserId, track, analyticsId]);

  const list = useMemo(() => rows ?? [], [rows]);

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading notifications…</div>;
  }

  if (!dbUserId) {
    return (
      <div className="p-6 text-sm opacity-70">
        Sign in to see your notifications.
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="p-6 text-sm opacity-70">No notifications yet.</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      {list.map((n) => (
        <div key={n.id} className="rounded-xl bg-base-200 p-4">
          <div className="text-xs opacity-60">
            {new Date(n.created_at).toLocaleString()}
          </div>
          <div className="font-medium mt-1">{n.type}</div>
          <div className="text-sm">{n.message ?? ''}</div>
        </div>
      ))}
    </div>
  );
}
