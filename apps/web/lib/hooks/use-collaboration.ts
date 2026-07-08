import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Collaborator {
  userId: string;
  sessionId: string;
  cursorX?: number;
  cursorY?: number;
  color: string;
  lastHeartbeat: Date;
}

export interface CollaborationEdit {
  id: string;
  operation: string;
  operationData: string;
  clientId: string;
  lamportTimestamp: number;
  createdAt: Date;
}

export function useCollaboration(projectId: string, sessionId: string) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [edits, setEdits] = useState<CollaborationEdit[]>([]);
  const lamportClockRef = useRef(0);

  useEffect(() => {
    if (!projectId || !sessionId) return;

    const channel = supabase.channel(`project:${projectId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "edit" }, (payload) => {
        setEdits((prev) => {
          const exists = prev.some((e) => e.id === payload.payload.id);
          return exists ? prev : [...prev, payload.payload];
        });
        lamportClockRef.current = Math.max(lamportClockRef.current, payload.payload.lamportTimestamp) + 1;
      })
      .on("broadcast", { event: "presence" }, (payload) => {
        setCollaborators((prev) => {
          const filtered = prev.filter((c) => c.sessionId !== payload.payload.sessionId);
          return [...filtered, payload.payload];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const allCollaborators: Collaborator[] = [];
        Object.values(state).forEach((users) => {
          users.forEach((user: any) => {
            allCollaborators.push(user as Collaborator);
          });
        });
        setCollaborators(allCollaborators);
      })
      .on("presence", { event: "join" }, () => {
        // New collaborator joined
      })
      .on("presence", { event: "leave" }, () => {
        // Collaborator left
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: sessionId,
            sessionId,
            cursorX: 0,
            cursorY: 0,
            color: getColorForUser(sessionId),
            lastHeartbeat: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, sessionId, supabase]);

  const broadcastEdit = useCallback(
    (operation: string, operationData: string, clientId: string) => {
      if (!channelRef.current) return;
      const timestamp = ++lamportClockRef.current;
      channelRef.current.send({
        type: "broadcast",
        event: "edit",
        payload: {
          id: `${clientId}-${timestamp}`,
          operation,
          operationData,
          clientId,
          lamportTimestamp: timestamp,
          createdAt: new Date().toISOString(),
        },
      });
    },
    []
  );

  const broadcastPresence = useCallback(
    (cursorX?: number, cursorY?: number, selectionStart?: string, selectionEnd?: string) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "presence",
        payload: {
          userId: sessionId,
          sessionId,
          cursorX,
          cursorY,
          selectionStart,
          selectionEnd,
          color: getColorForUser(sessionId),
          lastHeartbeat: new Date().toISOString(),
        },
      });
    },
    [sessionId]
  );

  return { collaborators, edits, broadcastEdit, broadcastPresence };
}

function getColorForUser(userId: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
  ];
  const hash = userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
