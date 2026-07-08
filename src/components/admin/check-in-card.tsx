import type { ComponentProps } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateOnly, formatDateTime } from "@/lib/admin-format";
import type { CheckInRegistration } from "@/lib/check-in";
import { isConfirmedPaid } from "@/lib/check-in";

type CheckInCardProps = {
  registration: CheckInRegistration;
  formAction?: ComponentProps<"form">["action"];
};

export function CheckInCard({ registration, formAction }: CheckInCardProps) {
  const checkIn = registration.checkIns[0];
  const confirmedPaid = isConfirmedPaid(registration);
  const state = getCardState(registration);
  const canSubmit =
    formAction &&
    confirmedPaid &&
    checkIn &&
    (checkIn.status === "ELIGIBLE" || checkIn.status === "CHECKED_IN");

  return (
    <article className={`rounded-lg border p-5 ${toneByState[state]}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-white/50">
            {registration.participantCode ?? "Participant code pending"}
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white">
            {registration.fullName}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={registration.status} />
          <StatusBadge value={registration.paymentStatus} />
          <StatusBadge value={checkIn?.status ?? null} />
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Info label="Phone" value={registration.phone} />
        <Info label="Email" value={registration.email} />
        <Info label="Vehicle" value={registration.carBrandModel} />
        <Info label="Plate" value={registration.plateNumber} />
        <Info label="Package" value={`${registration.package.name} (${registration.package.code})`} />
        <Info
          label="Event date"
          value={checkIn ? formatDateOnly(checkIn.eventDate) : "No eligible row"}
        />
      </dl>

      <div className="mt-6 rounded-md border border-white/10 bg-black/10 p-4">
        {checkIn?.status === "CHECKED_IN" ? (
          <div>
            <p className="text-sm font-black uppercase text-signal">
              Already checked in at {formatDateTime(checkIn.checkedInAt)}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/70">
              Duplicate attempts recorded: {checkIn.duplicateAttemptCount}
            </p>
          </div>
        ) : checkIn?.status === "ELIGIBLE" && confirmedPaid ? (
          <p className="text-sm font-black uppercase text-emerald-100">
            Eligible for check-in
          </p>
        ) : (
          <p className="text-sm font-black uppercase text-red-100">
            Not eligible for check-in
          </p>
        )}
      </div>

      {canSubmit ? (
        <form action={formAction} className="mt-6">
          <button
            type="submit"
            className={`h-14 w-full rounded-full px-6 text-base font-black transition sm:w-auto ${
              checkIn.status === "CHECKED_IN"
                ? "bg-signal text-asphalt hover:bg-white"
                : "bg-emerald-500 text-white hover:bg-white hover:text-asphalt"
            }`}
          >
            {checkIn.status === "CHECKED_IN" ? "Record duplicate scan" : "Confirm check-in"}
          </button>
        </form>
      ) : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 pb-3">
      <dt className="text-xs font-black uppercase text-white/45">{label}</dt>
      <dd className="mt-2 break-words text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function getCardState(registration: CheckInRegistration) {
  if (!isConfirmedPaid(registration)) {
    return "invalid";
  }

  const checkIn = registration.checkIns[0];

  if (!checkIn || checkIn.status === "BLOCKED" || checkIn.status === "VOID") {
    return "invalid";
  }

  if (checkIn.status === "CHECKED_IN") {
    return "duplicate";
  }

  return "eligible";
}

const toneByState = {
  eligible: "border-emerald-400/30 bg-emerald-400/10",
  duplicate: "border-signal/40 bg-signal/10",
  invalid: "border-kerb/40 bg-kerb/10",
} as const;
