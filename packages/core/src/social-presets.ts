import type { SocialPresetId } from "./schemas.js";

export type SocialPreset = {
  id: SocialPresetId;
  label: string;
  width: number;
  height: number;
  /** Safe zone inset ratio for 9:16-style UI chrome (top, right, bottom, left as 0-1 of dimension) */
  safeZone?: { top: number; bottom: number; left: number; right: number };
};

export const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: "square_feed",
    label: "Square feed (1:1)",
    width: 1080,
    height: 1080,
  },
  {
    id: "vertical_feed",
    label: "Vertical feed (4:5)",
    width: 1080,
    height: 1350,
  },
  {
    id: "story_reel",
    label: "Story / Reel (9:16)",
    width: 1080,
    height: 1920,
    safeZone: { top: 0.14, bottom: 0.22, left: 0.04, right: 0.04 },
  },
  {
    id: "landscape",
    label: "Landscape (16:9)",
    width: 1920,
    height: 1080,
  },
  {
    id: "link_preview",
    label: "Link preview (OG)",
    width: 1200,
    height: 627,
  },
];

export function getPreset(id: SocialPresetId): SocialPreset | undefined {
  if (id === "custom") return undefined;
  return SOCIAL_PRESETS.find((p) => p.id === id);
}
