import type { ReactNode } from "react";
import type { GlyphId } from "./cloud-icons";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function Svg({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" {...s}>{children}</svg>;
}

export const GLYPHS: Record<GlyphId, ReactNode> = {
  compute: <Svg><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 10h6M9 14h6" /></Svg>,
  function: <Svg><path d="M14 4h-2a3 3 0 0 0-3 3v3H6m3 0v4a3 3 0 0 1-3 3" /><path d="M9 12h6" /></Svg>,
  container: <Svg><rect x="3" y="9" width="4" height="4" /><rect x="8" y="9" width="4" height="4" /><rect x="13" y="9" width="4" height="4" /><path d="M3 16h16" /></Svg>,
  storage: <Svg><path d="M4 7c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3Z" /><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7" /></Svg>,
  database: <Svg><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></Svg>,
  cache: <Svg><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5v14M16 5v14M4 12h16" /></Svg>,
  cdn: <Svg><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.3 2.5 13.7 0 16M12 4c-2.5 2.3-2.5 13.7 0 16" /></Svg>,
  "load-balancer": <Svg><circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M12 7v4M12 11H6v6M12 11h6v6M12 11v6" /></Svg>,
  "api-gateway": <Svg><path d="M7 4v16M17 4v16" /><path d="M7 8h10M7 16h10" /><circle cx="12" cy="12" r="1.5" /></Svg>,
  queue: <Svg><rect x="3" y="8" width="4" height="8" /><rect x="9" y="8" width="4" height="8" /><rect x="15" y="8" width="4" height="8" /><path d="M19 12h2M1 12h2" /></Svg>,
  dns: <Svg><circle cx="12" cy="12" r="8" /><path d="M12 4v16M4 9h16M4 15h16" /></Svg>,
  firewall: <Svg><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 9.7h16M4 14.3h16M9 5v4.7M15 9.7v4.6M9 14.3V19" /></Svg>,
  auth: <Svg><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" /></Svg>,
  monitoring: <Svg><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M6 12l3-3 2 2 3-4 4 5" /><path d="M9 20h6" /></Svg>,
  user: <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></Svg>,
  browser: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 8h18M7 6h.01M10 6h.01" /></Svg>,
  mobile: <Svg><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></Svg>,
  internet: <Svg><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c3 3 3 13 0 16-3-3-3-13 0-16" /></Svg>,
  box: <Svg><rect x="5" y="5" width="14" height="14" rx="2" /></Svg>,
};
