import Link from "next/link";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";
import { getOptionalAuthenticatedMemberIdentity } from "@/lib/member-auth";
import { prisma } from "@/lib/prisma";

type RegistrationSuccessPageProps = {
  searchParams: Promise<{
    registrationId?: string;
  }>;
};

export default async function RegistrationSuccessPage({
  searchParams,
}: RegistrationSuccessPageProps) {
  const { registrationId } = await searchParams;
  const registration = registrationId
    ? await prisma.registration.findUnique({
        where: {
          id: registrationId,
        },
        select: {
          id: true,
          userId: true,
          registrationSource: true,
        },
      })
    : null;
  const memberIdentity = registration?.userId
    ? await getOptionalAuthenticatedMemberIdentity()
    : null;
  const memberRegistrationDetailHref =
    registration?.userId && memberIdentity?.id === registration.userId
      ? `/account/registrations/${registration.id}`
      : null;
  const anonymousRegistrationReference =
    registration?.registrationSource === "PUBLIC_ANONYMOUS" ? registration.id : null;

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <PublicNav />

      <section className="mx-auto max-w-4xl px-6 py-20 sm:px-8 lg:px-10 lg:py-28">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
          Kayıt talebi alındı
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          Talebiniz ekibimize ulaştı.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ats-muted">
          Kayıt bilgileriniz kaydedildi. Ekibimiz ödeme ve kesin onay için
          sizinle iletişime geçecek. Onay tamamlandığında QR kodlu bilgilendirme
          e-postası gönderilecektir.
        </p>

        {memberRegistrationDetailHref ? (
          <div className="mt-8 rounded-lg border border-ats-border bg-ats-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
              Başvuru detayı
            </p>
            <Link
              href={memberRegistrationDetailHref}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-ats-border px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
            >
              Başvurumu Görüntüle
            </Link>
          </div>
        ) : null}

        {anonymousRegistrationReference ? (
          <div className="mt-8 rounded-lg border border-ats-border bg-ats-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted">
              Kayıt referansı
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-ats-text">
              {anonymousRegistrationReference}
            </p>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/events/kula-mytrack-2026"
            className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
          >
            Etkinliğe dön
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black text-ats-text transition hover:border-ats-blue hover:text-ats-blue"
          >
            Ana sayfa
          </Link>
        </div>
      </section>

      <FooterCredit />
    </main>
  );
}
