"use client";

import { usePathname } from "next/navigation";

export function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide the global header when we are on the editor page,
  // so the EditorClient can render its own full-width Lovable-style header.
  if (pathname === "/app/editor") return null;
  
  return <>{children}</>;
}
