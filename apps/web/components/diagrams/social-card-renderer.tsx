"use client";

import React from "react";
import { parseSocialCard, type SocialCard, type TimelineCard, type VersusCard, type MatrixCard, type FunnelCard, type VennCard, type TierListCard, type IcebergCard, type AlignmentCard } from "@/lib/diagrams/social-cards";

const DEFAULT_ACCENT = "#4f46e5";

export function SocialCardRenderer({ source }: { source: string; onChange?: (s: string) => void; readOnly?: boolean }) {
  const result = parseSocialCard(source);
  if (!result.ok) {
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-medium text-slate-700">Could not render card</p>
          <p className="mt-1 text-xs text-slate-500">{result.error}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col bg-white p-[5%]">
      <CardBody card={result.card} />
    </div>
  );
}

function CardBody({ card }: { card: SocialCard }) {
  switch (card.type) {
    case "timeline": return <TimelineLayout card={card} />;
    case "versus": return <VersusLayout card={card} />;
    case "matrix2x2": return <MatrixLayout card={card} />;
    case "funnel": return <FunnelLayout card={card} />;
    case "venn": return <VennLayout card={card} />;
    case "tierlist": return <TierListLayout card={card} />;
    case "iceberg": return <IcebergLayout card={card} />;
    case "alignment": return <AlignmentLayout card={card} />;
  }
}

function CardTitle({ children }: { children: string }) {
  return <h2 className="mb-[4%] text-center text-[clamp(18px,4cqw,42px)] font-bold tracking-tight text-slate-900">{children}</h2>;
}

function TimelineLayout({ card }: { card: TimelineCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="relative flex flex-1 flex-col justify-center">
        <div className="absolute left-[clamp(8px,2cqw,16px)] top-0 bottom-0 w-[3px] rounded" style={{ backgroundColor: `${accent}33` }} />
        <ul className="flex h-full flex-col justify-around">
          {card.items.map((item, i) => (
            <li key={i} className="relative flex items-start gap-[3%] pl-[clamp(24px,5cqw,48px)]">
              <span className="absolute left-[clamp(2px,1cqw,8px)] top-1 h-[clamp(12px,2.5cqw,20px)] w-[clamp(12px,2.5cqw,20px)] rounded-full border-[3px] border-white shadow" style={{ backgroundColor: accent }} />
              <span className="shrink-0 rounded-full px-3 py-1 text-[clamp(10px,1.8cqw,16px)] font-semibold text-white" style={{ backgroundColor: accent }}>{item.date}</span>
              <span>
                <span className="block text-[clamp(13px,2.4cqw,24px)] font-semibold text-slate-900">{item.label}</span>
                {item.description && <span className="block text-[clamp(10px,1.8cqw,16px)] text-slate-500">{item.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VersusLayout({ card }: { card: VersusCard }) {
  const leftColor = card.left.color ?? "#4f46e5";
  const rightColor = card.right.color ?? "#f59e0b";
  const rows = Math.max(card.left.points.length, card.right.points.length);
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="grid flex-1 grid-cols-2 gap-[3%]">
        {([{ side: card.left, color: leftColor }, { side: card.right, color: rightColor }] as const).map(({ side, color }, i) => (
          <div key={i} className="flex flex-col rounded-2xl border-2 p-[5%]" style={{ borderColor: color, backgroundColor: `${color}0d` }}>
            <h3 className="mb-[4%] text-center text-[clamp(14px,3cqw,30px)] font-bold" style={{ color }}>{side.name}</h3>
            <ul className="flex flex-1 flex-col justify-start gap-[3%]">
              {Array.from({ length: rows }, (_, r) => (
                <li key={r} className="flex items-start gap-2 text-[clamp(11px,2cqw,19px)] text-slate-700">
                  {side.points[r] && <><span className="mt-[0.3em] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />{side.points[r]}</>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {card.verdict && (
        <p className="mt-[3%] rounded-xl bg-slate-100 px-4 py-2 text-center text-[clamp(11px,2cqw,18px)] font-medium text-slate-700">{card.verdict}</p>
      )}
    </div>
  );
}

function MatrixLayout({ card }: { card: MatrixCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  const [tl, tr, bl, br] = card.quadrantLabels ?? ["", "", "", ""];
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="relative mx-[6%] mb-[6%] flex-1">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-xl border border-slate-200">
          {[tl, tr, bl, br].map((q, i) => (
            <div key={i} className={`flex items-${i < 2 ? "start" : "end"} ${i % 2 === 0 ? "justify-start" : "justify-end"} p-2 ${i === 0 ? "rounded-tl-xl" : i === 1 ? "rounded-tr-xl" : i === 2 ? "rounded-bl-xl" : "rounded-br-xl"} ${i % 3 === 0 ? "bg-slate-50" : "bg-white"} border-slate-200 ${i < 2 ? "border-b" : ""} ${i % 2 === 0 ? "border-r" : ""}`}>
              {q && <span className="text-[clamp(9px,1.6cqw,14px)] font-semibold uppercase tracking-wide text-slate-400">{q}</span>}
            </div>
          ))}
        </div>
        {card.items.map((item, i) => (
          <span key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[clamp(10px,1.8cqw,16px)] font-semibold text-white shadow"
            style={{ left: `${item.x}%`, top: `${100 - item.y}%`, backgroundColor: accent }}>
            {item.label}
          </span>
        ))}
        <span className="absolute -bottom-[clamp(18px,3cqw,28px)] left-0 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.xAxis.low}</span>
        <span className="absolute -bottom-[clamp(18px,3cqw,28px)] right-0 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.xAxis.high}</span>
        <span className="absolute -left-[2%] bottom-0 origin-bottom-left -rotate-90 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.yAxis.low}</span>
        <span className="absolute -left-[2%] top-0 origin-top-left -rotate-90 translate-y-full text-[clamp(9px,1.6cqw,14px)] text-slate-500">{card.yAxis.high}</span>
      </div>
    </div>
  );
}

function FunnelLayout({ card }: { card: FunnelCard }) {
  const accent = card.accent ?? DEFAULT_ACCENT;
  const n = card.stages.length;
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 flex-col items-center justify-around gap-[2%]">
        {card.stages.map((stage, i) => {
          const width = 100 - (i * 55) / Math.max(n - 1, 1);
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: `${width}%` }}>
              <div className="flex w-full items-center justify-between gap-3 rounded-xl px-[4%] py-[2%] text-white shadow"
                style={{ backgroundColor: accent, opacity: 1 - i * (0.5 / Math.max(n - 1, 1)) }}>
                <span className="text-[clamp(11px,2.2cqw,20px)] font-semibold">{stage.label}</span>
                {stage.value && <span className="text-[clamp(12px,2.4cqw,22px)] font-bold tabular-nums">{stage.value}</span>}
              </div>
              {stage.note && <span className="mt-1 text-[clamp(9px,1.6cqw,14px)] text-slate-500">{stage.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VennLayout({ card }: { card: VennCard }) {
  const colors = ["#4f46e5", "#f59e0b"];
  const [setA, setB] = card.sets.length >= 2 ? [card.sets[0], card.sets[1]] : [{ label: "A", items: [] }, { label: "B", items: [] }];
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 grid-cols-3 gap-[2%]" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {[
          { label: setA.label, items: setA.items, color: colors[0] },
          { label: "Both", items: card.intersection, color: "#6b7280" },
          { label: setB.label, items: setB.items, color: colors[1] },
        ].map(({ label, items, color }, i) => (
          <div key={i} className="flex flex-col rounded-2xl p-[5%]" style={{ backgroundColor: `${color}15`, border: `2px solid ${color}40` }}>
            <h3 className="mb-[6%] text-center text-[clamp(12px,2.5cqw,22px)] font-bold" style={{ color }}>{label}</h3>
            <ul className="flex flex-1 flex-col gap-[4%]">
              {items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-[clamp(10px,1.8cqw,16px)] text-slate-700">
                  <span className="mt-[0.3em] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  S: "#ef4444", A: "#f97316", B: "#eab308", C: "#22c55e", D: "#94a3b8",
};

function TierListLayout({ card }: { card: TierListCard }) {
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 flex-col justify-around gap-[2%]">
        {card.tiers.map((tier, i) => {
          const color = tier.color ?? TIER_COLORS[tier.label] ?? "#94a3b8";
          return (
            <div key={i} className="flex min-h-0 items-center gap-[3%] overflow-hidden rounded-xl">
              <div className="flex h-full w-[14%] shrink-0 items-center justify-center rounded-xl text-[clamp(14px,3cqw,28px)] font-black text-white" style={{ backgroundColor: color }}>
                {tier.label}
              </div>
              <div className="flex flex-1 flex-wrap gap-[2%]">
                {tier.items.map((item, j) => (
                  <span key={j} className="rounded-lg px-3 py-1 text-[clamp(10px,1.8cqw,16px)] font-medium" style={{ backgroundColor: `${color}20`, color }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ICEBERG_COLORS = ["#bfdbfe", "#60a5fa", "#2563eb", "#1e40af", "#1e3a5f"];

function IcebergLayout({ card }: { card: IcebergCard }) {
  const n = card.layers.length;
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex flex-1 flex-col items-center justify-around gap-[1.5%]">
        {card.layers.map((layer, i) => {
          const inset = ((n - 1 - i) / Math.max(n - 1, 1)) * 20;
          const bgColor = ICEBERG_COLORS[Math.min(i, ICEBERG_COLORS.length - 1)];
          const textColor = i >= 2 ? "#ffffff" : "#1e3a8a";
          return (
            <div key={i} className="flex flex-col items-center rounded-xl px-[4%] py-[2.5%]"
              style={{ width: `${100 - inset}%`, backgroundColor: bgColor }}>
              <span className="mb-1 text-[clamp(11px,2cqw,18px)] font-bold" style={{ color: textColor }}>{layer.label}</span>
              <span className="text-center text-[clamp(9px,1.6cqw,14px)]" style={{ color: textColor, opacity: 0.85 }}>
                {layer.items.join(" · ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlignmentLayout({ card }: { card: AlignmentCard }) {
  const cellMap = new Map(card.cells.map((c) => [`${c.x},${c.y}`, c]));
  return (
    <div className="flex h-full flex-col">
      <CardTitle>{card.title}</CardTitle>
      <div className="flex-1 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gridTemplateRows: "auto 1fr 1fr 1fr" }}>
        {/* top-left empty corner */}
        <div />
        {/* column headers */}
        {card.xAxis.map((label, x) => (
          <div key={x} className="flex items-center justify-center bg-slate-100 p-2 text-[clamp(9px,1.6cqw,14px)] font-semibold text-slate-600">
            {label}
          </div>
        ))}
        {/* rows */}
        {card.yAxis.map((rowLabel, y) => (
          <React.Fragment key={y}>
            {/* row header */}
            <div className="flex items-center justify-center bg-slate-100 px-2 text-[clamp(9px,1.6cqw,14px)] font-semibold text-slate-600" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
              {rowLabel}
            </div>
            {/* cells */}
            {card.xAxis.map((_, x) => {
              const cell = cellMap.get(`${x},${y}`);
              return (
                <div key={`${x},${y}`} className={`flex flex-col items-center justify-center border border-slate-200 p-2 text-center ${(x + y) % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                  {cell ? (
                    <>
                      <span className="text-[clamp(10px,1.8cqw,16px)] font-semibold text-slate-900">{cell.label}</span>
                      {cell.description && <span className="mt-1 text-[clamp(8px,1.4cqw,12px)] text-slate-500">{cell.description}</span>}
                    </>
                  ) : null}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
