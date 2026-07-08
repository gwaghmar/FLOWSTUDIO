"use client";

import { EditorClient, type EditorClientProps } from "./editor-client";
import { CollaborationProvider } from "@/lib/hooks/collaboration-context";
import { CollaboratorsPanel, MultiCursor } from "./collaborators-panel";
import { ShareCollaboratorsDialog } from "./share-collaborators-dialog";
import { useCollaborationContext } from "@/lib/hooks/collaboration-context";
import { useEditSync } from "@/lib/hooks/use-edit-sync";
import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";

function EditorWithCollaborationInner(props: EditorClientProps) {
  const { collaborators } = useCollaborationContext();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <>
      <EditorClient {...props} />
      <CollaboratorsPanel collaborators={collaborators} projectId={props.projectId || ""} />
      <MultiCursor collaborators={collaborators} />

      {/* Share button */}
      <button
        onClick={() => setShareDialogOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "var(--fs-indigo)",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "12px 16px",
          fontFamily: "var(--font-mono-fs)",
          fontSize: 12,
          letterSpacing: "0.04em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 40,
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
        }}
      >
        <Share2 size={16} />
        Share
      </button>

      <ShareCollaboratorsDialog
        projectId={props.projectId || ""}
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />
    </>
  );
}

export function EditorWithCollaboration(props: EditorClientProps & { sessionId: string }) {
  const { sessionId, projectId, ...editorProps } = props;

  // Only enable collaboration if projectId exists (not in demo/template mode)
  if (!projectId) {
    return <EditorClient projectId={null} {...editorProps} />;
  }

  return (
    <CollaborationProvider projectId={projectId} sessionId={sessionId}>
      <EditorWithCollaborationInner projectId={projectId} {...editorProps} />
    </CollaborationProvider>
  );
}
