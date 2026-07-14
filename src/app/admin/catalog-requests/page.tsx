import Link from "next/link";
import type { VehicleCatalogMatchRequestStatus } from "@prisma/client";
import { AdminPermissionBanner } from "@/components/admin/admin-permission-banner";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOwnerAdmin } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";

type CatalogRequestsPageProps = {
  searchParams: Promise<{
    status?: string;
    adminError?: string;
  }>;
};

const statusFilters = [
  { label: "Bekleyen", value: "pending" },
  { label: "İncelemede", value: "in_review" },
  { label: "Tamamlandı", value: "completed" },
  { label: "Reddedildi", value: "rejected" },
  { label: "Tümü", value: "all" },
] as const;

const statusOrder: Record<VehicleCatalogMatchRequestStatus, number> = {
  PENDING: 0,
  IN_REVIEW: 1,
  COMPLETED: 2,
  REJECTED: 3,
};

export default async function AdminCatalogRequestsPage({
  searchParams,
}: CatalogRequestsPageProps) {
  await requireOwnerAdmin();
  const params = await searchParams;
  const statusFilter = normalizeStatusFilter(params.status);
  const requests = await prisma.vehicleCatalogMatchRequest.findMany({
    where: statusWhere(statusFilter),
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      user: {
        select: {
          email: true,
          profile: {
            select: {
              fullName: true,
              displayName: true,
            },
          },
        },
      },
      vehicle: {
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          plateNumber: true,
          deletedAt: true,
          vehicleDefinitionId: true,
        },
      },
    },
  });
  const sortedRequests = [...requests].sort(
    (a, b) =>
      statusOrder[a.status] - statusOrder[b.status] ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <AdminShell title="Katalog Talepleri" eyebrow="Vehicle catalog">
      <AdminPermissionBanner code={params.adminError} />

      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "all"
                ? "/admin/catalog-requests?status=all"
                : `/admin/catalog-requests?status=${filter.value}`
            }
            className={`rounded-full border px-4 py-2 text-sm font-black transition ${
              statusFilter === filter.value
                ? "border-signal bg-signal text-asphalt"
                : "border-white/15 text-white/70 hover:border-white hover:text-white"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-black/30 text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Üye</th>
                <th className="px-4 py-3">Araç</th>
                <th className="px-4 py-3">Katalog</th>
                <th className="px-4 py-3">Oluşturma</th>
                <th className="px-4 py-3">Yaş</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedRequests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="px-4 py-4">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-white">
                      {memberName(request.user)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      {request.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {request.vehicle ? (
                      <>
                        <p className="font-black text-white">
                          {request.vehicle.brand} {request.vehicle.model}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/45">
                          {[request.vehicle.year, request.vehicle.plateNumber]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-white/45">Araç kaydı yok</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-white/60">
                    {catalogMatchState(request.vehicle)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-white/60">
                    {formatDateTime(request.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-white/60">
                    {requestAge(request.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/catalog-requests/${request.id}`}
                      className="inline-flex h-9 items-center rounded-full border border-signal/50 px-3 text-xs font-black uppercase text-signal transition hover:bg-signal hover:text-asphalt"
                    >
                      İncele
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedRequests.length === 0 ? (
          <p className="p-6 text-sm font-semibold text-white/55">
            Bu filtrede katalog eşleştirme talebi yok.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}

function normalizeStatusFilter(value: string | undefined) {
  if (
    value === "pending" ||
    value === "in_review" ||
    value === "completed" ||
    value === "rejected" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function statusWhere(statusFilter: ReturnType<typeof normalizeStatusFilter>) {
  if (statusFilter === "all") {
    return {};
  }

  const statusMap = {
    pending: "PENDING",
    in_review: "IN_REVIEW",
    completed: "COMPLETED",
    rejected: "REJECTED",
  } satisfies Record<Exclude<typeof statusFilter, "all">, VehicleCatalogMatchRequestStatus>;

  return {
    status: statusMap[statusFilter],
  };
}

function StatusBadge({ status }: { status: VehicleCatalogMatchRequestStatus }) {
  const className =
    status === "PENDING"
      ? "border-amber-300/35 bg-amber-400/10 text-amber-100"
      : status === "IN_REVIEW"
        ? "border-signal/40 bg-signal/10 text-signal"
        : status === "COMPLETED"
          ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100"
          : "border-red-300/35 bg-red-500/10 text-red-100";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${className}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: VehicleCatalogMatchRequestStatus) {
  if (status === "PENDING") {
    return "Beklemede";
  }

  if (status === "IN_REVIEW") {
    return "İncelemede";
  }

  if (status === "COMPLETED") {
    return "Tamamlandı";
  }

  return "Reddedildi";
}

function memberName(user: {
  email: string;
  profile: { fullName: string | null; displayName: string | null } | null;
}) {
  return user.profile?.displayName || user.profile?.fullName || user.email;
}

function catalogMatchState(
  vehicle: { vehicleDefinitionId: string | null; deletedAt: Date | null } | null,
) {
  if (!vehicle) {
    return "Araç kaydı yok";
  }

  if (vehicle.deletedAt) {
    return "Araç arşivde";
  }

  return vehicle.vehicleDefinitionId ? "Katalog eşli" : "Katalog dışı";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function requestAge(createdAt: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 3600000));

  if (hours < 24) {
    return `${hours} saat`;
  }

  return `${Math.floor(hours / 24)} gün`;
}
