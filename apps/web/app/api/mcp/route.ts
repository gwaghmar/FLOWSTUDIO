/**
 * MCP HTTP endpoint — Flowchart Studio
 *
 * Exposes MCP tools over HTTP (Streamable HTTP transport) so AI IDEs like
 * Cursor and Claude Code can call generate_diagram directly.
 *
 * Cursor config (~/.cursor/mcp.json):
 * {
 *   "mcpServers": {
 *     "flowchart-studio": {
 *       "url": "http://localhost:3040/api/mcp"
 *     }
 *   }
 * }
 */
import { type NextRequest, NextResponse } from "next/server";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  DIAGRAM_TYPE_META,
  MERMAID_SUBTYPE_META,
  getMermaidSubtypeMeta,
  type DiagramType,
  type MermaidSubtype,
} from "@flowchart/core";
import { z } from "zod";

// Tools are stateless — each request creates a fresh server instance
function buildMcpServer(): Server {
  const server = new Server(
    { name: "flowchart-studio", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "generate_diagram",
        description:
          "Generate a diagram from a natural-language prompt. Returns the diagram source (Mermaid syntax, JSON, XML, etc.) ready to paste into Flowchart Studio or save to a file.",
        inputSchema: {
          type: "object" as const,
          properties: {
            prompt: {
              type: "string",
              description: "What the diagram should show, e.g. 'User authentication flow'",
            },
            diagramType: {
              type: "string",
              enum: DIAGRAM_TYPE_META.map((d) => d.id),
              description: `Diagram renderer. Default: mermaid. Options: ${DIAGRAM_TYPE_META.map((d) => d.id).join(", ")}`,
            },
            mermaidSubtype: {
              type: "string",
              enum: MERMAID_SUBTYPE_META.map((s) => s.id),
              description: `Mermaid sub-format (only when diagramType=mermaid). Options: ${MERMAID_SUBTYPE_META.map((s) => `${s.id} (${s.label})`).join(", ")}`,
            },
            baseUrl: {
              type: "string",
              description: "Flowchart Studio server URL. Default: http://localhost:3040",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "list_diagram_types",
        description: "List all available diagram types and Mermaid subtypes with descriptions.",
        inputSchema: { type: "object" as const, properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "list_diagram_types") {
      const lines: string[] = ["Available diagram types:\n"];
      for (const dt of DIAGRAM_TYPE_META) {
        lines.push(`• ${dt.id} — ${dt.label}: ${dt.description}`);
        if (dt.id === "mermaid") {
          lines.push("  Mermaid subtypes:");
          for (const sub of MERMAID_SUBTYPE_META) {
            lines.push(`    - ${sub.id} (${sub.label})`);
          }
        }
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }

    if (name === "generate_diagram") {
      const parsed = z
        .object({
          prompt: z.string().min(1),
          diagramType: z.string().optional(),
          mermaidSubtype: z.string().optional(),
          baseUrl: z.string().url().optional(),
        })
        .safeParse(args);

      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
        };
      }

      const { prompt, baseUrl = "http://localhost:3040" } = parsed.data;
      const diagramType = (parsed.data.diagramType ?? "mermaid") as DiagramType;
      const mermaidSubtype = parsed.data.mermaidSubtype as MermaidSubtype | undefined;

      // Prepend subtype hint so the AI produces the right Mermaid variant
      let enrichedPrompt = prompt;
      if (diagramType === "mermaid" && mermaidSubtype) {
        enrichedPrompt = getMermaidSubtypeMeta(mermaidSubtype).aiHint + prompt;
      }

      let res: Response;
      try {
        res = await fetch(`${baseUrl}/api/ai/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: enrichedPrompt, diagramType, compact: false }),
        });
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: `Could not reach ${baseUrl}. Is the dev server running?` }],
        };
      }

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) msg = body.error;
        } catch { /* ignore */ }
        return { isError: true, content: [{ type: "text", text: msg }] };
      }

      const data = (await res.json()) as { source?: string; error?: string };
      if (!data.source) {
        return {
          isError: true,
          content: [{ type: "text", text: data.error ?? "No diagram source returned" }],
        };
      }

      return { content: [{ type: "text", text: data.source }] };
    }

    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  });

  return server;
}

async function handleRequest(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildMcpServer();
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req);
}
