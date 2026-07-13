import Link from "next/link";
import { AdminPermissionBanner } from "@/components/admin/admin-permission-banner";
import { AdminShell } from "@/components/admin/admin-shell";
import { BrowserQrScanner } from "@/components/admin/browser-qr-scanner";
import { CheckInCard } from "@/components/admin/check-in-card";
import { formatDateTime } from "@/lib/admin-format";
import {
  type CheckInRegistration,
  getCheckInRegistrationById,
  searchCheckInRegistrations,
} from "@/lib/check-in";
import { requireCheckinOrOwner } from "@/lib/admin-authorization";
import { confirmManualCheckIn, lookupQrInput } from "./actions";

type AdminCheckInPageProps = {
  searchParams: Promise<{
    q?: string;
    registrationId?: string;
    result?: string;
    adminError?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminCheckInPage({ searchParams }: AdminCheckInPageProps) {
  const adminActor = await requireCheckinOrOwner();

  const { q, registrationId, result, adminError } = await searchParams;
  const query = q?.trim() ?? "";
  const selectedRegistration = registrationId
    ? await getCheckInRegistrationById(registrationId)
    : null;
  const searchResults = query ? await searchCheckInRegistrations(query) : [];
  const visibleResults = selectedRegistration
    ? searchResults.filter((registration) => registration.id !== selectedRegistration.id)
    : searchResults;

  return (
    <AdminShell
      title="Check-in"
      eyebrow="Pit-lane mode"
      actions={
        adminActor.role === "OWNER" ? (
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Dashboard
          </Link>
        ) : null
      }
    >
      <AdminPermissionBanner code={adminError} />

      <div className="mx-auto max-w-4xl space-y-6">
        <CheckInResultBanner result={result} registration={selectedRegistration} />

        <section className="rounded-lg border border-white/10 bg-white/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-signal">QR lookup</p>
              <h2 className="mt-2 text-2xl font-black text-white">Scan or paste QR token</h2>
            </div>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-black uppercase text-white/45">
              Camera enabled where supported
            </span>
          </div>
          <BrowserQrScanner />
          <form action={lookupQrInput} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="qrToken"
              placeholder="Paste /check-in/... URL or raw token"
              className="h-14 rounded-md border border-white/15 bg-white px-4 text-base font-bold text-asphalt outline-none transition focus:border-signal"
            />
            <button
              type="submit"
              className="h-14 rounded-full bg-kerb px-6 text-base font-black text-white transition hover:bg-white hover:text-asphalt"
            >
              Lookup QR
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/10 p-5">
          <p className="text-sm font-black uppercase text-signal">Manual fallback</p>
          <form action="/admin/check-in" method="get" className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="q"
              defaultValue={query}
              placeholder="Participant code, name, phone, email, or plate"
              className="h-14 rounded-md border border-white/15 bg-white px-4 text-base font-bold text-asphalt outline-none transition focus:border-signal"
            />
            <button
              type="submit"
              className="h-14 rounded-full bg-white px-6 text-base font-black text-asphalt transition hover:bg-signal"
            >
              Search
            </button>
          </form>
        </section>

        {selectedRegistration ? (
          <CheckInCard
            registration={selectedRegistration}
            formAction={confirmManualCheckIn.bind(null, selectedRegistration.id)}
          />
        ) : null}

        {query ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase text-white/50">
                {searchResults.length} matches
              </p>
              <Link
                href="/admin/check-in"
                className="text-sm font-black text-white/55 transition hover:text-white"
              >
                Clear
              </Link>
            </div>
            {visibleResults.map((registration) => (
              <CheckInCard
                key={registration.id}
                registration={registration}
                formAction={confirmManualCheckIn.bind(null, registration.id)}
              />
            ))}
            {searchResults.length === 0 ? (
              <section className="rounded-lg border border-kerb/40 bg-kerb/10 p-5">
                <p className="text-sm font-black uppercase text-red-100">No match</p>
                <p className="mt-2 text-sm font-semibold text-white/70">
                  No participant matched that search.
                </p>
              </section>
            ) : null}
          </section>
        ) : null}
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

  if (result === "invalid_token") {
    return (
      <Alert
        tone="danger"
        title="Invalid QR"
        body="The QR token or URL could not be read."
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
