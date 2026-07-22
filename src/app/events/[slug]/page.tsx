import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FooterCredit } from "@/components/footer-credit";
import { PublicNav } from "@/components/public-nav";
import { kulaEventScheduleItems } from "@/lib/event-config";
import { prisma } from "@/lib/prisma";
import { measureServerTiming } from "@/lib/server-timing";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type EventFact = {
  label: string;
  value: string;
  detail: string;
};

export const revalidate = 300;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
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

const eventHeroImage = {
  src: "/images/events/kula-mytrack-2026/event-hero-i20n.jpg",
  alt: "Hyundai i20 N gün batımında Kula MyTrack pistinde",
  className: "object-[62%_50%] sm:object-[60%_50%] lg:object-[58%_52%]",
} as const;

const eventConceptImage = {
  src: "/images/events/kula-mytrack-2026/event-gallery-ats-lineup.jpg",
  alt: "IONIQ 5 N, Honda Civic Type R ve Hyundai i20 N Kula MyTrack alanında",
  className: "object-[50%_58%]",
} as const;

const eventExperienceItems = [
  {
    title: "Kontrollü seans yapısı",
    body: "Katılım sınırlı tutulur; pist çıkışları gün içindeki operasyon akışına göre yönetilir.",
  },
  {
    title: "Sürücü briefingi",
    body: "Bayraklar, pist disiplini, geçiş yaklaşımı ve paddock akışı gün başlamadan netleşir.",
  },
  {
    title: "Pist operasyonu",
    body: "Kayıt, teknik gözlem ve QR check-in akışı sahada hızlı karar vermeyi destekler.",
  },
  {
    title: "Topluluk deneyimi",
    body: "Amaç tur zamanı kovalamak değil; doğru kültürle daha temiz, daha bilinçli sürüş zamanı üretmek.",
  },
] as const;

const eventRequirements = [
  "Geçerli sürücü belgesi ve tamamlanmış dijital kayıt gerekir.",
  "Araç yol kullanımına uygun, emniyet kemerli ve temel mekanik kontrolleri yapılmış olmalıdır.",
  "Lastik, fren ve sıvı durumu piste çıkış öncesi sürüşe uygun seviyede olmalıdır.",
  "Kask, yolcu, yaş ve gürültü kuralları etkinlik öncesi operasyon duyurusunda kesinleştirilir.",
  "Briefing ve pist görevlisi yönlendirmeleri tüm katılımcılar için bağlayıcıdır.",
] as const;

const eventIncludedItems = [
  "Kula MyTrack pist erişimi",
  "Sürücü briefingi ve operasyon akışı",
  "Dijital kayıt ve QR check-in",
  "Sınırlı katılımcı yapısına göre seans planı",
  "Paddock yönlendirmesi ve etkinlik günü destek akışı",
] as const;

const eventGalleryImages = [
  {
    src: "/images/events/kula-mytrack-2026/event-gallery-i20n-track.jpg",
    alt: "Hyundai i20 N pistte yüksek hızda viraj çıkışında",
    className: "md:col-span-8",
    aspectClassName: "aspect-[16/9]",
    imageClassName: "object-[52%_50%]",
    sizes: "(min-width: 1024px) 66vw, (min-width: 768px) 100vw, 100vw",
  },
  {
    src: "/images/events/kula-mytrack-2026/event-gallery-i20n-drift.jpg",
    alt: "Hyundai i20 N viraj çıkışında pist kenarında toz kaldırırken",
    className: "md:col-span-4",
    aspectClassName: "aspect-[4/5] md:aspect-[4/5]",
    imageClassName: "object-[64%_50%]",
    sizes: "(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 100vw",
  },
  {
    src: "/images/events/kula-mytrack-2026/event-gallery-i20n-close.jpg",
    alt: "Hyundai i20 N pistte önden görünüm",
    className: "md:col-span-12",
    aspectClassName: "aspect-[16/9] lg:aspect-[16/8]",
    imageClassName: "object-[50%_46%]",
    sizes: "(min-width: 1024px) 100vw, (min-width: 768px) 50vw, 100vw",
  },
] as const;

const eventFaqItems = [
  {
    question: "Kimler katılabilir?",
    answer:
      "Dijital kaydı tamamlanan, geçerli sürücü belgesine sahip ve etkinlik operasyon kurallarını kabul eden sürücüler katılabilir.",
  },
  {
    question: "Kask gerekli mi?",
    answer:
      "Kask ve ekipman kuralları etkinlik öncesi operasyon duyurusunda netleştirilir; duyurudaki kural piste çıkış için esas alınır.",
  },
  {
    question: "Araçta modifikasyon şart mı?",
    answer:
      "Hayır. Yol otomobiliyle katılım mümkündür; önemli olan aracın bakımlı, güvenli ve pist akışına uygun durumda olmasıdır.",
  },
  {
    question: "Yanımda misafir getirebilir miyim?",
    answer:
      "Misafir ve yolcu kuralları kontenjan, paddock düzeni ve güvenlik planına göre etkinlik öncesi duyurulur.",
  },
  {
    question: "Ödeme nasıl yapılır?",
    answer:
      "Başvuru alındıktan sonra ödeme ve kesin onay süreci ekip tarafından manuel olarak tamamlanır.",
  },
  {
    question: "İptal veya hava şartları nasıl yönetilir?",
    answer:
      "İptal, iade ve hava şartlarına bağlı operasyon kararları etkinlik koşulları ve güncel duyuru üzerinden paylaşılır.",
  },
] as const;

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await measureServerTiming("EVENT_QUERY", () =>
    prisma.event.findUnique({
      where: { slug },
      select: {
        slug: true,
        venue: true,
        status: true,
        days: {
          orderBy: { date: "asc" },
          select: {
            id: true,
            date: true,
          },
        },
        packages: {
          select: {
            id: true,
            name: true,
            code: true,
            capacity: true,
            price: true,
            currency: true,
            days: {
              select: {
                eventDay: {
                  select: {
                    date: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    }),
  );

  if (!event) {
    notFound();
  }

  const orderedPackages = [...event.packages].sort((a, b) => {
    const order: Record<string, number> = { SEP20: 1 };
    return (order[a.code] ?? 99) - (order[b.code] ?? 99);
  });
  const primaryPackage = orderedPackages[0] ?? null;
  const eventDate = event.days[0]?.date ?? null;
  const registerHref = `/events/${event.slug}/register`;
  const facts = eventFacts({
    eventDate,
    venue: event.venue,
    packageName: primaryPackage?.name ?? null,
    capacity: primaryPackage?.capacity ?? null,
    price: primaryPackage?.price ?? null,
    currency: primaryPackage?.currency ?? "TRY",
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-ats-black text-ats-text">
      <section
        id="event-hero"
        className="relative isolate min-h-[88svh] overflow-hidden sm:min-h-[90svh]"
      >
        <Image
          src={eventHeroImage.src}
          alt={eventHeroImage.alt}
          fill
          priority
          sizes="100vw"
          className={`object-cover ${eventHeroImage.className}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.92)_0%,rgba(8,11,15,0.58)_42%,rgba(8,11,15,0.14)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,15,0.30)_0%,rgba(8,11,15,0.04)_46%,rgba(8,11,15,0.70)_100%)]" />

        <div className="relative z-10">
          <PublicNav />
          <div className="mx-auto flex max-w-6xl flex-col px-6 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-10 lg:pb-24 lg:pt-28">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-ats-blue">
                KULA MYTRACK
              </p>
              <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                Kontrollü pist zamanı. Gerçek sürüş deneyimi.
              </h1>
              <p className="mt-5 text-xl font-black text-ats-text">
                {eventDate ? formatShortDate(eventDate) : "20 Eylül 2026"}
              </p>
              <p className="mt-5 max-w-xl text-base leading-7 text-ats-text/82 sm:text-lg sm:leading-8">
                Limitlerini güvenli, disiplinli ve doğru toplulukla keşfet.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={registerHref}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black uppercase tracking-[0.12em] text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
                >
                  Etkinliğe Kaydol
                </Link>
                <Link
                  href="#event-schedule"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-ats-blue hover:text-ats-blue focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
                >
                  Programı İncele
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="event-facts" className="border-y border-ats-border bg-ats-surface">
        <div className="mx-auto grid max-w-6xl gap-px px-6 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
          {facts.map((fact) => (
            <EventFactCard key={fact.label} fact={fact} />
          ))}
        </div>
      </section>

      <section id="event-concept" className="border-b border-ats-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Etkinlik konsepti
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-ats-text sm:text-5xl">
              Kalabalık değil, kontrollü pist zamanı.
            </h2>
            <p className="mt-6 text-base leading-8 text-ats-muted">
              Kula MyTrack günü; sınırlı katılım, net briefing, düzenli seans
              akışı ve güvenli sürüş kültürü üzerine kurulur. Amaç pistte daha
              çok otomobil göstermek değil, her sürücünün daha temiz ve daha
              bilinçli zaman geçirmesini sağlamaktır.
            </p>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-ats-border bg-ats-surface">
            <Image
              src={eventConceptImage.src}
              alt={eventConceptImage.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover ${eventConceptImage.className}`}
            />
          </div>
        </div>
      </section>

      <section id="event-experience" className="border-b border-ats-border bg-ats-black">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Deneyim
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              Pist günü sade, disiplinli ve okunabilir ilerler.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {eventExperienceItems.map((item) => (
              <article
                key={item.title}
                className="rounded-md border border-ats-border bg-ats-surface p-5"
              >
                <h3 className="text-base font-black text-ats-text">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ats-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="event-schedule" className="border-b border-ats-border bg-ats-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Program
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              Günün ritmi tek akışta netleşir.
            </h2>
            <p className="mt-5 text-sm leading-6 text-ats-muted">
              Saatler operasyon koşullarına göre gün içinde yönetilebilir; ana
              sıra briefing ve ekip yönlendirmeleriyle korunur.
            </p>
          </div>
          <ol className="space-y-0">
            {kulaEventScheduleItems.map((item) => (
              <li
                key={item.time}
                className="grid gap-4 border-t border-ats-border py-5 sm:grid-cols-[6rem_1fr]"
              >
                <p className="font-mono text-lg font-black tabular-nums text-ats-blue">
                  {item.time}
                </p>
                <div>
                  <h3 className="text-lg font-black text-ats-text">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ats-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="event-requirements" className="border-b border-ats-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Katılım koşulları
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              Güvenli sürüş kültürü kayıt anında başlar.
            </h2>
            <p className="mt-5 text-sm leading-6 text-ats-muted">
              Nihai operasyon detayları etkinlik öncesi duyurulur; aşağıdaki
              maddeler katılım için temel hazırlık çerçevesidir.
            </p>
          </div>
          <ul className="grid gap-3">
            {eventRequirements.map((item) => (
              <li
                key={item}
                className="rounded-md border border-ats-border bg-ats-surface px-5 py-4 text-sm font-semibold leading-6 text-ats-text"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="event-included" className="border-b border-ats-border bg-ats-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
                Dahil olanlar
              </p>
              <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
                {primaryPackage ? displayPackageName(primaryPackage.name) : "Pazar Pist Günü"}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-ats-muted">
              Fotoğraf, zaman ölçümü veya ek servisler yalnızca ayrıca
              duyurulursa etkinlik kapsamına girer.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {eventIncludedItems.map((item) => (
              <p
                key={item}
                className="rounded-md border border-ats-border bg-ats-black px-4 py-4 text-sm font-black leading-6 text-ats-text"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="event-gallery" className="border-b border-ats-border bg-ats-black">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Galeri
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              Fotoğraflar hikayeyi taşır; sayfayı kalabalıklaştırmaz.
            </h2>
            <p className="mt-5 text-sm leading-6 text-ats-muted">
              Seçki; hız, pist kenarı dinamizmi ve otomobil karakterini üç
              kontrollü kareyle anlatır.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-12">
            {eventGalleryImages.map((image) => (
              <div
                key={image.src}
                className={`relative overflow-hidden rounded-md border border-ats-border bg-ats-surface transition md:hover:border-ats-blue/60 md:hover:opacity-95 motion-reduce:transition-none ${image.aspectClassName} ${image.className}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={image.sizes}
                  className={`object-cover ${image.imageClassName}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="event-location" className="border-b border-ats-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Pist ve konum
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              {event.venue}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-ats-muted">
              Varış, paddock ve destek araçlarıyla ilgili güncel yönlendirme
              kayıt onayı sonrası paylaşılır. Harita bağlantısı rota planlaması
              için hızlı başlangıç sağlar.
            </p>
          </div>
          <div className="rounded-md border border-ats-border bg-ats-surface p-6">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-ats-muted">
              Konum
            </p>
            <p className="mt-3 text-2xl font-black text-ats-text">{event.venue}</p>
            <Link
              href="https://www.google.com/maps/search/?api=1&query=Kula%20MyTrack"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-ats-blue px-5 text-xs font-black uppercase tracking-[0.12em] text-ats-blue transition hover:bg-ats-blue hover:text-ats-black focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
            >
              Haritada Aç
            </Link>
          </div>
        </div>
      </section>

      <section id="event-faq" className="border-b border-ats-border bg-ats-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              SSS
            </p>
            <h2 className="mt-4 text-3xl font-black text-ats-text sm:text-4xl">
              Kayıt öncesi netleşmesi gerekenler.
            </h2>
          </div>
          <div className="divide-y divide-ats-border overflow-hidden rounded-md border border-ats-border bg-ats-black">
            {eventFaqItems.map((item) => (
              <details key={item.question} className="group">
                <summary className="cursor-pointer list-none px-5 py-5 text-base font-black text-ats-text outline-none transition hover:text-ats-blue focus:text-ats-blue focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ats-blue">
                  <span className="flex items-center justify-between gap-4">
                    {item.question}
                    <span className="text-xl text-ats-blue group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-6 text-ats-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="event-final-cta" className="bg-ats-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-10 lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue">
              Kayıt
            </p>
            <h2 className="mt-4 text-4xl font-black text-ats-text sm:text-5xl">
              20 Eylül’de pistte yerini al.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={registerHref}
              className="inline-flex h-12 items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black uppercase tracking-[0.12em] text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
            >
              Kaydı Başlat
            </Link>
            <a
              href="mailto:societyaegean@gmail.com"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ats-border px-6 text-sm font-black uppercase tracking-[0.12em] text-ats-text transition hover:border-ats-blue hover:text-ats-blue focus:outline-none focus:ring-2 focus:ring-ats-blue focus:ring-offset-2 focus:ring-offset-ats-black"
            >
              Sorular için iletişime geç
            </a>
          </div>
        </div>
      </section>

      <FooterCredit />
    </main>
  );
}

function eventFacts({
  eventDate,
  venue,
  packageName,
  capacity,
  price,
  currency,
}: {
  eventDate: Date | null;
  venue: string;
  packageName: string | null;
  capacity: number | null;
  price: { toNumber: () => number } | null;
  currency: string;
}): EventFact[] {
  return [
    {
      label: "Tarih",
      value: eventDate ? formatDate(eventDate) : "20 Eylül 2026",
      detail: "Pazar pist günü",
    },
    {
      label: "Pist",
      value: venue,
      detail: "Kula MyTrack",
    },
    {
      label: "Kontenjan",
      value: capacity && capacity > 0 ? `${capacity} araç` : "Kontenjan sınırlı",
      detail: packageName ? displayPackageName(packageName) : "Pazar Pist Günü",
    },
    {
      label: "Katılım bedeli",
      value: price ? formatPrice(price, currency) : "Fiyat için iletişime geçin",
      detail: "Manuel ödeme onayı",
    },
  ];
}

function EventFactCard({ fact }: { fact: EventFact }) {
  return (
    <article className="border border-ats-border bg-ats-black px-5 py-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ats-muted">
        {fact.label}
      </p>
      <p className="mt-3 text-xl font-black leading-tight text-ats-text">{fact.value}</p>
      <p className="mt-2 text-sm font-semibold text-ats-blue">{fact.detail}</p>
    </article>
  );
}
