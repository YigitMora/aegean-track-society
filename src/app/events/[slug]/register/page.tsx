import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";
import { RegistrationForm } from "@/components/registration-form";
import { prisma } from "@/lib/prisma";

type RegisterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function getDatabaseUrlHost() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return "missing";
  }

  try {
    return new URL(databaseUrl).host || "missing-host";
  } catch {
    return "invalid";
  }
}

function logDatabaseUrlDebug() {
  console.log("DATABASE_URL_EXISTS", Boolean(process.env.DATABASE_URL));
  console.log("DATABASE_URL_HOST", getDatabaseUrlHost());
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  logDatabaseUrlDebug();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      days: {
        orderBy: { date: "asc" },
      },
      packages: {
        where: {
          code: "SEP20",
          active: true,
        },
        take: 1,
      },
    },
  });

  if (!event) {
    notFound();
  }

  const eventPackage = event.packages[0];

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section className="border-b border-ats-border bg-ats-black">
        <PublicNav />

        <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-14 pt-12 sm:px-8 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:px-10 lg:pb-20 lg:pt-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              {event.venue} · 20 Eylül 2026 Pazar
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-none text-ats-text sm:text-7xl">
              Kula MyTrack Pist Etkinliği Kayıt
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ats-muted">
              Sürücü, araç, acil durum iletişimi ve yasal onay bilgilerinizi
              gönderin. Online ödeme şu anda aktif değildir; ekibimiz ödeme ve
              kesin onay için sizinle iletişime geçer.
            </p>
          </div>

          <div className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-muted">
              Paket
            </p>
            <h2 className="mt-3 text-2xl font-black text-ats-text">
              {eventPackage?.name === "Sunday Track Day"
                ? "Pazar Pist Günü"
                : eventPackage?.name ?? "Pazar Pist Günü"}
            </h2>
            <p className="mt-3 text-sm font-bold text-ats-blue">
              Manuel ödeme onayı ile kesinleşir.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <aside className="space-y-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              20 Eylül 2026 Pazar
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Kula MyTrack Track Day
            </h2>
          </div>
          <p className="text-sm leading-6 text-ats-muted">
            Kontenjan her kayıt talebinden önce kontrol edilir. Bekleyen
            kayıtlar, ekibimiz ödeme onayını tamamlayana kadar yer ayırır.
          </p>
        </aside>

        {eventPackage ? (
          <RegistrationForm />
        ) : (
          <section className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-blue">
              Kayıt kapalı
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Pazar Pist Günü kaydı henüz açık değil.
            </h2>
            <p className="mt-4 text-sm leading-6 text-ats-muted">
              Kayıt alınabilmesi için etkinlik paketinin aktif olması gerekir.
            </p>
          </section>
        )}
      </section>

      <FooterCredit />
    </main>
  );
}
