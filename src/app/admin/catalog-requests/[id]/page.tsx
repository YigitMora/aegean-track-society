import Link from "next/link";
import { notFound } from "next/navigation";
import type { VehicleCatalogMatchRequestStatus } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOwnerAdmin } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";
import {
  completeCatalogRequestAction,
  markCatalogRequestInReviewAction,
  rejectCatalogRequestAction,
  updateCatalogRequestAdminNoteAction,
} from "../actions";

type CatalogRequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    catalogRequestResult?: string;
  }>;
};

export default async function AdminCatalogRequestDetailPage({
  params,
  searchParams,
}: CatalogRequestDetailPageProps) {
  await requireOwnerAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const request = await prisma.vehicleCatalogMatchRequest.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      status: true,
      memberNote: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      memberNotifiedAt: true,
      adminNotificationEmailSentAt: true,
      adminNotificationEmailFailedAt: true,
      memberNotificationEmailSentAt: true,
      memberNotificationEmailFailedAt: true,
      resolvedByAdminUser: {
        select: {
          email: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              fullName: true,
              displayName: true,
              phone: true,
            },
          },
        },
      },
      vehicle: {
        select: {
          id: true,
          vehicleDefinitionId: true,
          brand: true,
          model: true,
          year: true,
          plateNumber: true,
          color: true,
          deletedAt: true,
          vehicleDefinition: {
            select: {
              id: true,
              code: true,
              brand: true,
              model: true,
              generation: true,
              chassisCode: true,
              variant: true,
              active: true,
              ratingStatus: true,
            },
          },
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const inReviewAction = markCatalogRequestInReviewAction.bind(null, request.id);
  const rejectAction = rejectCatalogRequestAction.bind(null, request.id);
  const completeAction = completeCatalogRequestAction.bind(null, request.id);
  const noteAction = updateCatalogRequestAdminNoteAction.bind(null, request.id);
  const completionBlockedReason = completionBlockReason(request.vehicle);

  return (
    <AdminShell
      title="Katalog Talebi"
      eyebrow="Vehicle catalog"
      actions={
        <Link
          href="/admin/catalog-requests"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
        >
          Taleplere dön
        </Link>
      }
    >
      <RequestResultMessage result={query.catalogRequestResult} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-white/45">Talep ID</p>
              <h2 className="mt-2 break-all text-2xl font-black text-white">
                {request.id}
              </h2>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Oluşturma" value={formatDateTime(request.createdAt)} />
            <DetailRow label="Güncelleme" value={formatDateTime(request.updatedAt)} />
            <DetailRow
              label="Çözüm"
              value={request.resolvedAt ? formatDateTime(request.resolvedAt) : "-"}
            />
            <DetailRow
              label="Çözen admin"
              value={request.resolvedByAdminUser?.email ?? "-"}
            />
            <DetailRow
              label="Admin bildirim e-postası"
              value={notificationState(
                request.adminNotificationEmailSentAt,
                request.adminNotificationEmailFailedAt,
              )}
            />
            <DetailRow
              label="Üye bildirim e-postası"
              value={notificationState(
                request.memberNotificationEmailSentAt,
                request.memberNotificationEmailFailedAt,
              )}
            />
          </dl>

          <div className="mt-6 rounded-md border border-white/10 bg-asphalt p-4">
            <p className="text-xs font-black uppercase text-white/45">Üye</p>
            <p className="mt-2 text-lg font-black text-white">
              {memberName(request.user)}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/60">
              {request.user.email}
            </p>
          </div>

          <div className="mt-4 rounded-md border border-white/10 bg-asphalt p-4">
            <p className="text-xs font-black uppercase text-white/45">Araç</p>
            {request.vehicle ? (
              <>
                <p className="mt-2 text-lg font-black text-white">
                  {vehicleTitle(request.vehicle)}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/60">
                  {request.vehicle.plateNumber}
                  {request.vehicle.color ? ` · ${request.vehicle.color}` : ""}
                </p>
                <p className="mt-3 text-sm font-semibold text-white/60">
                  Katalog durumu:{" "}
                  {request.vehicle.vehicleDefinition
                    ? vehicleDefinitionLabel(request.vehicle.vehicleDefinition)
                    : "Henüz eşleşmedi"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/members/${request.user.id}#garage-vehicle-${request.vehicle.id}`}
                    className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-xs font-black uppercase text-white/70 transition hover:border-white hover:text-white"
                  >
                    Üye garajını aç
                  </Link>
                  <Link
                    href={`/account/garage/${request.vehicle.id}`}
                    className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-xs font-black uppercase text-white/70 transition hover:border-white hover:text-white"
                  >
                    Member araç URL
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm font-semibold text-white/60">
                Araç kaydı artık mevcut değil. Talep geçmişi korunuyor.
              </p>
            )}
          </div>

          {request.memberNote ? (
            <div className="mt-4 rounded-md border border-white/10 bg-asphalt p-4">
              <p className="text-xs font-black uppercase text-white/45">Üye notu</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/70">
                {request.memberNote}
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <form action={noteAction} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <label className="block">
              <span className="text-xs font-black uppercase text-white/45">
                Admin notu
              </span>
              <textarea
                name="adminNote"
                defaultValue={request.adminNote ?? ""}
                maxLength={1000}
                className="mt-2 min-h-32 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm font-semibold text-white outline-none focus:border-signal"
              />
            </label>
            <button className="mt-3 inline-flex h-10 items-center rounded-full border border-white/15 px-4 text-xs font-black uppercase text-white/70 transition hover:border-white hover:text-white">
              Notu kaydet
            </button>
          </form>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase text-white/45">Aksiyonlar</p>
            <div className="mt-4 grid gap-3">
              <form action={inReviewAction}>
                <input type="hidden" name="adminNote" value={request.adminNote ?? ""} />
                <button
                  disabled={request.status !== "PENDING"}
                  className="inline-flex h-10 items-center rounded-full border border-signal/50 px-4 text-xs font-black uppercase text-signal transition hover:bg-signal hover:text-asphalt disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                >
                  İncelemeye al
                </button>
              </form>

              {completionBlockedReason ? (
                <p className="rounded-md border border-amber-300/30 bg-amber-400/10 p-3 text-sm font-semibold leading-6 text-amber-100">
                  {completionBlockedReason}
                </p>
              ) : null}

              <form action={completeAction}>
                <input type="hidden" name="adminNote" value={request.adminNote ?? ""} />
                <button
                  disabled={Boolean(completionBlockedReason) || request.status === "COMPLETED"}
                  className="inline-flex h-10 items-center rounded-full bg-signal px-4 text-xs font-black uppercase text-asphalt transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                >
                  Tamamlandı işaretle
                </button>
              </form>

              <details className="rounded-md border border-red-300/25 bg-red-500/10 p-3">
                <summary className="cursor-pointer text-xs font-black uppercase text-red-100">
                  Talebi reddet
                </summary>
                <form action={rejectAction} className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-red-100/70">
                      Güvenli admin nedeni
                    </span>
                    <textarea
                      name="adminNote"
                      defaultValue={request.adminNote ?? ""}
                      minLength={4}
                      maxLength={1000}
                      className="mt-2 min-h-24 w-full rounded-md border border-red-300/25 bg-black px-3 py-2 text-sm font-semibold text-white outline-none focus:border-red-200"
                    />
                  </label>
                  <button
                    disabled={request.status === "COMPLETED"}
                    className="inline-flex h-10 w-fit items-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                  >
                    Reddet
                  </button>
                </form>
              </details>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function RequestResultMessage({ result }: { result?: string }) {
  const message = resultMessage(result);

  if (!message) {
    return null;
  }

  return (
    <p
      className={`mb-5 rounded-md border px-4 py-3 text-sm font-semibold ${
        message.kind === "success"
          ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
          : "border-red-300/30 bg-red-500/10 text-red-100"
      }`}
    >
      {message.text}
    </p>
  );
}

function resultMessage(result?: string) {
  const successMessages: Record<string, string> = {
    in_review: "Talep incelemeye alındı.",
    rejected: "Talep reddedildi.",
    note_updated: "Admin notu güncellendi.",
    completed: "Talep tamamlandı.",
    completed_noop: "Talep zaten tamamlanmış.",
  };

  if (result && successMessages[result]) {
    return {
      kind: "success" as const,
      text: successMessages[result],
    };
  }

  if (result === "completion_requires_catalog_match") {
    return {
      kind: "error" as const,
      text: "Talebi tamamlamak için araç önce ATS kataloğuyla eşleştirilmelidir.",
    };
  }

  if (result === "completion_requires_active_definition") {
    return {
      kind: "error" as const,
      text: "Talebi tamamlamak için aktif bir ATS katalog kaydı gerekir.",
    };
  }

  if (result) {
    return {
      kind: "error" as const,
      text: "Talep güncellenemedi.",
    };
  }

  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 pb-3">
      <dt className="text-xs font-black uppercase text-white/45">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white/75">{value}</dd>
    </div>
  );
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

function completionBlockReason(
  vehicle: {
    vehicleDefinitionId: string | null;
    vehicleDefinition: { active: boolean } | null;
    deletedAt: Date | null;
  } | null,
) {
  if (!vehicle || vehicle.deletedAt) {
    return "Talebi tamamlamak için aktif araç kaydı gerekir.";
  }

  if (!vehicle.vehicleDefinitionId) {
    return "Talebi tamamlamak için araç önce ATS kataloğuyla eşleştirilmelidir.";
  }

  if (!vehicle.vehicleDefinition?.active) {
    return "Talebi tamamlamak için aktif bir ATS katalog kaydı gerekir.";
  }

  return null;
}

function memberName(user: {
  email: string;
  profile: { fullName: string | null; displayName: string | null } | null;
}) {
  return user.profile?.displayName || user.profile?.fullName || user.email;
}

function vehicleTitle(vehicle: {
  brand: string;
  model: string;
  year: number | null;
}) {
  return [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ");
}

function vehicleDefinitionLabel(definition: {
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
  active: boolean;
  ratingStatus: string;
}) {
  return [
    definition.brand,
    definition.model,
    definition.generation,
    definition.chassisCode,
    definition.variant,
    definition.active ? "aktif" : "pasif",
    definition.ratingStatus,
  ]
    .filter(Boolean)
    .join(" · ");
}

function notificationState(sentAt: Date | null, failedAt: Date | null) {
  if (sentAt) {
    return `Gönderildi · ${formatDateTime(sentAt)}`;
  }

  if (failedAt) {
    return `Gönderilemedi · ${formatDateTime(failedAt)}`;
  }

  return "-";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
