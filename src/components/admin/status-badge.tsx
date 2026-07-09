type StatusBadgeProps = {
  value?: string | null;
};

const toneByStatus: Record<string, string> = {
  CONFIRMED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  SUCCESS: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  CHECKED_IN: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  PENDING_PAYMENT: "border-signal/40 bg-signal/10 text-signal",
  UNPAID: "border-signal/40 bg-signal/10 text-signal",
  INITIATED: "border-signal/40 bg-signal/10 text-signal",
  ELIGIBLE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  FAILED: "border-kerb/40 bg-kerb/10 text-red-100",
  CANCELLED: "border-kerb/40 bg-kerb/10 text-red-100",
  REJECTED: "border-kerb/40 bg-kerb/10 text-red-100",
  BLOCKED: "border-kerb/40 bg-kerb/10 text-red-100",
  ARCHIVED: "border-white/15 bg-white/10 text-white/60",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const label = value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "-";
  const tone = value ? toneByStatus[value] : undefined;

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        tone ?? "border-white/15 bg-white/10 text-white/70"
      }`}
    >
      {label}
    </span>
  );
}
