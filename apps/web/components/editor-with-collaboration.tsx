"use client";

import { EditorClient, type EditorClientProps } from "./editor-client";
import { CollaborationProvider } from "@/lib/hooks/collaboration-context";
import { CollaboratorsPanel, MultiCursor } from "./collaborators-panel";
import { useCollaborationContext } from "@/lib/hooks/collaboration-context";
import { useId } from "react";

function EditorWithCollaborationInner(props: EditorClientProps) {
  const { collaborators } = useCollaborationContext();

  return (
    <>
      <EditorClient {...props} />
      <CollaboratorsPanel collaborators={collaborators} projectId={props.projectId || ""} />
      <MultiCursor collaborators={collaborators} />
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
