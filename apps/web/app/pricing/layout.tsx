import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — FlowStudio",
  description:
    "Free tier for themes and browser export; Pro ($15/mo or $12/mo billed annually) for no watermark, PDF, batch export, and higher limits.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
