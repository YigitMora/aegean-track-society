import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { FooterCredit } from "@/components/footer-credit";

const eventHref = "/events/kula-mytrack-2026";
const registerHref = "/events/kula-mytrack-2026/register";

const images = {
  hero: {
    src: "/images/ats/FL5_Hero.jpg",
    alt: "Kula MyTrack pistinde kırmızı Honda Civic Type R",
  },
  community: {
    src: "/images/ats/Community2.JPG",
    alt: "Kula MyTrack pist çıkışında birlikte ilerleyen sürücüler",
  },
  experience: {
    src: "/images/ats/FL5_BACK.jpg",
    alt: "Viraj çıkışında kırmızı Honda Civic Type R",
  },
  side: {
    src: "/images/ats/FL5_SİDE_COOL.jpg",
    alt: "Pistte Honda Civic Type R yan profili",
  },
  back: {
    src: "/images/ats/FL5_BACK2.JPG",
    alt: "Honda Civic Type R arka açı pist fotoğrafı",
  },
  i20Front: {
    src: "/images/ats/i20NCOOOL.JPG",
    alt: "Hyundai i20 N pist günü fotoğrafı",
  },
  i20Back: {
    src: "/images/ats/İ20N_BACK.JPG",
    alt: "Hyundai i20 N arka açı pist fotoğrafı",
  },
  i20Girl: {
    src: "/images/ats/İ20NGİRL.JPG",
    alt: "Paddock atmosferinde Hyundai i20 N",
  },
  ioniq: {
    src: "/images/ats/IONIQ5N.JPG",
    alt: "Hyundai IONIQ 5 N pist günü fotoğrafı",
  },
};

const navItems = [
  ["Program", "#program"],
  ["Galeri", "#galeri"],
  ["SSS", "#sss"],
  ["Etkinlik", eventHref],
];

const scheduleItems = [
  ["08:30", "Kayıt ve hazırlık", "Katılımcı karşılama, araç bilgileri ve gün başlangıcı."],
  ["09:30", "Sürücü briefingi", "Pist kuralları, bayraklar ve seans disiplini."],
  ["10:00", "Pist seansları", "Kontrollü çıkışlar ve odaklı sürüş grupları."],
  ["17:30", "Gün sonu", "Check-out, paddock kapanışı ve ayrılış."],
];

const faqItems = [
  [
    "Online ödeme aktif mi?",
    "Hayır. Kayıt talebi alındıktan sonra ödeme ve kesin onay ekibimiz tarafından manuel tamamlanır.",
  ],
  [
    "QR kod ne zaman gelir?",
    "Ödeme onaylandıktan sonra katılımcı kodu ve QR doğrulaması e-posta ile gönderilir.",
  ],
  [
    "Etkinlik hangi gün?",
    "Kula MyTrack Track Day, 20 Eylül 2026 Pazar günü tek günlük formatta gerçekleşir.",
  ],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section className="relative isolate flex min-h-[100svh] overflow-hidden bg-ats-black">
        <HeroImage
          src={images.hero.src}
          alt={images.hero.alt}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.92)_0%,rgba(8,11,15,0.68)_36%,rgba(8,11,15,0.22)_68%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.58)_0%,rgba(8,11,15,0.10)_42%,rgba(8,11,15,0.82)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,11,15,0.92)_0%,rgba(8,11,15,0.64)_34%,rgba(8,11,15,0.18)_66%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.56)_0%,rgba(8,11,15,0.08)_44%,rgba(8,11,15,0.78)_100%)] lg:bg-[linear-gradient(90deg,rgba(8,11,15,0.94)_0%,rgba(8,11,15,0.66)_31%,rgba(8,11,15,0.18)_60%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.54)_0%,rgba(8,11,15,0.06)_46%,rgba(8,11,15,0.74)_100%)]" />

        <div className="relative flex min-h-[100svh] w-full flex-col">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-7 sm:px-10 lg:px-12">
            <Link
              href="/"
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ats-text/82 transition hover:text-ats-text"
            >
              Aegean Track Society
            </Link>
            <nav className="hidden items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-ats-text/54 md:flex">
              {navItems.map(([label, href]) => (
                <Link key={href} href={href} className="transition hover:text-ats-blue">
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href={registerHref}
              className="inline-flex h-10 min-w-24 items-center justify-center rounded-full bg-ats-blue px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-ats-black shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_34px_rgba(0,163,224,0.20)] transition duration-300 hover:-translate-y-0.5 hover:bg-ats-blue-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_18px_42px_rgba(0,163,224,0.30)] active:translate-y-0"
            >
              Kayıt
            </Link>
          </header>

          <div className="hero-copy-enter mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-16 pt-24 sm:px-10 sm:pb-24 lg:px-12 lg:pb-28">
            <div className="max-w-4xl">
              <div className="space-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ats-text/72 sm:text-xs">
                <p>KULA MYTRACK</p>
                <p>20 EYLÜL 2026 PAZAR</p>
              </div>
              <h1 className="mt-8 max-w-5xl text-6xl font-semibold leading-[0.88] text-ats-text sm:text-7xl lg:text-8xl">
                <span className="block sm:whitespace-nowrap">Pist Tutkusunu</span>
                <span className="block sm:whitespace-nowrap">Daha Profesyonel Yaşa.</span>
              </h1>
              <p className="mt-8 max-w-xl whitespace-pre-line text-lg font-medium leading-8 text-ats-text/82 sm:text-xl sm:leading-9">
                {"Gerçek sürücüler.\nGerçek otomobiller.\nGerçek pist deneyimi."}
              </p>
              <div className="mt-11 flex flex-wrap gap-4">
                <Link
                  href={registerHref}
                  className="inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-ats-blue px-8 text-xs font-bold uppercase tracking-[0.14em] text-ats-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_44px_rgba(0,163,224,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_26px_58px_rgba(0,163,224,0.32)] active:translate-y-0"
                >
                  Kayıt Ol
                </Link>
                <Link
                  href={eventHref}
                  className="inline-flex h-14 min-w-48 items-center justify-center rounded-full border border-white/22 bg-white/[0.02] px-8 text-xs font-bold uppercase tracking-[0.14em] text-ats-text/88 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-ats-blue/70 hover:text-ats-blue active:translate-y-0"
                >
                  Etkinliği İncele
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StorySection className="pt-32 sm:pt-40 lg:pt-52">
        <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div className="max-w-lg">
            <Kicker>Community</Kicker>
            <h2 className="mt-7 text-5xl font-semibold leading-[0.98] sm:text-7xl">
              Aynı Pist.
              <br />
              Aynı Tutku.
            </h2>
            <div className="mt-9 space-y-6 text-base leading-8 text-ats-muted sm:text-lg">
              <p>
                Aegean Track Society, pist sürüşünü yalnızca performans değil,
                paylaşılan deneyim olarak görür.
              </p>
              <p>
                Her etkinlik, aynı tutkuyu paylaşan sürücüleri güvenli ve
                profesyonel bir atmosferde bir araya getirir.
              </p>
            </div>
          </div>
          <PhotoFrame
            image={images.community}
            position="center center"
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="aspect-[16/10] lg:aspect-auto lg:min-h-[76vh]"
          />
        </div>
      </StorySection>

      <StorySection>
        <div className="grid gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <PhotoFrame
            image={images.experience}
            position="center 64%"
            sizes="(min-width: 1024px) 56vw, 100vw"
            className="aspect-[4/5] lg:min-h-[92vh]"
          />
          <div className="max-w-lg lg:pl-10">
            <Kicker>Driving Experience</Kicker>
            <h2 className="mt-7 text-5xl font-semibold leading-[0.98] sm:text-7xl">
              Her Tur,
              <br />
              Bir Sonrakini Çağırır.
            </h2>
            <p className="mt-9 text-base leading-8 text-ats-muted sm:text-lg">
              Kula MyTrack, ritim bulmak, otomobili tanımak ve her çıkışta daha
              temiz bir çizgi yakalamak için hazırlanmış teknik bir pist günü
              atmosferi sunar.
            </p>
          </div>
        </div>
      </StorySection>

      <StorySection id="program">
        <div className="mx-auto max-w-5xl">
          <Kicker>Event Schedule</Kicker>
          <div className="mt-7 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
              Etkinlik
              <br />
              Günü Akışı.
            </h2>
            <p className="max-w-lg text-base leading-8 text-ats-muted sm:text-lg">
              Program, sürücü hazırlığından gün sonu çıkışına kadar net ve
              profesyonel bir ritimle ilerler.
            </p>
          </div>

          <div className="relative mt-20">
            <div className="absolute bottom-0 left-[0.375rem] top-0 w-px bg-gradient-to-b from-ats-blue/15 via-ats-blue to-ats-blue/15 md:left-1/2" />
            <div className="space-y-14">
              {scheduleItems.map(([time, title, body], index) => (
                <div
                  key={time}
                  className="relative grid gap-4 pl-9 md:grid-cols-2 md:gap-20 md:pl-0"
                >
                  <span className="absolute left-0 top-3 h-3 w-3 rounded-full bg-ats-blue shadow-[0_0_0_6px_rgba(0,163,224,0.08)] md:left-1/2 md:-translate-x-1/2" />
                  <div className={index % 2 === 0 ? "md:text-right" : "md:col-start-2"}>
                    <p className="text-4xl font-semibold text-ats-blue sm:text-5xl">{time}</p>
                  </div>
                  <div className={index % 2 === 0 ? "md:col-start-2 md:row-start-1" : ""}>
                    <h3 className="text-2xl font-semibold text-ats-text">{title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-ats-muted">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StorySection>

      <StorySection id="galeri" className="px-0 sm:px-0 lg:px-0">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <Kicker>Gallery</Kicker>
          <h2 className="mt-7 max-w-4xl text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Pistten Kalan Görüntü Değil,
            <br />
            Duygu.
          </h2>
        </div>

        <div className="mx-auto mt-20 grid max-w-7xl gap-6 px-6 sm:px-10 md:grid-cols-12 lg:px-12">
          <PhotoFrame
            image={images.side}
            position="center 42%"
            sizes="(min-width: 768px) 58vw, 100vw"
            className="aspect-[4/5] md:col-span-7 md:row-span-2 md:min-h-[76vh]"
          />
          <PhotoFrame
            image={images.back}
            position="center center"
            sizes="(min-width: 768px) 42vw, 100vw"
            className="aspect-[3/2] md:col-span-5"
          />
          <PhotoFrame
            image={images.i20Front}
            position="center center"
            sizes="(min-width: 768px) 42vw, 100vw"
            className="aspect-[3/2] md:col-span-5"
          />
          <PhotoFrame
            image={images.i20Back}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="aspect-[4/3] md:col-span-4"
          />
          <PhotoFrame
            image={images.i20Girl}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="aspect-[4/5] md:col-span-4"
          />
          <PhotoFrame
            image={images.ioniq}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="aspect-[4/3] md:col-span-4"
          />
        </div>
      </StorySection>

      <StorySection id="sss">
        <div className="mx-auto max-w-5xl">
          <Kicker>FAQ</Kicker>
          <h2 className="mt-7 text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Bilmen Gerekenler.
          </h2>
          <div className="mt-14 divide-y divide-ats-border/70">
            {faqItems.map(([question, answer]) => (
              <article key={question} className="grid gap-5 py-9 md:grid-cols-[0.8fr_1.2fr]">
                <h3 className="text-xl font-semibold text-ats-text">{question}</h3>
                <p className="text-base leading-7 text-ats-muted">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </StorySection>

      <section className="bg-ats-black px-6 py-32 text-center sm:px-10 sm:py-40 lg:px-12 lg:py-52">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ats-blue">
            20 Eylül 2026
          </p>
          <h2 className="mt-7 text-5xl font-semibold leading-[0.96] sm:text-7xl lg:text-8xl">
            Kula MyTrack
          </h2>
          <p className="mx-auto mt-9 max-w-2xl text-xl font-medium leading-9 text-ats-text/80 sm:text-2xl">
            Hazırsan seni pistte görmek istiyoruz.
          </p>
          <Link
            href={registerHref}
            className="mt-11 inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-ats-blue px-9 text-xs font-bold uppercase tracking-[0.14em] text-ats-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_44px_rgba(0,163,224,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_26px_58px_rgba(0,163,224,0.32)] active:translate-y-0"
          >
            Kayıt Ol
          </Link>
        </div>
      </section>

      <FooterCredit />
    </main>
  );
}

function StorySection({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`px-6 py-28 sm:px-10 sm:py-36 lg:px-12 lg:py-48 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ats-blue sm:text-xs">
      {children}
    </p>
  );
}

function PhotoFrame({
  image,
  position,
  sizes,
  className,
}: {
  image: {
    src: string;
    alt: string;
  };
  position: string;
  sizes: string;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-ats-surface ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        className="object-cover"
        style={{ objectPosition: position }}
      />
    </div>
  );
}

function HeroImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      sizes="100vw"
      className="object-cover object-[62%_center] sm:object-[58%_center] lg:object-[center_72%]"
    />
  );
}
