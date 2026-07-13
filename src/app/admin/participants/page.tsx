import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AdminPermissionBanner } from "@/components/admin/admin-permission-banner";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/admin-format";
import { adminHasCapability, requireAdminCapability } from "@/lib/admin-authorization";
import { kulaEventSlug } from "@/lib/event-config";
import { prisma } from "@/lib/prisma";

const statusFilters = [
  { value: "active", label: "All active" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
] as const;
const paymentStatuses = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "REVIEW"] as const;
const pageSize = 50;
const maxQueryLength = 100;

type ParticipantsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
    page?: string;
    adminError?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage({ searchParams }: ParticipantsPageProps) {
  const adminActor = await requireAdminCapability("registrations.read");
  const canExport = adminHasCapability(adminActor.role, "registrations.manage");

  const filters = await searchParams;
  const query = normalizeQuery(filters.q);
  const status = isStatusFilter(filters.status) ? filters.status : "active";
  const paymentStatus = isPaymentStatus(filters.paymentStatus) ? filters.paymentStatus : undefined;
  const page = normalizePage(filters.page);
  const skip = (page - 1) * pageSize;

  const where: Prisma.RegistrationWhereInput = {
    event: {
      slug: kulaEventSlug,
    },
  };

  if (status === "archived") {
    where.deletedAt = {
      not: null,
    };
  } else {
    where.deletedAt = null;
  }

  if (status === "pending") {
    where.status = "PENDING_PAYMENT";
  }

  if (status === "confirmed") {
    where.status = "CONFIRMED";
  }

  if (status === "rejected") {
    where.status = "REJECTED";
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (query) {
    where.OR = [
      { fullName: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { plateNumber: { contains: query, mode: "insensitive" } },
      { participantCode: { contains: query, mode: "insensitive" } },
    ];
  }

  const [totalParticipants, participants] = await prisma.$transaction([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        participantCode: true,
        fullName: true,
        phone: true,
        email: true,
        carBrandModel: true,
        plateNumber: true,
        status: true,
        paymentStatus: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
  ]);
  const totalPages = Math.max(Math.ceil(totalParticipants / pageSize), 1);
  const startRow = totalParticipants === 0 ? 0 : skip + 1;
  const endRow = Math.min(skip + participants.length, totalParticipants);

  return (
    <AdminShell
      title="Participants"
      eyebrow="Registration operations"
      actions={
        canExport ? (
          <Link
            href="/admin/export"
            className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-asphalt transition hover:bg-signal"
          >
            Export CSV
          </Link>
        ) : null
      }
    >
      <AdminPermissionBanner code={filters.adminError} />

      <form
        action="/admin/participants"
        method="get"
        className="grid gap-3 rounded-lg border border-white/10 bg-white/10 p-4 md:grid-cols-[1fr_180px_180px_auto_auto]"
      >
        <label className="block">
          <span className="text-xs font-black uppercase text-white/50">Search</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="Name, phone, email, plate, code"
            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-white/50">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
          >
            {statusFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-white/50">Payment</span>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-white/15 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
          >
            <option value="">All</option>
            {paymentStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 self-end rounded-full bg-kerb px-5 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
        >
          Filter
        </button>
        <Link
          href="/admin/participants"
          className="inline-flex h-11 items-center justify-center self-end rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Clear
        </Link>
      </form>

      <section className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/10">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <p className="text-sm font-black uppercase text-signal">
            {totalParticipants} participants · {startRow}-{endRow} ·{" "}
            {statusFilters.find((item) => item.value === status)?.label}
          </p>
          <p className="text-xs font-semibold text-white/45">
            QR token hashes are not shown.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Participant</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {participants.map((participant) => (
                <tr key={participant.id} className="align-top transition hover:bg-white/5">
                  <td className="px-5 py-4 font-black text-white">
                    <Link href={`/admin/participants/${participant.id}`} className="transition hover:text-signal">
                      {participant.participantCode ?? "Pending"}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/participants/${participant.id}`}
                      className="font-black text-white transition hover:text-signal"
                    >
                      {participant.fullName}
                    </Link>
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      {participant.email}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    <p>{participant.phone}</p>
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      {participant.email}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-white/70">
                    <p>{participant.carBrandModel}</p>
                    <p className="mt-1 text-xs font-black text-white/45">
                      {participant.plateNumber}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <StatusBadge value={participant.status} />
                      {participant.deletedAt ? <StatusBadge value="ARCHIVED" /> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={participant.paymentStatus} />
                  </td>
                  <td className="px-5 py-4 text-white/60">
                    {formatDateTime(participant.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/participants/${participant.id}`}
                      className="font-black text-signal transition hover:text-white"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {participants.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-white/60" colSpan={8}>
                    No participants match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white/55">
          Page {page} / {totalPages}
        </p>
        <div className="flex gap-3">
          <PaginationLink
            href={participantsHref({ query, status, paymentStatus, page: Math.max(page - 1, 1) })}
            disabled={page <= 1}
          >
            Previous
          </PaginationLink>
          <PaginationLink
            href={participantsHref({
              query,
              status,
              paymentStatus,
              page: Math.min(page + 1, totalPages),
            })}
            disabled={page >= totalPages}
          >
            Next
          </PaginationLink>
        </div>
      </nav>
    </AdminShell>
  );
}

function isStatusFilter(value?: string): value is (typeof statusFilters)[number]["value"] {
  return Boolean(value && statusFilters.some((item) => item.value === value));
}

function isPaymentStatus(value?: string): value is (typeof paymentStatuses)[number] {
  return Boolean(value && paymentStatuses.includes(value as (typeof paymentStatuses)[number]));
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-11 items-center rounded-full border border-white/10 px-5 text-sm font-black text-white/25">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
    >
      {children}
    </Link>
  );
}

function participantsHref({
  query,
  status,
  paymentStatus,
  page,
}: {
  query: string;
  status: (typeof statusFilters)[number]["value"];
  paymentStatus?: (typeof paymentStatuses)[number];
  page: number;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (status !== "active") {
    params.set("status", status);
  }

  if (paymentStatus) {
    params.set("paymentStatus", paymentStatus);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const search = params.toString();
  return search ? `/admin/participants?${search}` : "/admin/participants";
}

function normalizeQuery(value?: string) {
  return value?.trim().slice(0, maxQueryLength) ?? "";
}

function normalizePage(value?: string) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}
