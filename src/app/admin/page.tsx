import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/admin-format";
import { requireOwnerAdmin } from "@/lib/admin-authorization";
import { kulaCheckInDate, kulaEventSlug, kulaPackageCode } from "@/lib/event-config";
import { prisma } from "@/lib/prisma";
import { getAdminReadinessWarnings } from "@/lib/production-readiness";
import { measureServerTiming } from "@/lib/server-timing";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireOwnerAdmin();

  const event = await measureServerTiming("ADMIN_DASHBOARD_QUERY", () =>
    prisma.event.findUnique({
      where: { slug: kulaEventSlug },
      select: {
        id: true,
        status: true,
        packages: {
          where: { code: kulaPackageCode },
          take: 1,
          select: {
            id: true,
            name: true,
            code: true,
            capacity: true,
            price: true,
          },
        },
      },
    }),
  );

  const eventPackage = event?.packages[0];

  if (!event || !eventPackage) {
    notFound();
  }

  const eventMetricsPromise = prisma.$transaction([
    prisma.registration.count({
      where: {
        eventId: event.id,
        deletedAt: null,
        status: "CONFIRMED",
      },
    }),
    prisma.registration.count({
      where: {
        eventId: event.id,
        deletedAt: null,
        status: {
          notIn: ["REJECTED", "CANCELLED"],
        },
        OR: [{ status: "PENDING_PAYMENT" }, { paymentStatus: "UNPAID" }],
      },
    }),
    prisma.payment.count({
      where: {
        status: "FAILED",
        registration: {
          eventId: event.id,
          deletedAt: null,
        },
      },
    }),
    prisma.checkIn.count({
      where: {
        eventDate: kulaCheckInDate,
        status: "CHECKED_IN",
        registration: {
          eventId: event.id,
          deletedAt: null,
        },
      },
    }),
    prisma.registration.count({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        deletedAt: null,
        status: {
          in: ["PENDING_PAYMENT", "CONFIRMED"],
        },
      },
    }),
    prisma.registration.findMany({
      where: { eventId: event.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        participantCode: true,
        fullName: true,
        carBrandModel: true,
        plateNumber: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
  ]);
  const memberMetricsPromise = prisma.$transaction([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: completedMemberProfileWhere() }),
    prisma.user.count({
      where: {
        deletedAt: null,
        vehicles: {
          some: {
            deletedAt: null,
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        registrations: {
          some: {
            deletedAt: null,
          },
        },
      },
    }),
  ]);
  const [
    [
      totalConfirmed,
      pendingUnpaid,
      failedPayments,
      checkedInCount,
      reservedCount,
      latestRegistrations,
    ],
    [
      totalMembers,
      completedProfiles,
      membersWithActiveVehicle,
      membersWithRegistration,
    ],
  ] = await measureServerTiming("ADMIN_DASHBOARD_QUERY", () =>
    Promise.all([eventMetricsPromise, memberMetricsPromise]),
  );

  const remainingCapacity =
    eventPackage.capacity > 0 ? Math.max(eventPackage.capacity - reservedCount, 0) : null;
  const readinessWarnings = getAdminReadinessWarnings({
    packagePriceIsZero: eventPackage.price.lte(0),
    packageCapacity: eventPackage.capacity,
  });

  return (
    <AdminShell
      title="Operations dashboard"
      eyebrow="Sunday, 20 September 2026"
      actions={
        <>
          <Link
            href="/admin/check-in"
            className="inline-flex h-11 items-center rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
          >
            Check-in mode
          </Link>
          <Link
            href="/admin/participants"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            View participants
          </Link>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Confirmed" value={totalConfirmed.toString()} />
        <MetricCard label="Pending or unpaid" value={pendingUnpaid.toString()} />
        <MetricCard label="Failed payments" value={failedPayments.toString()} tone="danger" />
        <MetricCard label="Checked in" value={checkedInCount.toString()} />
        <MetricCard
          label="Remaining capacity"
          value={remainingCapacity === null ? "No cap" : remainingCapacity.toString()}
          detail={`${reservedCount} reserved`}
        />
      </section>

      {readinessWarnings.length > 0 ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {readinessWarnings.map((warning) => (
            <article
              key={warning.title}
              className="rounded-lg border border-signal/40 bg-signal/10 p-5"
            >
              <p className="text-sm font-black uppercase text-signal">{warning.title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                {warning.body}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-white/10 bg-white/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-signal">Members CRM</p>
            <h2 className="mt-1 text-xl font-black">Üye hesapları</h2>
          </div>
          <Link
            href="/admin/members"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Üyeleri aç
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Toplam üye" value={totalMembers.toString()} />
          <MetricCard label="Tamamlanan profil" value={completedProfiles.toString()} />
          <MetricCard
            label="Aktif araçlı üye"
            value={membersWithActiveVehicle.toString()}
          />
          <MetricCard
            label="Başvurulu üye"
            value={membersWithRegistration.toString()}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <article className="rounded-lg border border-white/10 bg-white/10 p-5">
          <p className="text-sm font-black uppercase text-signal">Package</p>
          <h2 className="mt-3 text-2xl font-black">{eventPackage.name}</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InfoRow label="Code" value={eventPackage.code} />
            <InfoRow label="Capacity" value={eventPackage.capacity > 0 ? eventPackage.capacity : "No cap set"} />
            <InfoRow label="Reserved" value={reservedCount} />
            <InfoRow label="Event status" value={event.status} />
          </dl>
        </article>

        <article className="overflow-hidden rounded-lg border border-white/10 bg-white/10">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-black uppercase text-signal">Latest registrations</p>
              <h2 className="mt-1 text-xl font-black">Recent activity</h2>
            </div>
            <Link
              href="/admin/participants"
              className="text-sm font-black text-white/70 transition hover:text-white"
            >
              Open list
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
                <tr>
                  <th className="px-5 py-3">Participant</th>
                  <th className="px-5 py-3">Vehicle</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {latestRegistrations.map((registration) => (
                  <tr key={registration.id} className="align-top">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/participants/${registration.id}`}
                        className="font-black text-white transition hover:text-signal"
                      >
                        {registration.fullName}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-white/45">
                        {registration.participantCode ?? "Code pending"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-white/75">
                      {registration.carBrandModel}
                      <p className="mt-1 text-xs font-black text-white/45">
                        {registration.plateNumber}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={registration.status} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={registration.paymentStatus} />
                    </td>
                    <td className="px-5 py-4 text-white/65">
                      {formatDateTime(registration.createdAt)}
                    </td>
                  </tr>
                ))}
                {latestRegistrations.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-white/60" colSpan={5}>
                      No registrations yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </AdminShell>
  );
}

function completedMemberProfileWhere() {
  return {
    deletedAt: null,
    memberKvkkAcceptedAt: {
      not: null,
    },
    memberTermsAcceptedAt: {
      not: null,
    },
    profile: {
      is: {
        fullName: {
          not: null,
        },
        phone: {
          not: null,
        },
      },
    },
  };
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <article
      className={`rounded-lg border p-5 ${
        tone === "danger"
          ? "border-kerb/30 bg-kerb/10"
          : "border-white/10 bg-white/10"
      }`}
    >
      <p className="text-xs font-black uppercase text-white/50">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      {detail ? <p className="mt-2 text-sm font-semibold text-white/55">{detail}</p> : null}
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <dt className="font-semibold text-white/50">{label}</dt>
      <dd className="font-black text-white">{value}</dd>
    </div>
  );
}
