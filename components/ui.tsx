import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(42,26,18,0.04),0_8px_24px_-12px_rgba(42,26,18,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SlotTag({ slot }: { slot: "lunch" | "dinner" }) {
  const lunch = slot === "lunch";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
        lunch ? "bg-gold/10 text-gold" : "bg-terracotta/10 text-terracotta"
      }`}
    >
      {slot}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl leading-none text-ink">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {sub ? <p className="mt-1 text-sm leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}
