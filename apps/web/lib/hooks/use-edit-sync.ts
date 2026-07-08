import { useEffect, useRef, useCallback } from "react";
import { useCollaborationContext } from "./collaboration-context";
import { recordEdit } from "@/app/actions/collaboration";

interface EditOperation {
  type: "insert" | "delete" | "replace";
  position: number;
  content?: string;
  oldContent?: string;
}

export function useEditSync(
  projectId: string | null,
  source: string,
  onSourceChange: (newSource: string) => void
) {
  const { broadcastEdit, edits } = useCollaborationContext();
  const lastBroadcastedSourceRef = useRef(source);
  const clientIdRef = useRef(`client-${Math.random().toString(36).slice(2)}`);

  // Apply incoming edits from other collaborators
  useEffect(() => {
    if (!edits.length || !projectId) return;

    const lastEdit = edits[edits.length - 1];
    if (!lastEdit) return;

    try {
      const operation = JSON.parse(lastEdit.operationData) as EditOperation;

      let newSource = source;
      switch (operation.type) {
        case "insert":
          newSource =
            source.slice(0, operation.position) +
            operation.content +
            source.slice(operation.position);
          break;
        case "delete":
          newSource =
            source.slice(0, operation.position) +
            source.slice(operation.position + (operation.oldContent?.length || 0));
          break;
        case "replace":
          newSource =
            source.slice(0, operation.position) +
            operation.content +
            source.slice(operation.position + (operation.oldContent?.length || 0));
          break;
      }

      if (newSource !== source) {
        onSourceChange(newSource);
        lastBroadcastedSourceRef.current = newSource;
      }
    } catch (err) {
      console.error("[useEditSync] Failed to apply edit:", err);
    }
  }, [edits, source, onSourceChange, projectId]);

  // Broadcast source changes as edits
  const broadcastSourceChange = useCallback(
    async (newSource: string) => {
      if (!projectId || newSource === lastBroadcastedSourceRef.current) return;

      const oldSource = lastBroadcastedSourceRef.current;
      const operation = detectChange(oldSource, newSource);

      if (!operation) return;

      lastBroadcastedSourceRef.current = newSource;

      // Broadcast locally via Realtime
      broadcastEdit("source_edit", JSON.stringify(operation), clientIdRef.current);

      // Record on server for persistence
      await recordEdit(
        projectId,
        "source_edit",
        JSON.stringify(operation),
        clientIdRef.current,
        Date.now()
      );
    },
    [projectId, broadcastEdit]
  );

  return { broadcastSourceChange };
}

function detectChange(oldSource: string, newSource: string): EditOperation | null {
  if (oldSource === newSource) return null;

  // Simple diff: find first difference and last difference
  let startPos = 0;
  while (startPos < oldSource.length && startPos < newSource.length) {
    if (oldSource[startPos] !== newSource[startPos]) break;
    startPos++;
  }

  let endOld = oldSource.length;
  let endNew = newSource.length;
  while (endOld > startPos && endNew > startPos) {
    if (oldSource[endOld - 1] !== newSource[endNew - 1]) break;
    endOld--;
    endNew--;
  }

  const deletedContent = oldSource.slice(startPos, endOld);
  const insertedContent = newSource.slice(startPos, endNew);

  if (deletedContent.length === 0) {
    // Pure insert
    return {
      type: "insert",
      position: startPos,
      content: insertedContent,
    };
  } else if (insertedContent.length === 0) {
    // Pure delete
    return {
      type: "delete",
      position: startPos,
      oldContent: deletedContent,
    };
  } else {
    // Replace
    return {
      type: "replace",
      position: startPos,
      content: insertedContent,
      oldContent: deletedContent,
    };
  }
}
