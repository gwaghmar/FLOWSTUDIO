# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript 5.7.2 - All application code across web, core, and mcp-server packages

**Secondary:**
- Python 3.x - Test scripts (`test_ai_key.py`, `test_browser.py`, `test_editor.py` at project root)

## Runtime

**Environment:**
- Node.js >= 20 (enforced in `package.json` engines field)

**Package Manager:**
- pnpm (with workspace support)
- Lockfile: `pnpm-lock.yaml` present
- Workspace config: `pnpm-workspace.yaml` defines `apps/*` and `packages/*`

## Monorepo Structure

Four packages managed under pnpm workspaces:
- `apps/web` (`@flowchart/web`) - Next.js web application
- `packages/core` (`@flowchart/core`) - Shared types and schemas, ESM-only, built with tsup
- `packages/mcp-server` (`@flowchart/mcp-server`) - Standalone MCP server, ESM-only, built with tsup

## Frameworks

**Core:**
- Next.js 15.1.6 (`apps/web`) - App Router, Turbopack for dev (`next dev --turbopack -p 3040`), Server Actions enabled
- React 19.0.0 - UI library
- Tailwind CSS 3.4.17 (`apps/web/tailwind.config.ts`) - Utility-first CSS with Geist font family

**AI:**
- Vercel AI SDK (`ai` ^6.0.156) - Core AI streaming SDK with multi-provider support
- `@ai-sdk/openai` ^3.0.52 - OpenAI + compatible (Ollama, custom endpoints)
- `@ai-sdk/anthropic` ^3.0.68 - Anthropic Claude
- `@ai-sdk/google` ^3.0.61 - Google Gemini
- `@ai-sdk/mistral` ^3.0.30 - Mistral AI
- `@ai-sdk/groq` ^3.0.35 - Groq

**Database:**
- Drizzle ORM 0.38.4 - Type-safe ORM with PostgreSQL dialect
- drizzle-kit 0.30.1 - Schema migrations (`apps/web/drizzle.config.ts`)
- postgres.js 3.4.5 - PostgreSQL driver (`apps/web/lib/db/index.ts`)

**Testing:**
- Playwright 1.49.1 - E2E testing only (`playwright.config.ts` at root, tests in `e2e/`)
- No unit test framework detected

**Build/Dev:**
- tsup 8.3.5 - Builds `@flowchart/core` and `@flowchart/mcp-server` packages
- tsx 4.19.2 - Dev runner for mcp-server (`tsx watch src/index.ts`)

## Key Dependencies

**Diagram Rendering:**
- `mermaid` ^11.4.1 - Mermaid diagram renderer
- `@xyflow/react` ^12.10.2 - React Flow for node-graph diagrams
- `tldraw` ^4.5.8 - Infinite canvas / freehand drawing
- `@excalidraw/excalidraw` ^0.18.0 - Excalidraw whiteboard
- `bpmn-js` ^18.14.0 - BPMN process diagrams
- `@dagrejs/dagre` ^3.0.0 - Directed graph layout engine
- `@mermaid-js/mermaid-cli` ^11.12.0 - Server-side Mermaid rendering

**Data Visualization:**
- `@nivo/bar`, `@nivo/line`, `@nivo/pie`, `@nivo/network`, `@nivo/sankey`, `@nivo/radar`, `@nivo/treemap` (all ^0.99.0)
- `echarts` ^5.5.0 + `echarts-for-react` ^3.0.6

**Export/File Generation:**
- `pdfkit` ^0.18.0 - PDF generation
- `svg-to-pdfkit` ^0.1.8 - SVG embed in PDF
- `html-to-image` ^1.11.11 - HTML/SVG → PNG/JPEG
- `jszip` ^3.10.1 - ZIP archive creation
- `sharp` ^0.34.5 - Image processing

**Auth & Security:**
- `@supabase/supabase-js` ^2.103.0 - Supabase client
- `@supabase/ssr` ^0.10.2 - Supabase SSR helpers for Next.js
- `next-auth` 5.0.0-beta.25 - Legacy stub only (replaced by Supabase Auth)

**Payments:**
- `stripe` ^17.6.0 - Stripe Payments SDK

**MCP Protocol:**
- `@modelcontextprotocol/sdk` ^1.29.0 - Model Context Protocol server/transport

**Utilities:**
- `zod` ^3.24.1 - Schema validation (used in core, web, mcp-server)
- `nanoid` ^5.1.7 - ID generation
- `jsonrepair` ^3.13.3 - JSON repair for AI outputs
- `lucide-react` ^1.8.0 - Icon library

## Configuration

**TypeScript:**
- `apps/web/tsconfig.json` - Strict mode, `@/*` path alias mapping to `apps/web/*`, ES2017 target, bundler module resolution
- `packages/core/tsconfig.json` - ESM module output
- `packages/mcp-server/tsconfig.json` - ESM module output

**Build:**
- `apps/web/next.config.ts` - Transpiles `@flowchart/core`, serverActions bodySizeLimit 2mb
- `packages/core`: `tsup src/index.ts --format esm --dts --clean`
- `packages/mcp-server`: `tsup src/index.ts --format esm --clean`

**Environment:**
- Root `.env.example` documents all required vars
- Web app loads `.env.local` then `.env` (via dotenv in drizzle.config.ts)
- Supabase vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Database: `DATABASE_URL` (PostgreSQL connection string)

**CSS:**
- `apps/web/tailwind.config.ts` - Content paths for `app/` and `components/`, Geist font vars, custom `fade-in` animation
- `apps/web/postcss.config.mjs` - PostCSS with Autoprefixer

## Platform Requirements

**Development:**
- Node.js >= 20
- pnpm workspace
- PostgreSQL instance (local or Supabase) for `DATABASE_URL`
- Dev server runs on port 3040

**Production:**
- Vercel (`apps/web/vercel.json` - custom install/build commands)
- PostgreSQL via Supabase (with connection pooler for serverless)

---

*Stack analysis: 2026-04-13*
