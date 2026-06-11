import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { EditorClient } from "@/components/editor-client";
import { getProject } from "@/app/actions/project";
import { getPlanForEmail } from "@/lib/entitlements";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { getAiSettingsForUser } from "@/app/actions/ai-settings";
import { getProviderMeta } from "@/lib/ai-providers";
import { TEMPLATES, ALL_TEMPLATES, DIAGRAM_TYPE_DEFAULTS, getDiagramTypeMeta, getTemplateSource } from "@flowchart/core";
import type { DiagramType } from "@flowchart/core";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_TYPES: DiagramType[] = ["mermaid", "excalidraw", "reactflow", "echarts", "nivo", "tldraw", "bpmn", "cloud"];

function buildAiAssistantHint(ai: Awaited<ReturnType<typeof getAiSettingsForUser>>) {
  const serverOpenAiFallback = Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.AI_GATEWAY_KEY?.trim(),
  );
  if (ai?.hasKey) {
    return {
      kind: "byok" as const,
      providerLabel: getProviderMeta(ai.provider).label,
    };
  }
  if (serverOpenAiFallback) {
    return { kind: "server" as const };
  }
  return { kind: "none" as const };
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; template?: string; type?: string; prompt?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    const qs = new URLSearchParams();
    if (sp.id) qs.set("id", sp.id);
    if (sp.template) qs.set("template", sp.template);
    if (sp.type) qs.set("type", sp.type);
    const q = qs.toString();
    const dest = q ? `/app/editor?${q}` : "/app/editor";
    redirect(`/login?callbackUrl=${encodeURIComponent(dest)}`);
  }

  await ensureUserAndWorkspace(email);
  const aiSettings = await getAiSettingsForUser();
  const aiAssistantHint = buildAiAssistantHint(aiSettings);
  const projectId = sp.id ?? null;
  const templateId = sp.template ?? null;
  const typeParam = sp.type as DiagramType | undefined;
  const initialPrompt = sp.prompt ?? null;

  const plan = await getPlanForEmail(email);
  const showWatermark = plan !== "pro";
  const userName = session?.user?.name ?? email.split("@")[0];

  // Fetch credits balance for upgrade nudge
  // const [userData] = await db.select({ creditsBalance: users.creditsBalance }).from(users).where(eq(users.email, email)).limit(1);
  // const creditsBalance = userData?.creditsBalance ?? 5;
  const creditsBalance = 100;

  if (projectId) {
    const p = await getProject(projectId);
    if (!p) redirect("/app");
    const diagramType: DiagramType = VALID_TYPES.includes(p.diagramType as DiagramType)
      ? (p.diagramType as DiagramType)
      : "mermaid";
    return (
      <EditorClient
        projectId={p.id}
        initialTitle={p.title}
        initialSource={p.source}
        initialThemeId={p.themeId}
        initialDiagramType={diagramType}
        showWatermark={showWatermark}
        creditsBalance={creditsBalance}
        aiAssistantHint={aiAssistantHint}
        initialPrompt={initialPrompt}
        userEmail={email}
        userName={userName}
      />
    );
  }

  if (typeParam && VALID_TYPES.includes(typeParam)) {
    const meta = getDiagramTypeMeta(typeParam);
    return (
      <EditorClient
        projectId={null}
        initialTitle={`New ${meta.label}`}
        initialSource={DIAGRAM_TYPE_DEFAULTS[typeParam]}
        initialThemeId="stage_pipeline"
        initialDiagramType={typeParam}
        showWatermark={showWatermark}
        creditsBalance={creditsBalance}
        aiAssistantHint={aiAssistantHint}
        initialPrompt={initialPrompt}
        userEmail={email}
        userName={userName}
      />
    );
  }

  // No project, type, or explicit template — show demo diagram to eliminate blank-page paralysis
  const DEMO_SOURCE = `sequenceDiagram
    participant Browser as \uD83C\uDF10 Browser
    participant App as \uD83D\uDDA5 App Server
    participant Auth as \uD83D\uDD10 Auth Server
    participant DB as \uD83D\uDDC4 Database
    Browser->>App: GET /login
    App-->>Browser: Redirect \u2192 Auth Server
    Browser->>Auth: Username + password
    Auth->>DB: Verify credentials
    DB-->>Auth: \u2713 Valid user
    Auth-->>Browser: Redirect + auth code
    Browser->>App: POST auth code
    App->>Auth: Exchange code for tokens
    Auth-->>App: Access token + refresh token
    App->>DB: Store session
    App-->>Browser: Set cookie \u2713
    Browser->>App: API request (cookie)
    App-->>Browser: 200 OK \u2014 Protected data`;

  if (!templateId) {
    return (
      <EditorClient
        projectId={null}
        initialTitle="Example: OAuth Login Flow"
        initialSource={DEMO_SOURCE}
        initialThemeId="stage_pipeline"
        initialDiagramType="mermaid"
        showWatermark={showWatermark}
        creditsBalance={creditsBalance}
        aiAssistantHint={aiAssistantHint}
        isExample={true}
        initialPrompt={initialPrompt}
        userEmail={email}
        userName={userName}
      />
    );
  }

  const t = ALL_TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
  const templateDiagramType: DiagramType = VALID_TYPES.includes((t.diagramType ?? "mermaid") as DiagramType)
    ? ((t.diagramType ?? "mermaid") as DiagramType)
    : "mermaid";
  return (
    <EditorClient
      projectId={null}
      initialTitle={t.title}
      initialSource={getTemplateSource(t)}
      initialThemeId="stage_pipeline"
      initialDiagramType={templateDiagramType}
      showWatermark={showWatermark}
      creditsBalance={creditsBalance}
      aiAssistantHint={aiAssistantHint}
      initialPrompt={initialPrompt}
      userEmail={email}
      userName={userName}
    />
  );
}
