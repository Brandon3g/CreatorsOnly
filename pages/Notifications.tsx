import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

type Notif = {
  id: string;
  user_id: string;
  actor_id?: string;
  type?: string;
  message?: string;
  entity_id?: string;
  is_read?: boolean;
  created_at?: string;
};

export default function Notifications() {
  const { currentUser } = useAppContext();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!cancelled) setItems((data ?? []) as Notif[]);
      } catch (e: any) {
        console.error('[Notifications] load error', e);
        if (!cancelled) setErr(e?.message ?? 'Failed to load notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`public:notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => setItems((prev) => [payload.new as Notif, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  if (loading) return <div className="py-16 text-center opacity-70">Loading…</div>;
  if (err) return <div className="py-16 text-center text-error">{err}</div>;

  return (
    <div className="max-w-xl mx-auto pb-24">
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>
      {list.length === 0 ? (
        <div className="opacity-70">No notifications yet.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li key={n.id} className="rounded-xl border border-base-300 p-3">
              <div className="text-sm">{n.message ?? n.type ?? 'New activity'}</div>
              <div className="text-xs opacity-60">{n.created_at}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
