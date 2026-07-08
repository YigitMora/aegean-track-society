import Link from "next/link";
import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";
import { atsImages } from "@/lib/ats-images";
import { prisma } from "@/lib/prisma";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatPrice(price: { toNumber: () => number }, currency: string) {
  const amount = price.toNumber();

  if (amount === 0) {
    return "Fiyat için iletişime geçin";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function displayPackageName(name: string) {
  return name === "Sunday Track Day" ? "Pazar Pist Günü" : name;
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      days: {
        orderBy: { date: "asc" },
      },
      packages: {
        include: {
          days: {
            include: {
              eventDay: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const orderedPackages = [...event.packages].sort((a, b) => {
    const order: Record<string, number> = { SEP20: 1 };
    return (order[a.code] ?? 99) - (order[b.code] ?? 99);
  });

  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section id="etkinlik" className="relative isolate overflow-hidden border-b border-ats-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(0,163,224,0.15),transparent_30%)]" />
        <div className="relative">
          <PublicNav />

          <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-10 lg:pb-24 lg:pt-20">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
                {event.venue} · 20 Eylül 2026 Pazar
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-none text-ats-text sm:text-7xl">
                Kula MyTrack Track Day
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ats-muted">
                Temiz kayıt akışı, manuel ödeme onayı ve sahada hızlı QR
                check-in için hazırlanmış premium pist günü deneyimi.
              </p>
            </div>

            <div
              data-image-src={atsImages.experienceRear}
              className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft"
            >
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-ats-muted">
                Etkinlik tarihi
              </p>
              <div className="mt-5 space-y-4">
                {event.days.map((day) => (
                  <div key={day.id} className="flex items-center justify-between gap-4">
                    <span className="text-lg font-black text-ats-text">
                      {formatDate(day.date)}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-ats-blue" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              Paket
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Pazar Pist Günü
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-ats-muted">
            Kayıt talebi alınır; online kart ödemesi şu anda aktif değildir.
            Ekibimiz ödeme ve kesin onay için sizinle iletişime geçer.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {orderedPackages.map((eventPackage) => {
            const dates = eventPackage.days
              .map((link) => link.eventDay.date)
              .sort((a, b) => a.getTime() - b.getTime())
              .map(formatDate);

            return (
              <article
                key={eventPackage.id}
                className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-ats-text">
                      {displayPackageName(eventPackage.name)}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-ats-muted">{eventPackage.code}</p>
                  </div>
                  <span className="rounded-full border border-ats-border px-3 py-1 text-xs font-bold text-ats-muted">
                    {eventPackage.capacity > 0
                      ? `${eventPackage.capacity} kontenjan`
                      : "Kontenjan sınırlı"}
                  </span>
                </div>
                <p className="mt-6 text-2xl font-black text-ats-blue">
                  {formatPrice(eventPackage.price, eventPackage.currency)}
                </p>
                <div className="mt-6 space-y-2">
                  {dates.map((date) => (
                    <p key={date} className="text-sm font-bold text-ats-muted">
                      {date}
                    </p>
                  ))}
                </div>
                <Link
                  href={`/events/${event.slug}/register`}
                  className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-ats-blue px-5 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
                >
                  Kayıt Ol
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section id="program" className="border-y border-ats-border bg-ats-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
              Program
            </p>
            <h2 className="mt-3 text-3xl font-black text-ats-text">
              Etkinlik günü akışı
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Kayıt", "Katılımcı doğrulama, araç bilgileri ve operasyon kontrolü."],
              ["Briefing", "Pist kuralları, bayraklar, seans ritmi ve güvenlik notları."],
              ["Seanslar", "Disiplinli çıkışlar ve kontrollü sürüş grupları."],
              ["Check-in", "Onaylı katılımcılar için QR ile hızlı giriş."],
            ].map(([title, body]) => (
              <article key={title} className="rounded-lg border border-ats-border bg-ats-black p-5">
                <h3 className="text-lg font-black text-ats-text">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ats-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="galeri" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
            Galeri
          </p>
          <h2 className="mt-3 text-3xl font-black text-ats-text">
            Gerçek fotoğraflar için hazır yapı
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div
            data-image-src={atsImages.hero}
            className="min-h-[360px] rounded-lg border border-ats-border bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(0,163,224,0.08),rgba(8,11,15,0.96))]"
          />
          <div className="grid gap-4">
            {[atsImages.gallery01, atsImages.gallery02].map((src) => (
              <div
                key={src}
                data-image-src={src}
                className="min-h-[172px] rounded-lg border border-ats-border bg-ats-surface"
              />
            ))}
          </div>
        </div>
      </section>

      <section id="sss" className="border-t border-ats-border bg-ats-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
            SSS
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Kayıt kesinleşmesi nasıl olur?",
                "Form gönderildikten sonra kayıt talebiniz beklemeye alınır; ödeme manuel onaylandığında QR e-postası gönderilir.",
              ],
              [
                "Aynı gün check-in yapılacak mı?",
                "Evet. Onaylı katılımcılar 20 Eylül 2026 Pazar günü QR kod ile check-in yapar.",
              ],
              [
                "Aegean Track Days nedir?",
                "Aegean Track Society çatısı altında planlanan pist günü etkinlik serisidir.",
              ],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-lg border border-ats-border bg-ats-black p-5">
                <h3 className="text-base font-black text-ats-text">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-ats-muted">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FooterCredit />
    </main>
  );
}
