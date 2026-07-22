import { randomUUID } from "node:crypto";
import {
  Prisma,
  type EventStatus,
  type ExperienceLevel,
  type PaymentStatus,
  type RegistrationStatus,
} from "@prisma/client";
import type { AtsMemberUser } from "@/lib/member-auth";
import {
  kulaEventPublicWindow,
  kulaEventSlug,
  kulaPackageCode,
} from "@/lib/event-config";
import { MobileAuthError } from "@/lib/mobile-auth";
import {
  MobileApplicationsError,
  type MobileEventEligibilityReason,
} from "@/lib/mobile-applications-contract";
import { getPaymentMode } from "@/lib/payment-mode";
import { prisma } from "@/lib/prisma";
import {
  memberEventRegistrationSchema,
  normalizeTurkishPhone,
} from "@/lib/registration-validation";

export const mobileEventSlug = kulaEventSlug;
export const mobileEventPackageCode = kulaPackageCode;

const activeRegistrationStatuses = ["PENDING_PAYMENT", "CONFIRMED"] as const;
const eventSummary =
  "Pist sürüşleri, güvenlik brifingi ve ATS topluluğuyla tam günlük MyTrack deneyimi.";
const manualPaymentInstructions =
  "Başvurunuzdan sonra ATS ekibi ödeme ve kesin onay için sizinle iletişime geçecek.";

export type MobileApplicationInput = {
  vehicleId: string;
  experienceLevel: ExperienceLevel;
  emergencyContactName: string;
  emergencyContactPhone: string;
  kvkkAccepted: true;
  liabilityWaiverAccepted: true;
};

export type CreatedRegistrationEmailData = {
  registrationId: string;
  to: string;
  fullName: string;
  phone: string;
  carBrandModel: string;
  plateNumber: string;
  experienceLevel: ExperienceLevel;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type EligibilityInput = {
  eventExists: boolean;
  eventStatus: EventStatus | string | null;
  packageActive: boolean;
  startsAt: Date | null;
  capacity: number | null;
  reservedCount: number;
  profileComplete: boolean;
  requiredConsentsComplete: boolean;
  activeVehicleCount: number;
  hasExistingApplication: boolean;
  now: Date;
};

export function deriveMobileEventEligibility(input: EligibilityInput) {
  const reasons: MobileEventEligibilityReason[] = [];

  if (!input.eventExists) {
    reasons.push("EVENT_UNAVAILABLE");
  } else if (input.eventStatus === "DRAFT") {
    reasons.push("EVENT_NOT_PUBLISHED");
  } else if (
    input.eventStatus === "SOLD_OUT" ||
    input.eventStatus === "COMPLETED" ||
    input.eventStatus === "CANCELLED"
  ) {
    reasons.push("REGISTRATION_NOT_OPEN");
  } else if (input.eventStatus !== "PUBLISHED") {
    reasons.push("UNKNOWN_EVENT_STATE");
  }

  if (!input.packageActive) {
    reasons.push("REGISTRATION_NOT_OPEN");
  }
  if (input.startsAt && input.now >= input.startsAt) {
    reasons.push("REGISTRATION_DEADLINE_PASSED");
  }
  if (
    input.capacity !== null &&
    input.capacity > 0 &&
    input.reservedCount >= input.capacity
  ) {
    reasons.push("CAPACITY_REACHED");
  }
  if (!input.profileComplete) {
    reasons.push("PROFILE_INCOMPLETE");
  }
  if (!input.requiredConsentsComplete) {
    reasons.push("REQUIRED_CONSENTS_INCOMPLETE");
  }
  if (input.activeVehicleCount === 0) {
    reasons.push("NO_ACTIVE_VEHICLE");
  }
  if (input.hasExistingApplication) {
    reasons.push("EXISTING_APPLICATION");
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    eligible: uniqueReasons.length === 0,
    reasons: uniqueReasons,
    availableActions: uniqueReasons.length === 0 ? (["APPLY"] as const) : [],
  };
}

export function parseMobileApplicationInput(
  value: unknown,
): MobileApplicationInput | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const allowedKeys = new Set([
    "vehicleId",
    "experienceLevel",
    "emergencyContactName",
    "emergencyContactPhone",
    "kvkkAccepted",
    "liabilityWaiverAccepted",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  const parsed = memberEventRegistrationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function listMobileEvents(memberUser: AtsMemberUser, now = new Date()) {
  const event = await loadEventContext(memberUser.id, now);
  return {
    data: {
      events:
        event && event.event.status !== "DRAFT"
          ? [presentEvent(event, memberUser, now, false)]
          : [],
    },
  };
}

export async function getMobileEvent(
  memberUser: AtsMemberUser,
  slug: string,
  now = new Date(),
) {
  if (slug !== mobileEventSlug) {
    throw new MobileApplicationsError("MOBILE_APPLICATIONS_EVENT_NOT_FOUND");
  }

  const event = await loadEventContext(memberUser.id, now);
  if (!event || event.event.status === "DRAFT") {
    throw new MobileApplicationsError("MOBILE_APPLICATIONS_EVENT_NOT_FOUND");
  }

  return {
    data: {
      event: presentEvent(event, memberUser, now, true),
    },
  };
}

export async function listMobileApplications(memberUserId: string) {
  const registrations = await prisma.registration.findMany({
    where: { userId: memberUserId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: applicationSelect,
  });

  return {
    data: {
      applications: registrations.map((registration) =>
        presentApplication(registration, false),
      ),
    },
  };
}

export async function getMobileApplication(
  memberUserId: string,
  applicationId: string,
) {
  const registration = await findOwnedApplication(memberUserId, applicationId);
  return {
    data: {
      application: presentApplication(registration, true),
    },
  };
}

export async function getMobileParticipantPass(
  memberUserId: string,
  applicationId: string,
) {
  const registration = await findOwnedApplication(memberUserId, applicationId);
  if (!isParticipantPassAvailable(registration)) {
    throw new MobileApplicationsError("MOBILE_APPLICATIONS_PASS_UNAVAILABLE");
  }

  const eventWindow = presentEventWindow(registration.event);

  return {
    data: {
      pass: {
        applicationId: registration.id,
        participantCode: registration.participantCode,
        event: {
          title: registration.event.name,
          venue: registration.event.venue,
          startsAt: eventWindow.startsAt,
        },
        vehicle: {
          brandModel: registration.carBrandModel,
          plateNumber: registration.plateNumber,
        },
        qr: {
          availableInApp: false,
          delivery: "EMAIL" as const,
          message:
            "Mevcut güvenli QR kodunuz onay e-postanızda yer alır. Uygulama yeni bir QR üretmez.",
        },
      },
    },
  };
}

export async function createMemberEventApplication({
  memberUser,
  slug,
  input,
  consentIpAddress,
  source,
  now = new Date(),
}: {
  memberUser: AtsMemberUser;
  slug: string;
  input: MobileApplicationInput;
  consentIpAddress: string | null;
  source: "member_registration_form" | "mobile_application";
  now?: Date;
}) {
  if (getPaymentMode() !== "manual") {
    throw new MobileApplicationsError(
      "MOBILE_APPLICATIONS_PAYMENT_MODE_UNAVAILABLE",
    );
  }
  if (slug !== mobileEventSlug) {
    throw new MobileApplicationsError("MOBILE_APPLICATIONS_EVENT_NOT_FOUND");
  }

  const committed = await runApplicationsSerializableTransaction(async (tx) => {
    const currentMember = await tx.user.findUnique({
      where: { id: memberUser.id },
      include: { profile: true },
    });

    if (!currentMember || currentMember.deletedAt) {
      throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_UNAVAILABLE");
    }
    if (currentMember.status === "SUSPENDED") {
      throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_SUSPENDED");
    }
    if (currentMember.status !== "ACTIVE") {
      throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_UNAVAILABLE");
    }

    if (!currentMember.profile?.fullName || !currentMember.profile.phone) {
      throw new MobileApplicationsError(
        "MOBILE_APPLICATIONS_PROFILE_INCOMPLETE",
      );
    }
    if (!currentMember.memberKvkkAcceptedAt || !currentMember.memberTermsAcceptedAt) {
      throw new MobileApplicationsError(
        "MOBILE_APPLICATIONS_CONSENTS_INCOMPLETE",
      );
    }

    const event = await tx.event.findUnique({
      where: { slug },
      include: {
        packages: {
          where: { code: mobileEventPackageCode, active: true },
          take: 1,
        },
      },
    });
    const eventPackage = event?.packages[0];
    if (!event || !eventPackage) {
      throw new MobileApplicationsError("MOBILE_APPLICATIONS_EVENT_NOT_FOUND");
    }
    if (event.status !== "PUBLISHED") {
      throw new MobileApplicationsError("MOBILE_APPLICATIONS_EVENT_NOT_OPEN");
    }
    if (now >= event.startsAt) {
      throw new MobileApplicationsError("MOBILE_APPLICATIONS_DEADLINE_PASSED");
    }

    const vehicle = await tx.vehicle.findFirst({
      where: {
        id: input.vehicleId,
        userId: currentMember.id,
        deletedAt: null,
      },
      select: {
        id: true,
        brand: true,
        model: true,
        plateNumber: true,
      },
    });
    if (!vehicle) {
      throw new MobileApplicationsError(
        "MOBILE_APPLICATIONS_VEHICLE_NOT_FOUND",
      );
    }

    const duplicate = await tx.registration.findFirst({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        deletedAt: null,
        status: { in: [...activeRegistrationStatuses] },
        OR: [
          { userId: currentMember.id },
          {
            email: currentMember.email,
            plateNumber: vehicle.plateNumber,
          },
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new MobileApplicationsError("MOBILE_APPLICATIONS_DUPLICATE");
    }

    const reservedCount = await tx.registration.count({
      where: {
        eventId: event.id,
        packageId: eventPackage.id,
        deletedAt: null,
        status: { in: [...activeRegistrationStatuses] },
      },
    });
    if (eventPackage.capacity > 0 && reservedCount >= eventPackage.capacity) {
      throw new MobileApplicationsError(
        "MOBILE_APPLICATIONS_CAPACITY_REACHED",
      );
    }

    const snapshotVehicle = `${vehicle.brand} ${vehicle.model}`
      .trim()
      .replace(/\s+/g, " ");
    const registration = await tx.registration.create({
      data: {
        eventId: event.id,
        packageId: eventPackage.id,
        userId: currentMember.id,
        vehicleId: vehicle.id,
        registrationSource: "MEMBER_ACCOUNT",
        fullName: currentMember.profile.fullName,
        phone: currentMember.profile.phone,
        email: currentMember.email,
        carBrandModel: snapshotVehicle,
        plateNumber: vehicle.plateNumber,
        experienceLevel: input.experienceLevel,
        emergencyContactName: input.emergencyContactName
          .trim()
          .replace(/\s+/g, " "),
        emergencyContactPhone: normalizeTurkishPhone(
          input.emergencyContactPhone,
        ),
        kvkkAcceptedAt: now,
        liabilityWaiverAcceptedAt: now,
        marketingConsentAt:
          currentMember.memberMarketingConsentAt &&
          !currentMember.memberMarketingConsentRevokedAt
            ? now
            : null,
        consentIpAddress,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
      },
      select: {
        ...applicationSelect,
        fullName: true,
        phone: true,
        email: true,
      },
    });

    await tx.payment.create({
      data: {
        registrationId: registration.id,
        provider: "MANUAL",
        conversationId: `manual-${randomUUID()}`,
        amount: eventPackage.price,
        currency: eventPackage.currency,
        status: "INITIATED",
      },
    });

    await tx.auditLog.create({
      data: {
        registrationId: registration.id,
        action: "CREATED",
        after: {
          source,
          status: "PENDING_PAYMENT",
          paymentStatus: "UNPAID",
        },
        reason: "Registration created from an authenticated member flow.",
        ipAddress: consentIpAddress,
      },
    });

    return registration;
  });

  return {
    application: presentApplication(committed, true),
    email: {
      registrationId: committed.id,
      to: committed.email,
      fullName: committed.fullName,
      phone: committed.phone,
      carBrandModel: committed.carBrandModel,
      plateNumber: committed.plateNumber,
      experienceLevel: committed.experienceLevel,
      emergencyContactName: committed.emergencyContactName,
      emergencyContactPhone: committed.emergencyContactPhone,
    } satisfies CreatedRegistrationEmailData,
  };
}

const applicationSelect = Prisma.validator<Prisma.RegistrationSelect>()({
  id: true,
  carBrandModel: true,
  plateNumber: true,
  experienceLevel: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  status: true,
  paymentStatus: true,
  participantCode: true,
  qrIssuedAt: true,
  createdAt: true,
  event: {
    select: {
      slug: true,
      name: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
  },
  package: {
    select: {
      name: true,
      price: true,
      currency: true,
    },
  },
  payments: {
    where: { provider: "MANUAL" },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      amount: true,
      currency: true,
    },
  },
  checkIns: {
    select: {
      eventDate: true,
      status: true,
      checkedInAt: true,
    },
    orderBy: { eventDate: "asc" },
  },
});

type ApplicationRecord = Prisma.RegistrationGetPayload<{
  select: typeof applicationSelect;
}>;

async function findOwnedApplication(memberUserId: string, applicationId: string) {
  const registration = await prisma.registration.findFirst({
    where: {
      id: applicationId,
      userId: memberUserId,
      deletedAt: null,
    },
    select: applicationSelect,
  });
  if (!registration) {
    throw new MobileApplicationsError(
      "MOBILE_APPLICATIONS_APPLICATION_NOT_FOUND",
    );
  }
  return registration;
}

async function loadEventContext(memberUserId: string, now: Date) {
  const event = await prisma.event.findUnique({
    where: { slug: mobileEventSlug },
    include: {
      packages: {
        where: { code: mobileEventPackageCode },
        take: 1,
      },
    },
  });
  if (!event) {
    return null;
  }

  const eventPackage = event.packages[0] ?? null;
  const [reservedCount, activeVehicles, existingApplication] = await Promise.all([
    eventPackage
      ? prisma.registration.count({
          where: {
            eventId: event.id,
            packageId: eventPackage.id,
            deletedAt: null,
            status: { in: [...activeRegistrationStatuses] },
          },
        })
      : Promise.resolve(0),
    prisma.vehicle.findMany({
      where: { userId: memberUserId, deletedAt: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        plateNumber: true,
        isPrimary: true,
      },
    }),
    eventPackage
      ? prisma.registration.findFirst({
          where: {
            eventId: event.id,
            packageId: eventPackage.id,
            userId: memberUserId,
            deletedAt: null,
            status: { in: [...activeRegistrationStatuses] },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return { event, eventPackage, reservedCount, activeVehicles, existingApplication, now };
}

function presentEvent(
  context: NonNullable<Awaited<ReturnType<typeof loadEventContext>>>,
  memberUser: AtsMemberUser,
  now: Date,
  includeVehicles: boolean,
) {
  const { event, eventPackage, reservedCount, activeVehicles, existingApplication } =
    context;
  const profileComplete = Boolean(memberUser.profile?.fullName && memberUser.profile.phone);
  const requiredConsentsComplete = Boolean(
    memberUser.memberKvkkAcceptedAt && memberUser.memberTermsAcceptedAt,
  );
  const eligibility = deriveMobileEventEligibility({
    eventExists: true,
    eventStatus: event.status,
    packageActive: Boolean(eventPackage?.active),
    startsAt: event.startsAt,
    capacity: eventPackage?.capacity ?? null,
    reservedCount,
    profileComplete,
    requiredConsentsComplete,
    activeVehicleCount: activeVehicles.length,
    hasExistingApplication: Boolean(existingApplication),
    now,
  });
  const eventWindow = presentEventWindow(event);

  return {
    slug: event.slug,
    title: event.name,
    venue: event.venue,
    startsAt: eventWindow.startsAt,
    endsAt: eventWindow.endsAt,
    timezone: event.timezone,
    summary: eventSummary,
    registration: {
      state: registrationState(eligibility.reasons),
      deadline: event.startsAt.toISOString(),
      capacity: capacityState(eventPackage?.capacity ?? null, reservedCount),
    },
    package: eventPackage
      ? {
          name: eventPackage.name,
          price: {
            amount: eventPackage.price.toFixed(2),
            currency: eventPackage.currency,
          },
          paymentMode: "MANUAL" as const,
          paymentInstructions: manualPaymentInstructions,
        }
      : null,
    eligibility,
    ...(includeVehicles
      ? {
          vehicles: activeVehicles,
          confirmations: [
            {
              code: "KVKK" as const,
              label: "KVKK Aydınlatma Metni'ni okudum ve kabul ediyorum.",
            },
            {
              code: "LIABILITY_WAIVER" as const,
              label:
                "Motorsporları Katılım ve Sorumluluk Beyanı'nı okudum ve kabul ediyorum.",
            },
          ],
        }
      : {}),
  };
}

function presentApplication(registration: ApplicationRecord, includePrivate: boolean) {
  const status = presentApplicationStatus(
    registration.status,
    registration.paymentStatus,
  );
  const passAvailable = isParticipantPassAvailable(registration);
  const paymentSnapshot = registration.payments[0];
  const eventWindow = presentEventWindow(registration.event);
  return {
    id: registration.id,
    event: {
      slug: registration.event.slug,
      title: registration.event.name,
      venue: registration.event.venue,
      startsAt: eventWindow.startsAt,
      endsAt: eventWindow.endsAt,
      lifecycle:
        registration.event.status === "COMPLETED"
          ? ("COMPLETED" as const)
          : registration.event.status === "CANCELLED"
            ? ("CANCELLED" as const)
            : ("UPCOMING" as const),
    },
    package: {
      name: registration.package.name,
      price: {
        amount: (paymentSnapshot?.amount ?? registration.package.price).toFixed(2),
        currency: paymentSnapshot?.currency ?? registration.package.currency,
      },
    },
    vehicle: {
      brandModel: registration.carBrandModel,
      plateNumber: registration.plateNumber,
    },
    experience: presentExperience(registration.experienceLevel),
    status,
    payment: presentPayment(registration.paymentStatus),
    participantPass: {
      available: passAvailable,
      action: passAvailable ? ("VIEW_PASS" as const) : null,
    },
    submittedAt: registration.createdAt.toISOString(),
    ...(includePrivate
      ? {
          emergencyContact: {
            name: registration.emergencyContactName,
            phone: registration.emergencyContactPhone,
          },
          checkInHistory: registration.checkIns.map((checkIn) => ({
            eventDate: checkIn.eventDate.toISOString(),
            status: presentCheckInStatus(checkIn.status),
            checkedInAt: checkIn.checkedInAt?.toISOString() ?? null,
          })),
        }
      : {}),
  };
}

export function presentEventWindow(event: {
  slug: string;
  startsAt: Date;
  endsAt: Date;
}) {
  return event.slug === kulaEventSlug
    ? kulaEventPublicWindow
    : {
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
      };
}

function presentCheckInStatus(status: string) {
  if (status === "ELIGIBLE") {
    return { code: "ELIGIBLE" as const, label: "Check-in için uygun" };
  }
  if (status === "CHECKED_IN") {
    return { code: "CHECKED_IN" as const, label: "Check-in tamamlandı" };
  }
  if (status === "BLOCKED") {
    return { code: "BLOCKED" as const, label: "Check-in kullanılamıyor" };
  }
  return { code: "UNAVAILABLE" as const, label: "Check-in kullanılamıyor" };
}

export function presentApplicationStatus(
  registrationStatus: RegistrationStatus | string,
  paymentStatus: PaymentStatus | string,
) {
  if (registrationStatus === "CONFIRMED" && paymentStatus === "PAID") {
    return {
      code: "CONFIRMED" as const,
      label: "Onaylandı",
      message: "Ödemeniz alınmış ve etkinlik katılımınız kesinleşmiştir.",
    };
  }
  if (registrationStatus === "PENDING_PAYMENT" && paymentStatus === "UNPAID") {
    return {
      code: "AWAITING_MANUAL_PAYMENT" as const,
      label: "Ödeme bekliyor",
      message: manualPaymentInstructions,
    };
  }
  if (
    registrationStatus === "PENDING_PAYMENT" &&
    (paymentStatus === "PENDING" || paymentStatus === "REVIEW")
  ) {
    return {
      code: "PAYMENT_REVIEW" as const,
      label: "Ödeme inceleniyor",
      message: "Ödeme bildiriminiz ekip tarafından inceleniyor.",
    };
  }
  if (registrationStatus === "REJECTED") {
    return {
      code: "REJECTED" as const,
      label: "Reddedildi",
      message: "Başvurunuz etkinlik ekibi tarafından onaylanmadı.",
    };
  }
  if (registrationStatus === "CANCELLED") {
    return {
      code: "CANCELLED" as const,
      label: "İptal edildi",
      message: "Bu başvuru artık aktif değil.",
    };
  }
  return {
    code: "STATUS_PENDING" as const,
    label: "Durum güncelleniyor",
    message: "Başvurunuzun güncel durumu için daha sonra tekrar kontrol edin.",
  };
}

function presentPayment(paymentStatus: PaymentStatus) {
  const presentations: Record<
    PaymentStatus,
    { code: string; label: string; received: boolean }
  > = {
    UNPAID: { code: "AWAITING", label: "Ödeme bekleniyor", received: false },
    PENDING: { code: "UNDER_REVIEW", label: "Ödeme inceleniyor", received: false },
    REVIEW: { code: "UNDER_REVIEW", label: "Ödeme inceleniyor", received: false },
    PAID: { code: "RECEIVED", label: "Ödeme alındı", received: true },
    FAILED: { code: "FAILED", label: "Ödeme tamamlanamadı", received: false },
    REFUNDED: { code: "REFUNDED", label: "Ödeme iade edildi", received: false },
  };
  return {
    mode: "MANUAL" as const,
    ...presentations[paymentStatus],
    instructions: manualPaymentInstructions,
  };
}

function presentExperience(level: ExperienceLevel) {
  const labels: Record<ExperienceLevel, string> = {
    BEGINNER: "İlk pist tecrübem olacak",
    INTERMEDIATE: "Daha önce pist deneyimim var",
    ADVANCED: "İleri seviye pist deneyimim var",
    PROFESSIONAL: "Profesyonel / lisanslı sürücü",
  };
  return { code: level, label: labels[level] };
}

function isParticipantPassAvailable(registration: ApplicationRecord) {
  return Boolean(
    registration.status === "CONFIRMED" &&
      registration.paymentStatus === "PAID" &&
      registration.participantCode &&
      registration.qrIssuedAt,
  );
}

function registrationState(reasons: MobileEventEligibilityReason[]) {
  if (reasons.includes("CAPACITY_REACHED")) return "FULL" as const;
  if (reasons.includes("EXISTING_APPLICATION")) return "ALREADY_APPLIED" as const;
  if (
    reasons.includes("EVENT_NOT_PUBLISHED") ||
    reasons.includes("REGISTRATION_NOT_OPEN") ||
    reasons.includes("REGISTRATION_DEADLINE_PASSED") ||
    reasons.includes("EVENT_UNAVAILABLE") ||
    reasons.includes("UNKNOWN_EVENT_STATE")
  ) {
    return "CLOSED" as const;
  }
  return "OPEN" as const;
}

function capacityState(capacity: number | null, reservedCount: number) {
  if (!capacity || capacity <= 0) return "UNLIMITED" as const;
  return reservedCount >= capacity ? ("FULL" as const) : ("AVAILABLE" as const);
}

export async function runApplicationsSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (attempt < 3 && isSerializableConflict(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new MobileApplicationsError("MOBILE_APPLICATIONS_CREATE_FAILED");
}

function isSerializableConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype,
  );
}
