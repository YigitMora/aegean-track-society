import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { CheckInCard } from "@/components/admin/check-in-card";
import { formatDateTime } from "@/lib/admin-format";
import type { CheckInRegistration } from "@/lib/check-in";
import { lookupRegistrationByQrToken } from "@/lib/check-in";
import { requireCheckinOrOwner } from "@/lib/admin-authorization";
import { confirmQrCheckIn } from "./actions";

type CheckInTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    result?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckInTokenPage({
  params,
  searchParams,
}: CheckInTokenPageProps) {
  const { token } = await params;
  const returnPath = `/check-in/${encodeURIComponent(token)}`;

  await requireCheckinOrOwner(returnPath);

  const { result } = await searchParams;
  const lookup = await lookupRegistrationByQrToken(token);

  return (
    <AdminShell
      title="QR check-in"
      eyebrow="Sunday, 20 September 2026"
      actions={
        <Link
          href="/admin/check-in"
          className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Manual search
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <CheckInResultBanner result={result} registration={lookup.type === "found" ? lookup.registration : null} />

        {lookup.type === "found" ? (
          <CheckInCard
            registration={lookup.registration}
            formAction={confirmQrCheckIn.bind(null, token)}
          />
        ) : (
          <section className="rounded-lg border border-kerb/40 bg-kerb/10 p-5">
            <p className="text-sm font-black uppercase text-red-100">Invalid QR</p>
            <h2 className="mt-3 text-3xl font-black text-white">
              This QR code cannot be checked in.
            </h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/70">
              The token was not found, or the registration is not confirmed and paid.
            </p>
            <Link
              href="/admin/check-in"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-asphalt transition hover:bg-signal"
            >
              Search manually
            </Link>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function CheckInResultBanner({
  result,
  registration,
}: {
  result?: string;
  registration: CheckInRegistration | null;
}) {
  if (!result) {
    return null;
  }

  const checkIn = registration?.checkIns[0];

  if (result === "checked-in") {
    return (
      <Alert tone="success" title="Checked in" body="Participant check-in is confirmed." />
    );
  }

  if (result === "duplicate") {
    return (
      <Alert
        tone="warning"
        title={`Already checked in at ${formatDateTime(checkIn?.checkedInAt)}`}
        body="Original check-in time was preserved and the duplicate attempt was recorded."
      />
    );
  }

  return (
    <Alert
      tone="danger"
      title="Check-in rejected"
      body="Registration is invalid, unpaid, unconfirmed, or not eligible for this event date."
    />
  );
}

function Alert({
  tone,
  title,
  body,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  body: string;
}) {
  const className =
    tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : tone === "warning"
        ? "border-signal/40 bg-signal/10 text-signal"
        : "border-kerb/40 bg-kerb/10 text-red-100";

  return (
    <section className={`rounded-lg border p-4 ${className}`}>
      <p className="text-sm font-black uppercase">{title}</p>
      <p className="mt-2 text-sm font-semibold text-white/75">{body}</p>
    </section>
  );
}
