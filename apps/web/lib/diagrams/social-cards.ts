export type SocialCardType = "timeline" | "versus" | "matrix2x2" | "funnel" | "venn" | "tierlist" | "iceberg" | "alignment";

export type TimelineCard = {
  type: "timeline";
  title: string;
  items: Array<{ date: string; label: string; description?: string }>;
  accent?: string;
};
export type VersusCard = {
  type: "versus";
  title: string;
  left: { name: string; points: string[]; color?: string };
  right: { name: string; points: string[]; color?: string };
  verdict?: string;
};
export type MatrixCard = {
  type: "matrix2x2";
  title: string;
  xAxis: { low: string; high: string };
  yAxis: { low: string; high: string };
  items: Array<{ label: string; x: number; y: number }>;
  quadrantLabels?: [string, string, string, string];
  accent?: string;
};
export type FunnelCard = {
  type: "funnel";
  title: string;
  stages: Array<{ label: string; value?: string; note?: string }>;
  accent?: string;
};
export type VennCard = {
  type: "venn";
  title: string;
  sets: Array<{ label: string; items: string[] }>;
  intersection: string[];
};
export type TierListCard = {
  type: "tierlist";
  title: string;
  tiers: Array<{ label: string; color?: string; items: string[] }>;
};
export type IcebergCard = {
  type: "iceberg";
  title: string;
  layers: Array<{ label: string; items: string[] }>;
};
export type AlignmentCard = {
  type: "alignment";
  title: string;
  xAxis: [string, string, string];
  yAxis: [string, string, string];
  cells: Array<{ x: number; y: number; label: string; description?: string }>;
};
export type SocialCard = TimelineCard | VersusCard | MatrixCard | FunnelCard | VennCard | TierListCard | IcebergCard | AlignmentCard;

export type ParseResult = { ok: true; card: SocialCard } | { ok: false; error: string };

const clampTo = (n: unknown, max: number) => Math.min(max, Math.max(0, Number(n) || 0));
const clamp = (n: unknown) => clampTo(n, 100);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []);

export function parseSocialCard(source: string): ParseResult {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(source);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Expected a JSON object" };
  const title = str(raw.title, "Untitled");
  switch (raw.type) {
    case "timeline": {
      const items = Array.isArray(raw.items)
        ? raw.items.map((i: Record<string, unknown>) => ({
            date: str(i?.date), label: str(i?.label),
            ...(typeof i?.description === "string" ? { description: i.description } : {}),
          })).filter((i) => i.label)
        : [];
      if (!items.length) return { ok: false, error: "timeline needs items[]" };
      return { ok: true, card: { type: "timeline", title, items, ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) } };
    }
    case "versus": {
      const side = (v: unknown) => {
        const o = (v ?? {}) as Record<string, unknown>;
        return { name: str(o.name, "?"), points: strArr(o.points), ...(typeof o.color === "string" ? { color: o.color } : {}) };
      };
      return {
        ok: true,
        card: { type: "versus", title, left: side(raw.left), right: side(raw.right), ...(typeof raw.verdict === "string" ? { verdict: raw.verdict } : {}) },
      };
    }
    case "matrix2x2": {
      const axis = (v: unknown) => {
        const o = (v ?? {}) as Record<string, unknown>;
        return { low: str(o.low, "Low"), high: str(o.high, "High") };
      };
      const items = Array.isArray(raw.items)
        ? raw.items.map((i: Record<string, unknown>) => ({ label: str(i?.label), x: clamp(i?.x), y: clamp(i?.y) })).filter((i) => i.label)
        : [];
      const ql = Array.isArray(raw.quadrantLabels) && raw.quadrantLabels.length === 4
        ? (raw.quadrantLabels.map((q) => str(q)) as [string, string, string, string])
        : undefined;
      return {
        ok: true,
        card: { type: "matrix2x2", title, xAxis: axis(raw.xAxis), yAxis: axis(raw.yAxis), items, ...(ql ? { quadrantLabels: ql } : {}), ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) },
      };
    }
    case "funnel": {
      const stages = Array.isArray(raw.stages)
        ? raw.stages.map((s: Record<string, unknown>) => ({
            label: str(s?.label),
            ...(typeof s?.value === "string" ? { value: s.value } : {}),
            ...(typeof s?.note === "string" ? { note: s.note } : {}),
          })).filter((s) => s.label)
        : [];
      if (!stages.length) return { ok: false, error: "funnel needs stages[]" };
      return { ok: true, card: { type: "funnel", title, stages, ...(typeof raw.accent === "string" ? { accent: raw.accent } : {}) } };
    }
    case "venn": {
      const sets = Array.isArray(raw.sets)
        ? raw.sets.map((s: Record<string, unknown>) => ({
            label: str(s?.label, "?"),
            items: strArr(s?.items),
          }))
        : [];
      if (!sets.length) return { ok: false, error: "venn needs sets[]" };
      const intersection = strArr(raw.intersection);
      return { ok: true, card: { type: "venn", title, sets, intersection } };
    }
    case "tierlist": {
      const tiers = Array.isArray(raw.tiers)
        ? raw.tiers
            .map((t: Record<string, unknown>) => ({
              label: str(t?.label),
              items: strArr(t?.items),
              ...(typeof t?.color === "string" ? { color: t.color } : {}),
            }))
            .filter((t) => t.label)
        : [];
      if (!tiers.length) return { ok: false, error: "tierlist needs tiers[]" };
      return { ok: true, card: { type: "tierlist", title, tiers } };
    }
    case "iceberg": {
      const layers = Array.isArray(raw.layers)
        ? raw.layers
            .map((l: Record<string, unknown>) => ({
              label: str(l?.label),
              items: strArr(l?.items),
            }))
            .filter((l) => l.label)
        : [];
      if (!layers.length) return { ok: false, error: "iceberg needs layers[]" };
      return { ok: true, card: { type: "iceberg", title, layers } };
    }
    case "alignment": {
      const axis3 = (v: unknown): [string, string, string] => {
        const a = Array.isArray(v) ? v : [];
        return [str(a[0]), str(a[1]), str(a[2])];
      };
      const cells = Array.isArray(raw.cells)
        ? raw.cells
            .map((c: Record<string, unknown>) => ({
              x: clampTo(c?.x, 2),
              y: clampTo(c?.y, 2),
              label: str(c?.label),
              ...(typeof c?.description === "string" ? { description: c.description } : {}),
            }))
            .filter((c) => c.label)
        : [];
      return { ok: true, card: { type: "alignment", title, xAxis: axis3(raw.xAxis), yAxis: axis3(raw.yAxis), cells } };
    }
    default:
      return { ok: false, error: `Unknown card type: ${String(raw.type)}` };
  }
}

export const SOCIAL_CARD_TYPES: SocialCardType[] = ["timeline", "versus", "matrix2x2", "funnel", "venn", "tierlist", "iceberg", "alignment"];
export function isSocialCardType(t: string): t is SocialCardType {
  return (SOCIAL_CARD_TYPES as string[]).includes(t);
}
