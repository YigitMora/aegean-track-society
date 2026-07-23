import Link from "next/link";
import type {
  CalibrationConfidence,
  ModificationCategory,
  VehicleRatingStatus,
} from "@prisma/client";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/status-badge";
import { VehicleForm } from "@/components/vehicle-form";
import {
  VehicleTemplateFields,
  type VehicleTemplateOption,
} from "@/components/vehicle-template-fields";
import { VehiclePerformanceRatingCard } from "@/components/vehicle-rating-card";
import { formatDateTime, formatStatus } from "@/lib/admin-format";
import { adminHasCapability, requireAdminCapability } from "@/lib/admin-authorization";
import {
  MAX_ACTIVE_GARAGE_VEHICLES,
  MAX_ARCHIVED_GARAGE_VEHICLES,
} from "@/lib/garage-capacity";
import { isMemberProfileComplete } from "@/lib/member-profile-validation";
import { prisma } from "@/lib/prisma";
import {
  formatModificationDefinition,
  modificationCategoryLabels,
  orderedModificationCategories,
} from "@/lib/vehicle-build-rules";
import { calculateVehiclePerformanceRating } from "@/lib/vehicle-performance-rating";
import {
  addMemberGarageVehicleAction,
  archiveMemberGarageVehicleAction,
  deleteArchivedMemberGarageVehicleAction,
  makePrimaryMemberGarageVehicleAction,
  matchMemberGarageVehicleDefinitionAction,
  restoreMemberGarageVehicleAction,
  updateMemberGarageVehicleAction,
} from "./garage-actions";

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
  platformFamily: {
    select: {
      code: true,
      brand: true,
      name: true,
      generation: true,
    },
  },
  engineFamily: {
    select: {
      code: true,
      manufacturer: true,
      name: true,
    },
  },
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
      confidence: true,
      sourceNote: true,
      claimedPowerDeltaHp: true,
      claimedTorqueDeltaNm: true,
      active: true,
    },
  },
  tuningPackageSpecification: {
    select: {
      active: true,
      tuneType: true,
      measurementBasis: true,
      mapStageLabel: true,
      mapProgramCode: true,
      claimedPowerMinHp: true,
      claimedPowerMaxHp: true,
      claimedTorqueMinNm: true,
      claimedTorqueMaxNm: true,
      minimumFuelOctaneRon: true,
      requiredFuelNote: true,
      hardwareRequirementNote: true,
      transmissionLimitNote: true,
      coolingRecommendationNote: true,
      confidence: true,
      sourceNote: true,
    },
  },
} as const;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    garageResult?: string;
    blocked?: string;
    vehicle?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: MemberDetailPageProps) {
  const [adminActor, { id }, queryParams] = await Promise.all([
    requireAdminCapability("members.read"),
    params,
    searchParams,
  ]);

  if (!uuidRegex.test(id)) {
    notFound();
  }

  const canManageGarages = adminHasCapability(adminActor.role, "garages.manage");

  if (!canManageGarages) {
    return renderCheckinMemberDetail(id);
  }

  const [member, vehicleDefinitions] = await Promise.all([
    prisma.user.findFirst({
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
          vehicleId: true,
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
    }),
    prisma.vehicleDefinition.findMany({
      where: {
        active: true,
      },
      orderBy: [
        {
          brand: "asc",
        },
        {
          model: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        brand: true,
        model: true,
        generation: true,
        chassisCode: true,
        variant: true,
        yearFrom: true,
        yearTo: true,
        powerRating: true,
        handlingRating: true,
        brakingRating: true,
        reliabilityRating: true,
        thermalRating: true,
        trackReadinessRating: true,
        weightPenalty: true,
        ratingStatus: true,
        platformFamily: {
          select: {
            code: true,
            brand: true,
            name: true,
            generation: true,
          },
        },
        engineFamily: {
          select: {
            code: true,
            manufacturer: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!member) {
    notFound();
  }

  const activeVehicles = member.vehicles.filter((vehicle) => !vehicle.deletedAt);
  const archivedVehicles = member.vehicles.filter((vehicle) => vehicle.deletedAt);
  const canWriteGarage = true;
  const registrationCountsByVehicleId = member.registrations.reduce(
    (counts, registration) => {
      if (registration.vehicleId) {
        counts[registration.vehicleId] = (counts[registration.vehicleId] ?? 0) + 1;
      }

      return counts;
    },
    {} as Record<string, number>,
  );
  const garageCapacityExceeded =
    activeVehicles.length > MAX_ACTIVE_GARAGE_VEHICLES ||
    archivedVehicles.length > MAX_ARCHIVED_GARAGE_VEHICLES;
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
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Aktif araç"
          value={`${activeVehicles.length} / ${MAX_ACTIVE_GARAGE_VEHICLES}`}
          detail={capacityDetail(activeVehicles.length, MAX_ACTIVE_GARAGE_VEHICLES)}
        />
        <MetricCard
          label="Arşivli araç"
          value={`${archivedVehicles.length} / ${MAX_ARCHIVED_GARAGE_VEHICLES}`}
          detail={capacityDetail(
            archivedVehicles.length,
            MAX_ARCHIVED_GARAGE_VEHICLES,
          )}
        />
        <MetricCard
          label="Garaj kapasitesi"
          value={garageCapacityExceeded ? "Üstü" : "Uygun"}
          detail="Admin override yok"
        />
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
          <DetailSection title="Garage Support">
            <div className="rounded-md border border-signal/35 bg-signal/10 p-4">
              <p className="text-sm font-black text-white">
                Bu işlemler üyenin garajını doğrudan değiştirir.
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
                Kapasite korunur: aktif {activeVehicles.length} /{" "}
                {MAX_ACTIVE_GARAGE_VEHICLES}, arşiv {archivedVehicles.length} /{" "}
                {MAX_ARCHIVED_GARAGE_VEHICLES}. CHECKIN rolü bu alanda salt okunur.
              </p>
            </div>

            <GarageSupportMessage
              result={queryParams.garageResult}
              blocked={queryParams.blocked}
            />

            {canWriteGarage ? (
              <details className="mt-5 rounded-md border border-white/10 bg-asphalt p-4">
                <summary className="cursor-pointer text-sm font-black text-white">
                  Üye Garajına Araç Ekle
                </summary>
                <div className="mt-4">
                  <VehicleForm
                    action={addMemberGarageVehicleAction.bind(null, member.id)}
                    submitLabel="Üye Garajına Araç Ekle"
                    showPrimaryOption
                    returnTo={`/admin/members/${member.id}`}
                    vehicleDefinitions={vehicleDefinitions}
                    templateDefaultMode="catalog"
                  />
                </div>
              </details>
            ) : (
              <p className="mt-5 rounded-md border border-white/10 bg-asphalt p-4 text-sm font-semibold text-white/60">
                CHECKIN rolü garaj yazma yetkisine sahip değildir.
              </p>
            )}

            <VehicleList
              title="Aktif araçlar"
              mode="active"
              memberId={member.id}
              vehicles={activeVehicles}
              canWrite={canWriteGarage}
              vehicleDefinitions={vehicleDefinitions}
              registrationCountsByVehicleId={registrationCountsByVehicleId}
            />
            <VehicleList
              title="Arşivlenen araçlar"
              mode="archived"
              memberId={member.id}
              vehicles={archivedVehicles}
              canWrite={canWriteGarage}
              vehicleDefinitions={vehicleDefinitions}
              registrationCountsByVehicleId={registrationCountsByVehicleId}
            />
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

async function renderCheckinMemberDetail(memberId: string) {
  const member = await prisma.user.findFirst({
    where: {
      id: memberId,
      deletedAt: null,
    },
    select: {
      email: true,
      status: true,
      memberKvkkAcceptedAt: true,
      memberTermsAcceptedAt: true,
      profile: {
        select: {
          fullName: true,
          phone: true,
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
          status: true,
          paymentStatus: true,
          carBrandModel: true,
          plateNumber: true,
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

  const profileComplete = isMemberProfileComplete(member);

  return (
    <AdminShell
      title={member.profile?.fullName ?? "Üye detayı"}
      eyebrow="Operasyon üye görünümü"
      actions={
        <>
          <Link
            href="/admin/members"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Üyelere dön
          </Link>
          <Link
            href="/admin/participants"
            className="inline-flex h-11 items-center rounded-full border border-white/15 px-5 text-sm font-black text-white/75 transition hover:border-white hover:text-white"
          >
            Katılımcılar
          </Link>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DetailSection title="Kimlik">
          <DetailGrid>
            <DetailRow label="Ad soyad" value={member.profile?.fullName ?? "-"} />
            <DetailRow label="E-posta" value={member.email} />
            <DetailRow label="Telefon" value={member.profile?.phone ?? "-"} />
            <DetailRow
              label="Hesap durumu"
              value={<AccountStatusBadge status={member.status} />}
            />
            <DetailRow
              label="Profil durumu"
              value={<ProfileStatusBadge complete={profileComplete} />}
            />
          </DetailGrid>
        </DetailSection>

        <DetailSection title="Etkinlik başvuruları">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-white/5 text-xs font-black uppercase text-white/50">
                <tr>
                  <th className="px-4 py-3">Etkinlik</th>
                  <th className="px-4 py-3">Paket</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Ödeme</th>
                  <th className="px-4 py-3">Araç snapshot</th>
                  <th className="px-4 py-3">Kod</th>
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
                    <td className="px-4 py-8 text-white/60" colSpan={7}>
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

type AdminVehicleDefinitionOption = VehicleTemplateOption & {
  powerRating: number;
  handlingRating: number;
  brakingRating: number;
  reliabilityRating: number;
  thermalRating: number;
  trackReadinessRating: number;
  weightPenalty: number;
  ratingStatus: VehicleRatingStatus;
  platformFamily: {
    code: string;
    brand: string;
    name: string;
    generation: string | null;
  } | null;
  engineFamily: {
    code: string;
    manufacturer: string;
    name: string;
  } | null;
};

function VehicleList({
  title,
  mode,
  memberId,
  vehicles,
  canWrite,
  vehicleDefinitions,
  registrationCountsByVehicleId,
}: {
  title: string;
  mode: "active" | "archived";
  memberId: string;
  canWrite: boolean;
  vehicleDefinitions: AdminVehicleDefinitionOption[];
  registrationCountsByVehicleId: Record<string, number>;
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
      platformFamily: {
        code: string;
        brand: string;
        name: string;
        generation: string | null;
      } | null;
      engineFamily: {
        code: string;
        manufacturer: string;
        name: string;
      } | null;
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
          confidence: CalibrationConfidence;
          sourceNote: string | null;
          claimedPowerDeltaHp: number | null;
          claimedTorqueDeltaNm: number | null;
          active: boolean;
        }>;
        tuningPackageSpecification: {
          active: boolean;
          tuneType: string;
          measurementBasis: string | null;
          mapStageLabel: string | null;
          mapProgramCode: string | null;
          claimedPowerMinHp: number | null;
          claimedPowerMaxHp: number | null;
          claimedTorqueMinNm: number | null;
          claimedTorqueMaxNm: number | null;
          minimumFuelOctaneRon: number | null;
          requiredFuelNote: string | null;
          hardwareRequirementNote: string | null;
          transmissionLimitNote: string | null;
          coolingRecommendationNote: string | null;
          confidence: CalibrationConfidence;
          sourceNote: string | null;
        } | null;
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
          const registrationCount = registrationCountsByVehicleId[vehicle.id] ?? 0;

          return (
            <article
              key={vehicle.id}
              id={`garage-vehicle-${vehicle.id}`}
              className="scroll-mt-24 rounded-md border border-white/10 bg-white/5 p-4"
            >
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
                  <span className="inline-flex rounded-full border border-white/10 bg-asphalt px-3 py-1 text-xs font-black uppercase text-white/60">
                    {vehicle.vehicleDefinitionId ? "Katalog eşli" : "Katalog dışı"}
                  </span>
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
                <DetailRow
                  label="Platform ailesi"
                  value={
                    vehicle.vehicleDefinition?.platformFamily
                      ? vehiclePlatformFamilyLabel(vehicle.vehicleDefinition.platformFamily)
                      : "-"
                  }
                  compact
                />
                <DetailRow
                  label="Motor ailesi"
                  value={
                    vehicle.vehicleDefinition?.engineFamily
                      ? vehicleEngineFamilyLabel(vehicle.vehicleDefinition.engineFamily)
                      : "-"
                  }
                  compact
                />
                <DetailRow
                  label="ATS Overall"
                  value={rating ? Math.round(rating.overall).toString() : "Yok"}
                  compact
                />
                <DetailRow
                  label="Modifikasyon"
                  value={vehicle.modifications.length.toString()}
                  compact
                />
                <DetailRow
                  label="Başvuru bağlantısı"
                  value={registrationCount.toString()}
                  compact
                />
              </dl>
              <VehiclePerformanceRatingCard rating={rating} compact className="mt-4" />
              <AdminVehicleBuildProfile
                modifications={vehicle.modifications}
                vehicleDefinitionId={vehicle.vehicleDefinitionId}
              />
              {canWrite ? (
                <AdminGarageVehicleActions
                  memberId={memberId}
                  vehicle={vehicle}
                  mode={mode}
                  vehicleDefinitions={vehicleDefinitions}
                />
              ) : null}
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

function AdminGarageVehicleActions({
  memberId,
  vehicle,
  mode,
  vehicleDefinitions,
}: {
  memberId: string;
  mode: "active" | "archived";
  vehicle: {
    id: string;
    vehicleDefinitionId: string | null;
    brand: string;
    model: string;
    year: number | null;
    plateNumber: string;
    color: string | null;
    isPrimary: boolean;
    deletedAt: Date | null;
  };
  vehicleDefinitions: AdminVehicleDefinitionOption[];
}) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap gap-2">
        {mode === "active" ? (
          <>
            {!vehicle.isPrimary ? (
              <form
                action={makePrimaryMemberGarageVehicleAction.bind(
                  null,
                  memberId,
                  vehicle.id,
                )}
              >
                <button className="inline-flex h-9 items-center rounded-full border border-signal/50 px-3 text-[11px] font-black uppercase text-signal transition hover:bg-signal hover:text-asphalt">
                  Birincil yap
                </button>
              </form>
            ) : null}
            <form
              action={archiveMemberGarageVehicleAction.bind(
                null,
                memberId,
                vehicle.id,
              )}
            >
              <button className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-[11px] font-black uppercase text-white/65 transition hover:border-red-300/60 hover:text-red-100">
                Arşivle
              </button>
            </form>
          </>
        ) : (
          <form
            action={restoreMemberGarageVehicleAction.bind(null, memberId, vehicle.id)}
          >
            <button className="inline-flex h-9 items-center rounded-full border border-signal/50 px-3 text-[11px] font-black uppercase text-signal transition hover:bg-signal hover:text-asphalt">
              Geri yükle
            </button>
          </form>
        )}
      </div>

      <details className="mt-3 rounded-md border border-white/10 bg-asphalt p-3">
        <summary className="cursor-pointer text-xs font-black uppercase text-white/60">
          Aracı düzenle
        </summary>
        <div className="mt-3">
          <VehicleForm
            action={updateMemberGarageVehicleAction.bind(
              null,
              memberId,
              vehicle.id,
            )}
            submitLabel="Araç bilgisini güncelle"
            vehicle={vehicle}
            showPrimaryOption={mode === "active"}
            returnTo={`/admin/members/${memberId}`}
            vehicleDefinitions={vehicleDefinitions}
            templateDefaultMode={vehicle.vehicleDefinitionId ? "catalog" : "manual"}
          />
        </div>
      </details>

      {!vehicle.vehicleDefinitionId ? (
        <details className="mt-3 rounded-md border border-signal/30 bg-signal/10 p-3">
          <summary className="cursor-pointer text-xs font-black uppercase text-signal">
            ATS kataloğuyla eşleştir
          </summary>
          <form
            action={matchMemberGarageVehicleDefinitionAction.bind(
              null,
              memberId,
              vehicle.id,
            )}
            className="mt-3 grid gap-3"
          >
            <div className="grid gap-3 rounded-md border border-white/10 bg-asphalt p-3 text-xs font-semibold text-white/60 sm:grid-cols-2">
              <div>
                <p className="font-black uppercase text-white/40">Önce</p>
                <p className="mt-1 text-white">Manual araç</p>
                <p className="mt-1">Rating mevcut değil</p>
              </div>
              <div>
                <p className="font-black uppercase text-white/40">Sonra</p>
                <p className="mt-1 text-white">Seçilen katalog platformu</p>
                <p className="mt-1">Baz ATS Rating ve uyumlu modifikasyonlar açılır.</p>
              </div>
            </div>
            <VehicleTemplateFields
              definitions={vehicleDefinitions}
              currentVehicleDefinitionId={suggestedDefinitionId(
                vehicle,
                vehicleDefinitions,
              )}
              defaultBrand={vehicle.brand}
              defaultModel={vehicle.model}
              defaultYear={vehicle.year}
              defaultMode="catalog"
              allowManual={false}
            />
            <label className="flex gap-2 text-xs font-semibold leading-5 text-white/60">
              <input
                name="normalizeIdentity"
                type="checkbox"
                defaultChecked
                className="mt-1 h-4 w-4 rounded border-white/20 bg-black accent-signal"
              />
              <span>Marka/model bilgisini seçilen katalog kaydıyla eşitle.</span>
            </label>
            <button className="inline-flex h-10 w-fit items-center rounded-full bg-signal px-4 text-xs font-black uppercase text-asphalt transition hover:bg-white">
              ATS kataloğuyla eşleştir
            </button>
          </form>
        </details>
      ) : null}

      {mode === "archived" ? (
        <details className="mt-3 rounded-md border border-red-300/25 bg-red-500/10 p-3">
          <summary className="cursor-pointer text-xs font-black uppercase text-red-100">
            Kalıcı silme
          </summary>
          <form
            action={deleteArchivedMemberGarageVehicleAction.bind(
              null,
              memberId,
              vehicle.id,
            )}
            className="mt-3 grid gap-3"
          >
            <p className="text-xs font-semibold leading-5 text-red-100">
              Bu işlem geri alınamaz. Geçmiş etkinlik snapshot alanları korunur,
              araç ve build kaydı kalıcı silinir.
            </p>
            <label className="block">
              <span className="text-xs font-black uppercase text-white/45">
                Onay için plakayı yazın: {vehicle.plateNumber}
              </span>
              <input
                name="confirmVehicle"
                required
                autoComplete="off"
                className="mt-2 h-10 w-full rounded-md border border-white/10 bg-black px-3 text-sm font-semibold text-white outline-none focus:border-red-200"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase text-white/45">
                Silme nedeni
              </span>
              <textarea
                name="reason"
                required
                minLength={4}
                maxLength={500}
                className="mt-2 min-h-20 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm font-semibold text-white outline-none focus:border-red-200"
              />
            </label>
            <button className="inline-flex h-10 w-fit items-center rounded-full border border-red-300/50 px-4 text-xs font-black uppercase text-red-100 transition hover:bg-red-500/15">
              Kalıcı olarak sil
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function suggestedDefinitionId(
  vehicle: {
    brand: string;
    model: string;
    year: number | null;
  },
  definitions: AdminVehicleDefinitionOption[],
) {
  return definitions.find(
    (definition) =>
      definition.brand === vehicle.brand &&
      definition.model === vehicle.model &&
      (vehicle.year === null ||
        ((definition.yearFrom === null || vehicle.year >= definition.yearFrom) &&
          (definition.yearTo === null || vehicle.year <= definition.yearTo))),
  )?.id;
}

function AdminVehicleBuildProfile({
  modifications,
  vehicleDefinitionId,
}: {
  vehicleDefinitionId: string | null;
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
      modificationImpacts: Array<{
        vehicleDefinitionId: string;
        powerImpact: number;
        handlingImpact: number;
        brakingImpact: number;
        reliabilityImpact: number;
        thermalImpact: number;
        trackReadinessImpact: number;
        confidence: CalibrationConfidence;
        sourceNote: string | null;
        claimedPowerDeltaHp: number | null;
        claimedTorqueDeltaNm: number | null;
        active: boolean;
      }>;
      tuningPackageSpecification: {
        active: boolean;
        tuneType: string;
        measurementBasis: string | null;
        mapStageLabel: string | null;
        mapProgramCode: string | null;
        claimedPowerMinHp: number | null;
        claimedPowerMaxHp: number | null;
        claimedTorqueMinNm: number | null;
        claimedTorqueMaxNm: number | null;
        minimumFuelOctaneRon: number | null;
        requiredFuelNote: string | null;
        hardwareRequirementNote: string | null;
        transmissionLimitNote: string | null;
        coolingRecommendationNote: string | null;
        confidence: CalibrationConfidence;
        sourceNote: string | null;
      } | null;
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
                {categoryModifications.map((modification) => {
                  const definition = modification.modificationDefinition;
                  const tuningSpecification =
                    definition.tuningPackageSpecification?.active
                      ? definition.tuningPackageSpecification
                      : null;
                  const vehicleImpact = vehicleDefinitionId
                    ? definition.modificationImpacts.find(
                        (impact) => impact.vehicleDefinitionId === vehicleDefinitionId,
                      )
                    : null;

                  return (
                    <div
                      key={modification.id}
                      className="rounded-md border border-white/10 bg-asphalt p-3"
                    >
                      <p className="text-xs font-black text-white">
                        {formatModificationDefinition(definition)}
                      </p>
                      {modification.customNotes ? (
                        <p className="mt-1 text-xs font-semibold leading-5 text-white/55">
                          {modification.customNotes}
                        </p>
                      ) : null}
                      {tuningSpecification ? (
                        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-white/55">
                          <div>
                            <dt className="inline font-black uppercase text-white/35">
                              Kalibrasyon
                            </dt>{" "}
                            <dd className="inline">
                              {tuningPackageTypeLabel(tuningSpecification.tuneType)}
                            </dd>
                          </div>
                          {tuningSpecification.mapStageLabel ? (
                            <div>
                              <dt className="inline font-black uppercase text-white/35">
                                Harita
                              </dt>{" "}
                              <dd className="inline">
                                {tuningSpecification.mapStageLabel}
                              </dd>
                            </div>
                          ) : null}
                          {tuningSpecification.mapProgramCode ? (
                            <div>
                              <dt className="inline font-black uppercase text-white/35">
                                Program
                              </dt>{" "}
                              <dd className="inline">
                                {tuningSpecification.mapProgramCode}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="inline font-black uppercase text-white/35">
                              Güven
                            </dt>{" "}
                            <dd className="inline">
                              {calibrationConfidenceLabel(
                                tuningSpecification.confidence,
                              )}
                            </dd>
                          </div>
                          {tuningSpecification.minimumFuelOctaneRon ? (
                            <div>
                              <dt className="inline font-black uppercase text-white/35">
                                Yakıt
                              </dt>{" "}
                              <dd className="inline">
                                {tuningSpecification.minimumFuelOctaneRon} RON+
                              </dd>
                            </div>
                          ) : null}
                          {tuningSpecification.claimedPowerMinHp !== null ||
                          tuningSpecification.claimedPowerMaxHp !== null ? (
                            <div>
                              <dt className="inline font-black uppercase text-white/35">
                                Güç
                              </dt>{" "}
                              <dd className="inline">
                                {formatRange(
                                  tuningSpecification.claimedPowerMinHp,
                                  tuningSpecification.claimedPowerMaxHp,
                                  "hp",
                                )}
                              </dd>
                            </div>
                          ) : null}
                          {tuningSpecification.claimedTorqueMinNm !== null ||
                          tuningSpecification.claimedTorqueMaxNm !== null ? (
                            <div>
                              <dt className="inline font-black uppercase text-white/35">
                                Tork
                              </dt>{" "}
                              <dd className="inline">
                                {formatRange(
                                  tuningSpecification.claimedTorqueMinNm,
                                  tuningSpecification.claimedTorqueMaxNm,
                                  "Nm",
                                )}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}
                      {vehicleImpact ? (
                        <p className="mt-2 text-[11px] font-semibold leading-5 text-white/50">
                          ATS etki: {formatImpactSummary(vehicleImpact)}
                        </p>
                      ) : null}
                      {tuningSpecification?.sourceNote ? (
                        <p className="mt-1 text-[11px] font-semibold leading-5 text-white/40">
                          Kaynak: {tuningSpecification.sourceNote}
                        </p>
                      ) : null}
                      {modification.installedAt ? (
                        <p className="mt-1 text-[11px] font-bold uppercase text-white/40">
                          Montaj: {formatDateTime(modification.installedAt)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
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

function GarageSupportMessage({
  result,
  blocked,
}: {
  result?: string;
  blocked?: string;
}) {
  if (!result) {
    return null;
  }

  const success = adminGarageSuccessMessage(result);
  const error = adminGarageErrorMessage(result, blocked);

  return (
    <p
      className={`mt-5 rounded-md border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-red-300/30 bg-red-500/10 text-red-100"
      }`}
    >
      {success ?? error}
    </p>
  );
}

function adminGarageSuccessMessage(result: string) {
  const messages: Record<string, string> = {
    created: "Üye garajına araç eklendi.",
    updated: "Araç bilgileri güncellendi.",
    archived: "Araç arşivlendi.",
    restored: "Araç geri yüklendi.",
    deleted: "Araç kalıcı olarak silindi.",
    matched: "Araç ATS kataloğuyla eşleştirildi.",
    primary: "Birincil araç güncellendi.",
  };

  return messages[result] ?? null;
}

function adminGarageErrorMessage(result: string, blocked?: string) {
  const messages: Record<string, string> = {
    invalid: "Araç bilgileri geçersiz veya seçilen katalog yılı uyumsuz.",
    duplicate_plate: "Bu üyede aynı plakaya sahip aktif araç var.",
    active_vehicle_limit_reached: "Aktif garaj kapasitesi dolu.",
    archived_vehicle_limit_reached: "Arşiv kapasitesi dolu.",
    not_found: "Araç bulunamadı veya işlem için uygun değil.",
    restore_conflict: "Aynı plakaya sahip aktif araç olduğu için geri yüklenemedi.",
    active_delete_forbidden: "Kalıcı silme yalnızca arşivlenen araçlar için yapılabilir.",
    confirmation_required: "Kalıcı silme için plaka onayı ve neden gereklidir.",
    incompatible_modifications_block_match: blocked
      ? `Katalog eşleştirmesi engellendi. Uyumsuz modifikasyonlar: ${blocked}.`
      : "Katalog eşleştirmesi mevcut modifikasyonlarla uyumsuz.",
    admin_permission_denied: "Bu admin rolü garaj değişikliği yapamaz.",
    failed: "Garaj işlemi tamamlanamadı.",
  };

  return messages[result] ?? "Garaj işlemi tamamlanamadı.";
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

function vehiclePlatformFamilyLabel(family: {
  code: string;
  brand: string;
  name: string;
  generation: string | null;
}) {
  return [family.brand, family.name, family.generation, family.code]
    .filter(Boolean)
    .join(" / ");
}

function vehicleEngineFamilyLabel(family: {
  code: string;
  manufacturer: string;
  name: string;
}) {
  return [family.manufacturer, family.name, family.code].filter(Boolean).join(" / ");
}

function tuningPackageTypeLabel(value: string) {
  const labels: Record<string, string> = {
    ECU_FLASH: "ECU flash",
    PIGGYBACK: "Piggyback",
    ECU_TCU_BUNDLE: "ECU + TCU",
    TCU_SOFTWARE: "TCU yazılımı",
    FLEX_FUEL_CALIBRATION: "Flex fuel kalibrasyon",
    HARDWARE_SOFTWARE_PACKAGE: "Donanım + yazılım",
  };

  return labels[value] ?? value;
}

function calibrationConfidenceLabel(value: CalibrationConfidence) {
  const labels: Record<CalibrationConfidence, string> = {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
  };

  return labels[value] ?? value;
}

function formatRange(min: number | null, max: number | null, unit: string) {
  if (min !== null && max !== null && min !== max) {
    return `${min}-${max} ${unit}`;
  }

  return `${min ?? max ?? "-"} ${unit}`;
}

function formatImpactSummary(impact: {
  powerImpact: number;
  handlingImpact: number;
  brakingImpact: number;
  reliabilityImpact: number;
  thermalImpact: number;
  trackReadinessImpact: number;
  confidence: CalibrationConfidence;
  claimedPowerDeltaHp: number | null;
  claimedTorqueDeltaNm: number | null;
}) {
  const components = [
    ["Güç", impact.powerImpact],
    ["Yol tutuş", impact.handlingImpact],
    ["Fren", impact.brakingImpact],
    ["Güvenilirlik", impact.reliabilityImpact],
    ["Termal", impact.thermalImpact],
    ["Pist", impact.trackReadinessImpact],
  ]
    .filter(([, value]) => value !== 0)
    .map(([label, value]) => `${label} ${formatSignedNumber(value as number)}`);
  const claims = [
    impact.claimedPowerDeltaHp ? `+${impact.claimedPowerDeltaHp} hp üretici beyanı` : null,
    impact.claimedTorqueDeltaNm
      ? `+${impact.claimedTorqueDeltaNm} Nm üretici beyanı`
      : null,
  ].filter((value): value is string => Boolean(value));

  return [
    components.join(", ") || "nötr",
    ...claims,
    `${calibrationConfidenceLabel(impact.confidence)} güven`,
  ].join(" · ");
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : value.toString();
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

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5">
      <p className="text-xs font-black uppercase text-white/50">{label}</p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      {detail ? <p className="mt-2 text-xs font-semibold text-white/50">{detail}</p> : null}
    </article>
  );
}

function capacityDetail(count: number, limit: number) {
  if (count > limit) {
    return "Mevcut kayıtlar korunur";
  }

  if (count === limit) {
    return "Kapasite dolu";
  }

  return `${limit - count} slot kaldı`;
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
