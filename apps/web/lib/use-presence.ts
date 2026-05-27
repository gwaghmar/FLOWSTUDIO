"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PresenceUser = {
  email: string;
  name: string;
  color: string;
  joinedAt: number;
};

const PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

export function presenceColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function usePresence(
  projectId: string | null,
  userEmail: string,
  userName: string,
): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!projectId) return;
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    ) return;

    let mounted = true;

    async function init() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const channel = supabase.channel(`project:${projectId}`, {
        config: { presence: { key: userEmail } },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        if (!mounted) return;
        const state = channel.presenceState<{ email: string; name: string; joinedAt: number }>();
        const list: PresenceUser[] = Object.entries(state)
          .filter(([key]) => key !== userEmail)
          .map(([, entries]) => {
            const e = entries[0];
            return { email: e.email, name: e.name, color: presenceColor(e.email), joinedAt: e.joinedAt };
          })
          .sort((a, b) => a.joinedAt - b.joinedAt);
        setOthers(list);
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ email: userEmail, name: userName, joinedAt: Date.now() });
        }
      });
    }

    void init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setOthers([]);
    };
  }, [projectId, userEmail, userName]);

  return others;
}
