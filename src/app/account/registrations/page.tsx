import Link from "next/link";
import { requireCompleteMemberUser } from "@/lib/member-access";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";

export default async function AccountRegistrationsPage() {
  const memberUser = await requireCompleteMemberUser("/account/registrations");
  const registrations = await measureServerTiming("REGISTRATIONS_QUERY", () =>
    prisma.registration.findMany({
      where: {
        userId: memberUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        carBrandModel: true,
        plateNumber: true,
        status: true,
        paymentStatus: true,
        participantCode: true,
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          Üye alanı
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Başvurularım
        </h1>
        <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
          Üye hesabınızla yaptığınız etkinlik başvurularını burada takip
          edebilirsiniz.
        </p>
      </div>

      {registrations.length > 0 ? (
        <div className="mt-10 overflow-hidden rounded-lg border border-ats-border bg-ats-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ats-border text-left text-sm">
              <thead className="bg-ats-black text-xs uppercase tracking-[0.14em] text-ats-muted">
                <tr>
                  <th className="px-5 py-4">Etkinlik</th>
                  <th className="px-5 py-4">Tarih</th>
                  <th className="px-5 py-4">Araç</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4">Ödeme</th>
                  <th className="px-5 py-4">Kod</th>
                  <th className="px-5 py-4">Oluşturma</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ats-border">
                {registrations.map((registration) => (
                  <tr key={registration.id} className="align-top">
                    <td className="px-5 py-4 font-black text-ats-text">
                      {registration.event.name}
                      <span className="mt-1 block text-xs font-semibold text-ats-muted">
                        {registration.package.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-muted">
                      {formatDate(registration.event.startsAt)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-text">
                      {registration.carBrandModel}
                      <span className="mt-1 block text-xs text-ats-muted">
                        {registration.plateNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-muted">
                      {formatRegistrationStatus(registration.status)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-muted">
                      {formatPaymentStatus(registration.paymentStatus)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-muted">
                      {registration.participantCode ?? "-"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-ats-muted">
                      {formatDate(registration.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/account/registrations/${registration.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-ats-border px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <section className="mt-10 rounded-lg border border-ats-border bg-ats-surface p-8 shadow-soft">
          <h2 className="text-3xl font-black text-ats-text">Henüz başvurunuz yok.</h2>
          <p className="mt-4 text-sm leading-6 text-ats-muted">
            Kula MyTrack başvurunuzu etkinlik sayfasından oluşturabilirsiniz.
          </p>
          <Link
            href="/events/kula-mytrack-2026/register"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
          >
            Etkinliğe Başvur
          </Link>
        </section>
      )}
    </section>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
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
