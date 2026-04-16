import type { Metadata } from "next";
import { ShareViewer } from "@/components/share-viewer";
import { db } from "@/lib/db";
import { shareLinks, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sha256Hex } from "@/lib/crypto";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const tokenHash = sha256Hex(token);
    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.tokenHash, tokenHash)).limit(1);
    if (!link || (link.expiresAt && link.expiresAt < new Date())) {
      return { title: "Shared Diagram — Flowchart Studio" };
    }
    const [p] = await db.select({ title: projects.title, diagramType: projects.diagramType })
      .from(projects).where(eq(projects.id, link.projectId)).limit(1);
    if (!p) return { title: "Shared Diagram — Flowchart Studio" };

    const TYPE_LABELS: Record<string, string> = {
      mermaid: "Text flowchart", excalidraw: "Whiteboard", reactflow: "Node graph",
      echarts: "Chart", nivo: "Chart", tldraw: "Canvas", bpmn: "BPMN process",
    };
    const typeLabel = TYPE_LABELS[p.diagramType] ?? "Diagram";
    const title = p.title ? `${p.title} — Flowchart Studio` : "Shared Diagram — Flowchart Studio";
    const description = `View this ${typeLabel} created with Flowchart Studio.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Flowchart Studio",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return { title: "Shared Diagram — Flowchart Studio" };
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ShareViewer token={token} />;
}

