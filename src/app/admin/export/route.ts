import { NextResponse } from "next/server";
import { adminHasCapability, getAdminActorForRoute } from "@/lib/admin-authorization";
import { formatDateOnly } from "@/lib/admin-format";
import { kulaEventSlug } from "@/lib/event-config";
import { myTrackPaymentPreferenceLabel } from "@/lib/mytrack-payment-preference";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const headers = [
  "participantCode",
  "fullName",
  "phone",
  "email",
  "carBrandModel",
  "plateNumber",
  "experienceLevel",
  "emergencyContactName",
  "emergencyContactPhone",
  "status",
  "paymentStatus",
  "myTrackPaymentPreference",
  "checkedInStatus",
  "createdAt",
];

export async function GET(request: Request) {
  const adminActor = await getAdminActorForRoute();

  if (!adminActor) {
    return NextResponse.redirect(new URL("/admin/login", request.url), {
      status: 303,
    });
  }

  if (!adminHasCapability(adminActor.role, "registrations.manage")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const registrations = await prisma.registration.findMany({
    where: {
      deletedAt: null,
      event: {
        slug: kulaEventSlug,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      participantCode: true,
      fullName: true,
      phone: true,
      email: true,
      carBrandModel: true,
      plateNumber: true,
      experienceLevel: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      status: true,
      paymentStatus: true,
      mytrackPaymentPreference: true,
      createdAt: true,
      checkIns: {
        orderBy: { eventDate: "asc" },
        select: {
          eventDate: true,
          status: true,
          checkedInAt: true,
        },
      },
    },
  });

  const rows = registrations.map((registration) => [
    registration.participantCode ?? "",
    registration.fullName,
    registration.phone,
    registration.email,
    registration.carBrandModel,
    registration.plateNumber,
    registration.experienceLevel,
    registration.emergencyContactName,
    registration.emergencyContactPhone,
    registration.status,
    registration.paymentStatus,
    myTrackPaymentPreferenceLabel(registration.mytrackPaymentPreference),
    formatCheckInStatus(registration.checkIns),
    registration.createdAt.toISOString(),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kula-mytrack-participants.csv"',
      "Cache-Control": "no-store",
    },
  });
}

function formatCheckInStatus(
  checkIns: Array<{ eventDate: Date; status: string; checkedInAt: Date | null }>,
) {
  if (checkIns.length === 0) {
    return "NO_CHECKIN_ROW";
  }

  return checkIns
    .map((checkIn) => {
      const checkedInAt = checkIn.checkedInAt ? ` at ${checkIn.checkedInAt.toISOString()}` : "";
      return `${formatDateOnly(checkIn.eventDate)}:${checkIn.status}${checkedInAt}`;
    })
    .join(" | ");
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
