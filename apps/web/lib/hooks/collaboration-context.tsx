import React, { createContext, useContext } from "react";
import { useCollaboration, type Collaborator, type CollaborationEdit } from "./use-collaboration";

interface CollaborationContextType {
  collaborators: Collaborator[];
  edits: CollaborationEdit[];
  broadcastEdit: (operation: string, operationData: string, clientId: string) => void;
  broadcastPresence: (cursorX?: number, cursorY?: number, selectionStart?: string, selectionEnd?: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({
  children,
  projectId,
  sessionId,
}: {
  children: React.ReactNode;
  projectId: string;
  sessionId: string;
}) {
  const { collaborators, edits, broadcastEdit, broadcastPresence } = useCollaboration(projectId, sessionId);

  return (
    <CollaborationContext.Provider value={{ collaborators, edits, broadcastEdit, broadcastPresence }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaborationContext() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error("useCollaborationContext must be used within CollaborationProvider");
  }
  return context;
}
