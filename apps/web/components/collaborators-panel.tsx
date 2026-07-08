"use client";

import { Collaborator } from "@/lib/hooks/use-collaboration";
import { useSession } from "next-auth/react";

interface CollaboratorsPanelProps {
  collaborators: Collaborator[];
  projectId: string;
}

export function CollaboratorsPanel({
  collaborators,
  projectId,
}: CollaboratorsPanelProps) {
  const session = useSession();
  const currentUserId = session.data?.user?.id;

  const others = collaborators.filter((c) => c.userId !== currentUserId);

  if (others.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        background: "white",
        border: "1.5px solid var(--fs-border)",
        borderRadius: 4,
        padding: "8px 12px",
        zIndex: 50,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono-fs)",
          fontSize: 10,
          color: "var(--charcoal-light)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Editing
      </span>
      <div style={{ display: "flex", gap: -8 }}>
        {others.map((collab) => (
          <div
            key={collab.sessionId}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: collab.color,
              border: "2px solid white",
              marginLeft: -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: "bold",
              color: "white",
              cursor: "default",
              title: `Collaborator: ${collab.userId}`,
            }}
          >
            {collab.userId.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-sans-fs)",
          fontSize: 11,
          color: "var(--charcoal-light)",
        }}
      >
        {others.length} {others.length === 1 ? "person" : "people"}
      </span>
    </div>
  );
}

export function MultiCursor({
  collaborators,
}: {
  collaborators: Collaborator[];
}) {
  return (
    <>
      {collaborators.map((collab) => {
        if (!collab.cursorX || !collab.cursorY) return null;
        return (
          <div
            key={collab.sessionId}
            style={{
              position: "fixed",
              left: `${collab.cursorX}px`,
              top: `${collab.cursorY}px`,
              pointerEvents: "none",
              zIndex: 40,
            }}
          >
            <div
              style={{
                width: 2,
                height: 16,
                background: collab.color,
                borderRadius: 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -20,
                left: 4,
                background: collab.color,
                color: "white",
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 2,
                fontFamily: "var(--font-mono-fs)",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              {collab.userId.slice(0, 8)}
            </div>
          </div>
        );
      })}
    </>
  );
}
