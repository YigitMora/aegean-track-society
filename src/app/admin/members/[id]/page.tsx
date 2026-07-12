import Link from "next/link";
import type { ModificationCategory, VehicleRatingStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { VehiclePerformanceRatingCard } from "@/components/vehicle-rating-card";
import { formatDateTime, formatStatus } from "@/lib/admin-format";
import { requireAdminSession } from "@/lib/admin-auth";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import {
  formatModificationDefinition,
  modificationCategoryLabels,
  orderedModificationCategories,
} from "@/lib/vehicle-build-rules";
import { calculateVehiclePerformanceRating } from "@/lib/vehicle-performance-rating";

const vehicleDefinitionRatingSelect = {
  id: true,
  code: true,
  brand: true,
  model: true,
  generation: true,
  chassisCode: true,
  variant: true,
  powerRating: true,
  handlingRating: true,
  brakingRating: true,
  reliabilityRating: true,
  thermalRating: true,
  trackReadinessRating: true,
  weightPenalty: true,
  ratingStatus: true,
} as const;

const vehicleRatingModificationDefinitionSelect = {
  id: true,
  code: true,
  category: true,
  brand: true,
  name: true,
  variant: true,
  componentTypeCode: true,
  usageClass: true,
  powerImpact: true,
  handlingImpact: true,
  brakingImpact: true,
  reliabilityImpact: true,
  trackReadinessImpact: true,
  modificationImpacts: {
    where: {
      active: true,
    },
    select: {
      vehicleDefinitionId: true,
      powerImpact: true,
      handlingImpact: true,
      brakingImpact: true,
      reliabilityImpact: true,
      thermalImpact: true,
      trackReadinessImpact: true,
      active: true,
    },
  },
} as const;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({ params }: MemberDetailPageProps) {
  await requireAdminSession();

  const { id } = await params;

  if (!uuidRegex.test(id)) {
    notFound();
  }

  const member = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      memberKvkkAcceptedAt: true,
      memberTermsAcceptedAt: true,
      memberMarketingConsentAt: true,
      memberMarketingConsentRevokedAt: true,
      memberConsentIpAddress: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      vehicles: {
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
          vehicleDefinitionId: true,
          vehicleDefinition: {
            select: vehicleDefinitionRatingSelect,
          },
          brand: true,
          model: true,
          year: true,
          plateNumber: true,
          color: true,
          isPrimary: true,
          imagePath: true,
          deletedAt: true,
          createdAt: true,
          modifications: {
            where: {
              deletedAt: null,
            },
            orderBy: [
              {
                createdAt: "asc",
              },
              {
                id: "asc",
              },
            ],
            select: {
              id: true,
              customNotes: true,
              installedAt: true,
              modificationDefinition: {
                select: vehicleRatingModificationDefinitionSelect,
              },
            },
          },
        },
      },
      registrations: {
        where: {
          deletedAt: null,
        },
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
          participantCode: true,
          registrationSource: true,
          status: true,
          paymentStatus: true,
          carBrandModel: true,
          plateNumber: true,
          createdAt: true,
          event: {
            select: {
              name: true,
              startsAt: true,
            },
          },
          package: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

  if (!member) {
    notFound();
  }

  const activeVehicles = member.vehicles.filter((vehicle) => !vehicle.deletedAt);
  const archivedVehicles = member.vehicles.filter((vehicle) => vehicle.deletedAt);
  const profileComplete = isMemberProfileComplete(member);
  const activeRegistrations = member.registrations.filter(
    (registration) =>
      registration.status !== "CANCELLED" && registration.status !== "REJECTED",
  );
  const confirmedRegistrations = member.registrations.filter(
    (registration) => registration.status === "CONFIRMED",
  );

  return (
    <AdminShell
      title={member.profile?.fullName ?? "Üye detayı"}
      eyebrow="Üye detayı"
      actions={
        <>
          <Link
            href="/admin/members"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Üyelere dön
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Dashboard
          </Link>
        </>
      }
    >
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Aktif araç" value={activeVehicles.length.toString()} />
        <MetricCard label="Arşivli araç" value={archivedVehicles.length.toString()} />
        <MetricCard label="Toplam başvuru" value={member.registrations.length.toString()} />
        <MetricCard label="Aktif başvuru" value={activeRegistrations.length.toString()} />
        <MetricCard label="Onaylı başvuru" value={confirmedRegistrations.length.toString()} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <DetailSection title="Kimlik">
            <DetailGrid>
              <DetailRow label="Ad soyad" value={member.profile?.fullName ?? "-"} />
              <DetailRow label="Görünen ad" value={member.profile?.displayName ?? "-"} />
              <DetailRow label="E-posta" value={member.email} />
              <DetailRow label="Telefon" value={member.profile?.phone ?? "-"} />
              <DetailRow label="User ID" value={member.id} />
              <DetailRow label="Hesap rolü" value={formatStatus(member.role)} />
              <DetailRow
                label="Hesap durumu"
                value={<AccountStatusBadge status={member.status} />}
              />
              <DetailRow
                label="Profil durumu"
                value={<ProfileStatusBadge complete={profileComplete} />}
              />
              <DetailRow label="Üyelik tarihi" value={formatDateTime(member.createdAt)} />
              <DetailRow label="Son güncelleme" value={formatDateTime(member.updatedAt)} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Üyelik onayları">
            <DetailGrid>
              <DetailRow label="Üyelik KVKK" value={formatDateTime(member.memberKvkkAcceptedAt)} />
              <DetailRow
                label="Üyelik şartları"
                value={formatDateTime(member.memberTermsAcceptedAt)}
              />
              <DetailRow
                label="Pazarlama izni"
                value={marketingConsentActive(member) ? "Açık" : "Kapalı"}
              />
              <DetailRow
                label="Pazarlama kabul"
                value={formatDateTime(member.memberMarketingConsentAt)}
              />
              <DetailRow
                label="Pazarlama iptal"
                value={formatDateTime(member.memberMarketingConsentRevokedAt)}
              />
              <DetailRow
                label="Consent IP"
                value={member.memberConsentIpAddress ?? "-"}
              />
            </DetailGrid>
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title="Garaj">
            <VehicleList title="Aktif araçlar" vehicles={activeVehicles} />
            <VehicleList title="Arşivlenen araçlar" vehicles={archivedVehicles} />
          </DetailSection>
        </div>
      </section>

      <section className="mt-6">
        <DetailSection title="Etkinlik geçmişi">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
                <tr>
                  <th className="px-4 py-3">Etkinlik</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Kaynak</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Araç snapshot</th>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Oluşturma</th>
                  <th className="px-4 py-3">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {member.registrations.map((registration) => (
                  <tr key={registration.id} className="align-top transition hover:bg-white/5">
                    <td className="px-4 py-4 font-black text-white">
                      {registration.event.name}
                      <p className="mt-1 text-xs font-semibold text-white/45">
                        {formatDateTime(registration.event.startsAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-white/70">
                      {registration.package.name}
                      <p className="mt-1 text-xs font-black text-white/45">
                        {registration.package.code}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-white/70">
                      {formatRegistrationSource(registration.registrationSource)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={registration.status} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={registration.paymentStatus} />
                    </td>
                    <td className="px-4 py-4 text-white/70">
                      {registration.carBrandModel}
                      <p className="mt-1 text-xs font-black text-white/45">
                        {registration.plateNumber}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-white/70">
                      {registration.participantCode ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-white/60">
                      {formatDateTime(registration.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/participants/${registration.id}`}
                        className="font-black text-signal transition hover:text-white"
                      >
                        Aç
                      </Link>
                    </td>
                  </tr>
                ))}
                {member.registrations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-white/60" colSpan={9}>
                      Bu üyeye bağlı etkinlik başvurusu yok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </DetailSection>
      </section>
    </AdminShell>
  );
}

function VehicleList({
  title,
  vehicles,
}: {
  title: string;
  vehicles: Array<{
    id: string;
    vehicleDefinitionId: string | null;
    vehicleDefinition: {
      id: string;
      code: string;
      brand: string;
      model: string;
      generation: string | null;
      chassisCode: string | null;
      variant: string | null;
      powerRating: number;
      handlingRating: number;
      brakingRating: number;
      reliabilityRating: number;
      thermalRating: number;
      trackReadinessRating: number;
      weightPenalty: number;
      ratingStatus: VehicleRatingStatus;
    } | null;
    brand: string;
    model: string;
    year: number | null;
    plateNumber: string;
    color: string | null;
    isPrimary: boolean;
    imagePath: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    modifications: Array<{
      id: string;
      customNotes: string | null;
      installedAt: Date | null;
      modificationDefinition: {
        id: string;
        code: string;
        category: ModificationCategory;
        brand: string | null;
        name: string;
        variant: string | null;
        componentTypeCode: string | null;
        usageClass: string | null;
        powerImpact: number;
        handlingImpact: number;
        brakingImpact: number;
        reliabilityImpact: number;
        trackReadinessImpact: number;
        modificationImpacts: Array<{
          vehicleDefinitionId: string;
          powerImpact: number;
          handlingImpact: number;
          brakingImpact: number;
          reliabilityImpact: number;
          thermalImpact: number;
          trackReadinessImpact: number;
          active: boolean;
        }>;
      };
    }>;
  }>;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="text-sm font-black uppercase text-signal">{title}</p>
      <div className="mt-3 grid gap-3">
        {vehicles.map((vehicle) => {
          const rating = calculateVehiclePerformanceRating({
            vehicleDefinition: vehicle.vehicleDefinition,
            installedModifications: vehicle.modifications,
          });

          return (
            <article key={vehicle.id} className="rounded-md border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/45">
                    {vehicle.plateNumber} · {[vehicle.year, vehicle.color].filter(Boolean).join(" · ") || "Detay yok"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vehicle.isPrimary ? <StatusBadge value="PRIMARY" /> : null}
                  {vehicle.deletedAt ? <StatusBadge value="ARCHIVED" /> : null}
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailRow
                  label="Fotoğraf"
                  value={vehicle.imagePath ? "Fotoğraf mevcut" : "Fotoğraf yok"}
                  compact
                />
                <DetailRow label="Oluşturma" value={formatDateTime(vehicle.createdAt)} compact />
                <DetailRow
                  label="Platform"
                  value={
                    vehicle.vehicleDefinition
                      ? vehicleDefinitionLabel(vehicle.vehicleDefinition)
                      : "Araç platformu henüz doğrulanmadı."
                  }
                  compact
                />
                <DetailRow
                  label="Rating durumu"
                  value={
                    vehicle.vehicleDefinition
                      ? vehicle.vehicleDefinition.ratingStatus === "CALIBRATED"
                        ? "Kalibre"
                        : "Geçici kalibrasyon"
                      : "Yok"
                  }
                  compact
                />
              </dl>
              <VehiclePerformanceRatingCard rating={rating} compact className="mt-4" />
              <AdminVehicleBuildProfile modifications={vehicle.modifications} />
            </article>
          );
        })}
        {vehicles.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/60">
            Kayıt yok.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AdminVehicleBuildProfile({
  modifications,
}: {
  modifications: Array<{
    id: string;
    customNotes: string | null;
    installedAt: Date | null;
    modificationDefinition: {
      id: string;
      category: ModificationCategory;
      brand: string | null;
      name: string;
      variant: string | null;
    };
  }>;
}) {
  if (modifications.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-white/10 bg-asphalt p-3 text-xs font-semibold text-white/45">
        Build profili boş.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-xs font-black uppercase text-white/45">
        Build profili
      </p>
      <div className="mt-3 space-y-4">
        {orderedModificationCategories.map((category) => {
          const categoryModifications = modifications.filter(
            (modification) =>
              modification.modificationDefinition.category === category,
          );

          if (categoryModifications.length === 0) {
            return null;
          }

          return (
            <div key={category}>
              <p className="text-[11px] font-black uppercase text-signal">
                {modificationCategoryLabels[category]}
              </p>
              <div className="mt-2 grid gap-2">
                {categoryModifications.map((modification) => (
                  <div
                    key={modification.id}
                    className="rounded-md border border-white/10 bg-asphalt p-3"
                  >
                    <p className="text-xs font-black text-white">
                      {formatModificationDefinition(
                        modification.modificationDefinition,
                      )}
                    </p>
                    {modification.customNotes ? (
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/55">
                        {modification.customNotes}
                      </p>
                    ) : null}
                    {modification.installedAt ? (
                      <p className="mt-1 text-[11px] font-bold uppercase text-white/40">
                        Montaj: {formatDateTime(modification.installedAt)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function marketingConsentActive(member: {
  memberMarketingConsentAt: Date | null;
  memberMarketingConsentRevokedAt: Date | null;
}) {
  return Boolean(member.memberMarketingConsentAt && !member.memberMarketingConsentRevokedAt);
}

function formatRegistrationSource(value: string) {
  const labels: Record<string, string> = {
    PUBLIC_ANONYMOUS: "Anonim kayıt",
    MEMBER_ACCOUNT: "Üye hesabı",
    ADMIN_CREATED: "Admin oluşturdu",
  };

  return labels[value] ?? formatStatus(value);
}

function vehicleDefinitionLabel(definition: {
  brand: string;
  model: string;
  generation: string | null;
  chassisCode: string | null;
  variant: string | null;
}) {
  return [
    definition.brand,
    definition.model,
    definition.generation,
    definition.chassisCode,
    definition.variant,
  ]
    .filter(Boolean)
    .join(" / ");
}

function ProfileStatusBadge({ complete }: { complete: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        complete
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-signal/40 bg-signal/10 text-signal"
      }`}
    >
      {complete ? "Tamamlandı" : "Eksik"}
    </span>
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${
        isActive
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-kerb/40 bg-kerb/10 text-red-100"
      }`}
    >
      {isActive ? "Aktif" : "Askıda"}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5">
      <p className="text-xs font-black uppercase text-white/50">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </article>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}

function DetailRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "border-b border-white/10 pb-3"}>
      <dt className="text-xs font-black uppercase text-white/45">{label}</dt>
      <dd className="mt-2 break-words text-sm font-bold text-white">{value}</dd>
    </div>
  );
}
