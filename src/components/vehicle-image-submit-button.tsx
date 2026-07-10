"use client";

import { useFormStatus } from "react-dom";

type VehicleImageSubmitButtonProps = {
  children: string;
  pendingLabel: string;
  variant?: "primary" | "danger";
};

export function VehicleImageSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: VehicleImageSubmitButtonProps) {
  const { pending } = useFormStatus();
  const className =
    variant === "primary"
      ? "inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:-translate-y-0.5 hover:bg-ats-blue-hover hover:shadow-[0_16px_34px_rgba(76,201,240,0.22)] focus:outline-none focus:ring-2 focus:ring-ats-blue/40 disabled:pointer-events-none disabled:opacity-60"
      : "inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-muted transition hover:border-red-300/60 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/20 disabled:pointer-events-none disabled:opacity-60";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
