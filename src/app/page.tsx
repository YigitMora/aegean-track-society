import Link from "next/link";
import type { ReactNode } from "react";
import { FooterCredit } from "@/components/footer-credit";

const eventHref = "/events/kula-mytrack-2026";
const registerHref = "/events/kula-mytrack-2026/register";

const images = {
  hero: "/images/ats/FL5_Hero.jpg",
  community: "/images/ats/Community2.JPG",
  experience: "/images/ats/FL5_BACK.jpg",
  side: "/images/ats/FL5_SİDE_COOL.jpg",
  back: "/images/ats/FL5_BACK2.JPG",
  i20Front: "/images/ats/i20NCOOOL.JPG",
  i20Back: "/images/ats/İ20N_BACK.JPG",
  i20Girl: "/images/ats/İ20NGİRL.JPG",
  ioniq: "/images/ats/IONIQ5N.JPG",
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
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-[position:62%_center] bg-no-repeat sm:bg-[position:58%_center] lg:bg-[position:center_72%]"
          style={{
            backgroundImage: `url('${images.hero}')`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.94)_0%,rgba(8,11,15,0.78)_34%,rgba(8,11,15,0.28)_62%,rgba(8,11,15,0.08)_100%),linear-gradient(180deg,rgba(8,11,15,0.72)_0%,rgba(8,11,15,0.18)_34%,rgba(8,11,15,0.84)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,11,15,0.94)_0%,rgba(8,11,15,0.74)_34%,rgba(8,11,15,0.22)_62%,rgba(8,11,15,0.04)_100%),linear-gradient(180deg,rgba(8,11,15,0.66)_0%,rgba(8,11,15,0.12)_42%,rgba(8,11,15,0.78)_100%)] lg:bg-[linear-gradient(90deg,rgba(8,11,15,0.96)_0%,rgba(8,11,15,0.78)_30%,rgba(8,11,15,0.26)_58%,rgba(8,11,15,0.04)_100%),linear-gradient(180deg,rgba(8,11,15,0.64)_0%,rgba(8,11,15,0.10)_45%,rgba(8,11,15,0.76)_100%)]" />

        <div className="relative flex min-h-[100svh] w-full flex-col">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-6 sm:px-10 lg:px-12">
            <Link
              href="/"
              className="text-xs font-black uppercase tracking-[0.22em] text-ats-text/95"
            >
              Aegean Track Society
            </Link>
            <nav className="hidden items-center gap-7 text-[11px] font-bold uppercase tracking-[0.18em] text-ats-text/70 md:flex">
              {navItems.map(([label, href]) => (
                <Link key={href} href={href} className="transition hover:text-ats-blue">
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href={registerHref}
              className="inline-flex h-10 items-center justify-center rounded-full bg-ats-blue px-4 text-xs font-black uppercase tracking-[0.12em] text-ats-black shadow-[0_10px_30px_rgba(0,163,224,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-ats-blue-hover hover:shadow-[0_16px_42px_rgba(0,163,224,0.32)] active:translate-y-0"
            >
              Kayıt
            </Link>
          </header>

          <div className="hero-copy-enter mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-16 pt-20 sm:px-10 sm:pb-20 lg:px-12 lg:pb-24">
            <div className="max-w-[760px]">
              <div className="space-y-2 text-xs font-black uppercase tracking-[0.2em] text-ats-text/76 sm:text-sm">
                <p>KULA MYTRACK</p>
                <p>20 EYLÜL 2026 PAZAR</p>
              </div>
              <h1 className="mt-7 max-w-[1120px] text-[clamp(3.1rem,11vw,4rem)] font-black leading-[0.9] text-ats-text sm:text-[clamp(4.6rem,6.4vw,6.7rem)]">
                <span className="block sm:whitespace-nowrap">Pist Tutkusunu</span>
                <span className="block sm:whitespace-nowrap">Daha Profesyonel Yaşa.</span>
              </h1>
              <p className="mt-7 max-w-xl whitespace-pre-line text-xl font-semibold leading-8 text-ats-text/86 sm:text-2xl sm:leading-9">
                {"Gerçek sürücüler.\nGerçek otomobiller.\nGerçek pist deneyimi."}
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={registerHref}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-ats-blue px-8 text-sm font-black uppercase tracking-[0.12em] text-ats-black shadow-[0_16px_44px_rgba(0,163,224,0.26)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[0_24px_60px_rgba(0,163,224,0.36)] active:translate-y-0"
                >
                  Kayıt Ol
                </Link>
                <Link
                  href={eventHref}
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/28 bg-white/[0.03] px-8 text-sm font-black uppercase tracking-[0.12em] text-ats-text backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-ats-blue hover:text-ats-blue active:translate-y-0"
                >
                  Etkinliği İncele
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <StorySection className="pt-28 sm:pt-36 lg:pt-44">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="max-w-xl">
            <Kicker>Community</Kicker>
            <h2 className="mt-6 text-5xl font-black leading-none sm:text-7xl">
              Aynı Pist.
              <br />
              Aynı Tutku.
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-8 text-ats-muted">
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
            src={images.community}
            position="center center"
            className="min-h-[58vh] lg:min-h-[72vh]"
          />
        </div>
      </StorySection>

      <StorySection>
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <PhotoFrame
            src={images.experience}
            position="center 64%"
            className="min-h-[72vh] lg:min-h-[90vh]"
          />
          <div className="max-w-xl lg:pl-8">
            <Kicker>Driving Experience</Kicker>
            <h2 className="mt-6 text-5xl font-black leading-none sm:text-7xl">
              Her Tur,
              <br />
              Bir Sonrakini Çağırır.
            </h2>
            <p className="mt-8 text-lg leading-8 text-ats-muted">
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
          <div className="mt-6 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="text-5xl font-black leading-none sm:text-7xl">
              Etkinlik
              <br />
              Günü Akışı.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-ats-muted">
              Program, sürücü hazırlığından gün sonu çıkışına kadar net ve
              profesyonel bir ritimle ilerler.
            </p>
          </div>

          <div className="relative mt-16">
            <div className="absolute bottom-0 left-[0.65rem] top-0 w-px bg-ats-blue md:left-1/2" />
            <div className="space-y-12">
              {scheduleItems.map(([time, title, body], index) => (
                <div
                  key={time}
                  className="relative grid gap-4 pl-10 md:grid-cols-2 md:gap-16 md:pl-0"
                >
                  <span className="absolute left-0 top-2 h-5 w-5 rounded-full border-4 border-ats-black bg-ats-blue md:left-1/2 md:-translate-x-1/2" />
                  <div className={index % 2 === 0 ? "md:text-right" : "md:col-start-2"}>
                    <p className="text-4xl font-black text-ats-blue sm:text-5xl">{time}</p>
                  </div>
                  <div className={index % 2 === 0 ? "md:col-start-2 md:row-start-1" : ""}>
                    <h3 className="text-2xl font-black text-ats-text">{title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-ats-muted">{body}</p>
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
          <h2 className="mt-6 max-w-4xl text-5xl font-black leading-none sm:text-7xl">
            Pistten Kalan Görüntü Değil,
            <br />
            Duygu.
          </h2>
        </div>

        <div className="mx-auto mt-16 grid max-w-7xl gap-5 px-6 sm:px-10 md:grid-cols-12 lg:px-12">
          <PhotoFrame
            src={images.side}
            position="center 42%"
            className="min-h-[72vh] md:col-span-7 md:row-span-2"
          />
          <PhotoFrame
            src={images.back}
            position="center center"
            className="min-h-[42vh] md:col-span-5"
          />
          <PhotoFrame
            src={images.i20Front}
            position="center center"
            className="min-h-[48vh] md:col-span-5"
          />
          <PhotoFrame
            src={images.i20Back}
            position="center center"
            className="min-h-[45vh] md:col-span-4"
          />
          <PhotoFrame
            src={images.i20Girl}
            position="center center"
            className="min-h-[60vh] md:col-span-4"
          />
          <PhotoFrame
            src={images.ioniq}
            position="center center"
            className="min-h-[45vh] md:col-span-4"
          />
        </div>
      </StorySection>

      <StorySection id="sss">
        <div className="mx-auto max-w-5xl">
          <Kicker>FAQ</Kicker>
          <h2 className="mt-6 text-5xl font-black leading-none sm:text-7xl">
            Bilmen Gerekenler.
          </h2>
          <div className="mt-12 divide-y divide-ats-border">
            {faqItems.map(([question, answer]) => (
              <article key={question} className="grid gap-4 py-8 md:grid-cols-[0.8fr_1.2fr]">
                <h3 className="text-xl font-black text-ats-text">{question}</h3>
                <p className="text-base leading-7 text-ats-muted">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </StorySection>

      <section className="bg-ats-black px-6 py-28 text-center sm:px-10 sm:py-36 lg:px-12 lg:py-44">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-ats-blue">
            20 Eylül 2026
          </p>
          <h2 className="mt-6 text-5xl font-black leading-none sm:text-7xl lg:text-8xl">
            Kula MyTrack
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-2xl font-semibold leading-9 text-ats-text/84">
            Hazırsan seni pistte görmek istiyoruz.
          </p>
          <Link
            href={registerHref}
            className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-ats-blue px-9 text-sm font-black uppercase tracking-[0.12em] text-ats-black shadow-[0_18px_48px_rgba(0,163,224,0.26)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[0_26px_64px_rgba(0,163,224,0.36)] active:translate-y-0"
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
    <section id={id} className={`px-6 py-24 sm:px-10 sm:py-32 lg:px-12 lg:py-40 ${className}`}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.22em] text-ats-blue sm:text-sm">
      {children}
    </p>
  );
}

function PhotoFrame({
  src,
  position,
  className,
}: {
  src: string;
  position: string;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-ats-surface ${className}`}>
      <PhotoLayer src={src} position={position} />
    </div>
  );
}

function PhotoLayer({
  src,
  position,
}: {
  src: string;
  position: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-cover bg-no-repeat"
      style={{
        backgroundImage: `url('${src}')`,
        backgroundPosition: position,
      }}
    />
  );
}
