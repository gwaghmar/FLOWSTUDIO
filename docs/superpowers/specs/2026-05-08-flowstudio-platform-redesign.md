# Design Spec: FlowStudio Platform Redesign
**Date**: 2026-05-08
**Topic**: End-to-End AI-First Platform with Lovable-inspired UX

## 1. Vision
Transform FlowStudio from a static diagramming tool into a "Live Platform" for business processes. The app will prioritize "Vibe Coding" patterns—where natural language is the primary driver, and the UI provides instant, high-fidelity, interactive feedback.

## 2. The "Lovable" UX/UI Pattern
We will adopt the following patterns from Lovable.dev:
- **Chat-First Sidebar**: The left panel is no longer just a "chat history." It is the **AI Command Center**.
  - **Task Tracking**: While the AI generates, it shows a live plan (e.g., "Planning structure...", "Generating nodes...", "Applying styles...").
  - **Bi-directional Selection**: Clicking a node on the canvas highlights its context in the chat/source.
- **Interactive Preview**:
  - **Visual Edits**: Users can click nodes to trigger "AI Refinement" (e.g., a popup appears saying "What should I change about this step?").
  - **Live Streaming**: Diagrams render in real-time as the AI streams the code.
- **Minimalist Aesthetic**: Dark-themed sidebar with high-contrast active states.

## 3. The "Big Four" Core Features
1. **Streaming AI**: Convert the generation pipeline to use `streamText`.
2. **Live Collaboration**: Integrate Supabase Realtime for shared cursors and state synchronization.
3. **Live Data Binding**: Allow nodes to display real-time data from external APIs.
4. **Live Execution**: A "Play Mode" where the flowchart acts as a state machine/workflow engine.

## 4. Technical Implementation Strategy

### Phase A: The AI Command Center (Left Panel)
- **File**: `apps/web/components/editor-client.tsx`
- **Changes**: 
  - Redesign the chat container to include a "Plan/Status" header.
  - Integrate a "Task List" component that updates based on AI lifecycle events (Intent -> Stream -> Validate).

### Phase B: Streaming & Aspect Ratio (Server + UI)
- **Files**: `apps/web/app/api/ai/generate/route.ts`, `apps/web/components/editor-client.tsx`
- **Changes**:
  - Update `route.ts` to return a `DataStreamResponse`.
  - Update `EditorClient` to handle incremental source updates.
  - Automate `setPresetId` based on AI `suggestedPresetId` inference.

### Phase C: Interactive Canvas (Bi-directional)
- **File**: `apps/web/components/editor-client.tsx`, `apps/web/components/diagrams/*`
- **Changes**:
  - Add `onNodeClick` handlers to React Flow and Mermaid (via SVG interaction).
  - Selected node state influences the next AI prompt context.

### Phase D: Execution & Collaboration
- **Files**: `apps/web/lib/supabase/client.ts`, `apps/web/components/editor-client.tsx`
- **Changes**:
  - Add "Presence" layer using Supabase.
  - Create an "Execution Engine" that tracks the "Active Node" and executes predefined actions.

## 5. Success Criteria
- [ ] User can create a complex flowchart via a single prompt.
- [ ] The diagram streams in real-time as the AI generates it.
- [ ] The AI automatically sets the correct aspect ratio for the detected business use-case.
- [ ] Clicking a node allows the user to specifically ask the AI to "Fix this step."
- [ ] "Play Mode" allows stepping through the flow.

## 6. Next Steps
1. **Execute Phase B (Streaming + Aspect Ratio)**: This provides the most immediate "Live" feel.
2. **Execute Phase A (UI Redesign)**: Aligning with the Lovable aesthetic.
3. **Execute Phase C & D**: Adding deep platform functionality.
