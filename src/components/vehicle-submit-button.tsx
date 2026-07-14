"use client";

import { useFormStatus } from "react-dom";

type VehicleSubmitButtonProps = {
  children: string;
  pendingLabel: string;
};

export function VehicleSubmitButton({
  children,
  pendingLabel,
}: VehicleSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40 disabled:cursor-wait disabled:bg-ats-blue/60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
