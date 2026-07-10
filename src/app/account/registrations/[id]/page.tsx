import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";

type AccountRegistrationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountRegistrationDetailPage({
  params,
}: AccountRegistrationDetailPageProps) {
  const { id } = await params;
  const memberUser = await requireCompleteMemberUser(`/account/registrations/${id}`);
  const registration = await prisma.registration.findFirst({
    where: {
      id,
      userId: memberUser.id,
      deletedAt: null,
    },
    include: {
      event: {
        select: {
          name: true,
          startsAt: true,
          venue: true,
        },
      },
      package: {
        select: {
          name: true,
        },
      },
      checkIns: {
        select: {
          eventDate: true,
          status: true,
          checkedInAt: true,
        },
        orderBy: {
          eventDate: "asc",
        },
      },
    },
  });

  if (!registration) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <Link
        href="/account/registrations"
        className="text-xs font-black uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
      >
        Başvurulara dön
      </Link>

      <div className="mt-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Başvuru detayı
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          {registration.event.name}
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          {registration.event.venue} · {formatDate(registration.event.startsAt)}
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <DetailSection title="Etkinlik">
          <DetailRow label="Paket" value={registration.package.name} />
          <DetailRow label="Tarih" value={formatDate(registration.event.startsAt)} />
          <DetailRow label="Başvuru durumu" value={formatRegistrationStatus(registration.status)} />
          <DetailRow label="Ödeme durumu" value={formatPaymentStatus(registration.paymentStatus)} />
          <DetailRow label="Katılımcı kodu" value={registration.participantCode ?? "-"} />
          <DetailRow label="Başvuru tarihi" value={formatDate(registration.createdAt)} />
        </DetailSection>

        <DetailSection title="Araç ve sürücü">
          <DetailRow label="Araç" value={registration.carBrandModel} />
          <DetailRow label="Plaka" value={registration.plateNumber} />
          <DetailRow label="Sürüş deneyimi" value={formatExperience(registration.experienceLevel)} />
          <DetailRow label="Acil durum kişisi" value={registration.emergencyContactName} />
          <DetailRow label="Acil durum telefonu" value={registration.emergencyContactPhone} />
        </DetailSection>

        <DetailSection title="Check-in">
          {registration.checkIns.length > 0 ? (
            registration.checkIns.map((checkIn) => (
              <DetailRow
                key={checkIn.eventDate.toISOString()}
                label={formatDate(checkIn.eventDate)}
                value={`${formatCheckInStatus(checkIn.status)}${
                  checkIn.checkedInAt ? ` · ${formatDateTime(checkIn.checkedInAt)}` : ""
                }`}
              />
            ))
          ) : (
            <DetailRow label="Durum" value="Henüz oluşturulmadı" />
          )}
        </DetailSection>
      </div>
    </section>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
      <h2 className="text-2xl font-black text-ats-text">{title}</h2>
      <dl className="mt-6 space-y-4">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-ats-border pb-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ats-muted">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-black text-ats-text">{value}</dd>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRegistrationStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING_PAYMENT: "Ödeme bekliyor",
    CONFIRMED: "Onaylandı",
    CANCELLED: "İptal",
    REJECTED: "Reddedildi",
  };

  return labels[status] ?? status;
}

function formatPaymentStatus(status: string) {
  const labels: Record<string, string> = {
    UNPAID: "Ödenmedi",
    PENDING: "Beklemede",
    PAID: "Ödendi",
    FAILED: "Başarısız",
    REFUNDED: "İade",
    REVIEW: "İnceleme",
  };

  return labels[status] ?? status;
}

function formatExperience(value: string) {
  if (value === "BEGINNER") {
    return "İlk pist tecrübem olacak";
  }

  if (value === "INTERMEDIATE") {
    return "Daha önce pist deneyimim var";
  }

  if (value === "ADVANCED") {
    return "İleri seviye pist deneyimim var";
  }

  if (value === "PROFESSIONAL") {
    return "Profesyonel / lisanslı sürücü";
  }

  return value;
}

function formatCheckInStatus(status: string) {
  const labels: Record<string, string> = {
    ELIGIBLE: "Uygun",
    CHECKED_IN: "Check-in yapıldı",
    BLOCKED: "Bloke",
    VOID: "Geçersiz",
  };

  return labels[status] ?? status;
}
