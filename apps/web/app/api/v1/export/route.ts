import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlanForEmail } from "@/lib/entitlements";
import type { ApiError } from "@flowchart/core";
import { MermaidSourceSchema, getPreset, getTheme, buildMermaidConfig } from "@flowchart/core";
import { getPrincipalFromRequest } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const svgToPdfkit = require("svg-to-pdfkit") as typeof import("svg-to-pdfkit");

export async function POST(req: Request) {
  // Auth: allow either session cookie or API key (Bearer fc_...)
  const principal = await getPrincipalFromRequest(req);
  let plan: "free" | "pro" = "free";

  if (principal.type === "user") {
    plan = principal.plan;
  } else {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      const body: ApiError = { error: "Unauthorized", code: "UNAUTHORIZED" };
      return NextResponse.json(body, { status: 401 });
    }
    plan = await getPlanForEmail(email);
  }

  if (plan !== "pro") {
    const body: ApiError = {
      error: "Server export requires Pro",
      code: "ENTITLEMENT_REQUIRED",
    };
    return NextResponse.json(body, { status: 402 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`export:${principal.type === "user" ? principal.userId : ip}`, 30, 60_000);
  if (!rl.ok) {
    const body: ApiError = {
      error: "Too many exports",
      code: "RATE_LIMITED",
      details: { retryAfter: rl.retryAfter },
    };
    return NextResponse.json(body, { status: 429 });
  }

  const json = (await req.json().catch(() => ({}))) as {
    source?: string;
    themeId?: string;
    presetId?: string;
    format?: "png" | "svg" | "pdf";
    background?: "transparent" | "white" | "black" | "theme";
    scale?: number;
  };

  const source = MermaidSourceSchema.parse(json.source ?? "");
  const theme = getTheme(json.themeId ?? "stage_pipeline") ?? getTheme("stage_pipeline")!;
  const preset = getPreset(
    json.presetId === "square_feed" ||
      json.presetId === "vertical_feed" ||
      json.presetId === "story_reel" ||
      json.presetId === "landscape" ||
      json.presetId === "link_preview" ||
      json.presetId === "custom"
      ? json.presetId
      : "square_feed"
  ) ?? { width: 1080, height: 1080 };
  const format = json.format ?? "png";
  const scale = typeof json.scale === "number" ? Math.max(1, Math.min(4, json.scale)) : 2;

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "flowchart-export-"));
  const input = path.join(tmp, "diagram.mmd");
  const cfgFile = path.join(tmp, "config.json");
  const svgOut = path.join(tmp, "out.svg") as `${string}.svg`;

  const mermaidConfig = buildMermaidConfig(theme);
  // mermaid-cli prefers theme=base for full themeVariables; still pass through.
  const cliConfig = {
    ...mermaidConfig,
    flowchart: { useMaxWidth: false, htmlLabels: true },
  };

  await fs.writeFile(input, source, "utf8");
  await fs.writeFile(cfgFile, JSON.stringify(cliConfig), "utf8");

  try {
    const execFileAsync = promisify(execFile);
    const bg =
      json.background === "transparent"
        ? "transparent"
        : (theme.themeVariables.background ?? "white");

    // Always render SVG first (vector source of truth)
    const args = [
      "-i",
      input,
      "-o",
      svgOut,
      "-c",
      cfgFile,
      "-w",
      String(preset.width),
      "-H",
      String(preset.height),
      "-b",
      bg,
    ];
    if (process.platform === "win32") {
      await execFileAsync("cmd.exe", ["/c", "pnpm", "exec", "mmdc", ...args], {
        windowsHide: true,
        cwd: process.cwd(),
      });
    } else {
      await execFileAsync("pnpm", ["exec", "mmdc", ...args], {
        windowsHide: true,
        cwd: process.cwd(),
      });
    }

    const svg = await fs.readFile(svgOut);

    if (format === "svg") {
      return new Response(new Uint8Array(svg), {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": "attachment; filename=\"flowchart.svg\"",
        },
      });
    }

    if (format === "png") {
      // Rasterize SVG with sharp for stable PNG
      const buf = await sharp(svg, { density: 144 * scale })
        .resize({ width: preset.width * scale, height: preset.height * scale, fit: "contain" })
        .png()
        .toBuffer();
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": "attachment; filename=\"flowchart.png\"",
        },
      });
    }

    // PDF: render SVG into a single-page PDF
    const doc = new PDFDocument({
      size: [preset.width, preset.height],
      margin: 0,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    );
    svgToPdfkit(doc as unknown as PDFKit.PDFDocument, svg.toString("utf8"), 0, 0, {
      width: preset.width,
      height: preset.height,
      preserveAspectRatio: "xMinYMin meet",
    });
    doc.end();
    const pdf = await done;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"flowchart.pdf\"",
      },
    });
  } catch (e) {
    const body: ApiError = {
      error: e instanceof Error ? e.message : "Export failed",
      code: "INTERNAL_ERROR",
    };
    return NextResponse.json(body, { status: 500 });
  } finally {
    // best-effort cleanup
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
