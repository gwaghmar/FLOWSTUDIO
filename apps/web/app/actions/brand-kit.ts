"use server";

import { auth } from "@/auth";
import { ensureUserAndWorkspace } from "@/lib/user-sync";
import { db } from "@/lib/db";
import { brandKits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type BrandPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;
};

export type BrandKitRow = {
  id: string;
  name: string;
  palette: BrandPalette | null;
  logoObjectKey: string | null;
};

const DEFAULT_PALETTE: BrandPalette = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  background: "#f8fafc",
};

function parsePalette(json: string | null): BrandPalette | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as Partial<BrandPalette>;
    if (typeof p.primary !== "string" || typeof p.secondary !== "string" || typeof p.accent !== "string") return null;
    return {
      primary: p.primary,
      secondary: p.secondary,
      accent: p.accent,
      background: typeof p.background === "string" ? p.background : undefined,
    };
  } catch {
    return null;
  }
}

function isHexColor(s: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}

export async function getBrandKit(): Promise<BrandKitRow | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const { workspace } = await ensureUserAndWorkspace(email);
  const [row] = await db
    .select()
    .from(brandKits)
    .where(eq(brandKits.workspaceId, workspace.id))
    .orderBy(desc(brandKits.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    palette: parsePalette(row.paletteJson),
    logoObjectKey: row.logoObjectKey,
  };
}

export async function saveBrandKit(input: {
  name?: string;
  palette: BrandPalette;
}): Promise<BrandKitRow> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  const { workspace } = await ensureUserAndWorkspace(email);

  const { primary, secondary, accent, background } = input.palette;
  if (![primary, secondary, accent].every(isHexColor)) {
    throw new Error("Palette colors must be hex (e.g. #6366f1)");
  }
  if (background && !isHexColor(background)) {
    throw new Error("Background must be hex (e.g. #f8fafc)");
  }
  const paletteJson = JSON.stringify({ primary, secondary, accent, background });
  const name = (input.name ?? "Brand kit").slice(0, 80);

  const [existing] = await db
    .select()
    .from(brandKits)
    .where(eq(brandKits.workspaceId, workspace.id))
    .orderBy(desc(brandKits.createdAt))
    .limit(1);

  if (existing) {
    await db
      .update(brandKits)
      .set({ name, paletteJson })
      .where(eq(brandKits.id, existing.id));
    revalidatePath("/app/settings");
    return { id: existing.id, name, palette: input.palette, logoObjectKey: existing.logoObjectKey };
  }

  const id = crypto.randomUUID();
  await db.insert(brandKits).values({
    id,
    workspaceId: workspace.id,
    name,
    paletteJson,
    logoObjectKey: null,
    createdAt: new Date(),
  });
  revalidatePath("/app/settings");
  return { id, name, palette: input.palette, logoObjectKey: null };
}

export async function getDefaultBrandPalette(): Promise<BrandPalette> {
  return DEFAULT_PALETTE;
}
