import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public-nav";

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
    src: "/images/ats/FL5_SIDE_COOL.jpg",
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
    src: "/images/ats/i20N_BACK.JPG",
    alt: "Hyundai i20 N arka açı pist fotoğrafı",
  },
  i20Girl: {
    src: "/images/ats/i20NGIRL.JPG",
    alt: "Paddock atmosferinde Hyundai i20 N",
  },
  ioniq: {
    src: "/images/ats/IONIQ5N.JPG",
    alt: "Hyundai IONIQ 5 N pist günü fotoğrafı",
  },
};

const scheduleItems = [
  ["08:30", "Kayıt & Karşılama"],
  ["09:30", "Sürücü Briefingi"],
  ["10:00", "Pist Seansları"],
  ["17:30", "Gün Sonu"],
];

// Hero copy options reviewed:
// 1. "Limitleri pistte keşfet.\nDisiplini koru.\nDeneyimi birlikte yaşa."
// 2. "Pistte netlik bul.\nKontrolü hisset.\nTopluluğun ritmine katıl."
// 3. "Performansı ölç.\nÇizgini geliştir.\nPist kültürünü birlikte yaşa."
const heroSubtitle = "Limitleri pistte keşfet.\nDisiplini koru.\nDeneyimi birlikte yaşa.";

const whyItems = [
  {
    title: "Kontrollü pist zamanı",
    body: "Seans akışı, sürüşe odaklanmak ve ritmi korumak için sade tutulur.",
  },
  {
    title: "Operasyon disiplini",
    body: "Kayıt, briefing ve check-in süreçleri pist günü temposuna göre planlanır.",
  },
  {
    title: "Doğru topluluk",
    body: "Aynı tutkuyu paylaşan sürücüler güvenli ve saygılı bir atmosferde buluşur.",
  },
  {
    title: "Sınırlı kontenjan",
    body: "Yoğun kalabalık yerine daha net, daha kontrollü ve daha odaklı bir deneyim.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section className="relative isolate flex min-h-[100svh] overflow-hidden bg-ats-black">
        <HeroImage src={images.hero.src} alt={images.hero.alt} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.93)_0%,rgba(8,11,15,0.68)_38%,rgba(8,11,15,0.18)_70%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.54)_0%,rgba(8,11,15,0.08)_44%,rgba(8,11,15,0.82)_100%)] lg:bg-[linear-gradient(90deg,rgba(8,11,15,0.94)_0%,rgba(8,11,15,0.62)_31%,rgba(8,11,15,0.14)_61%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.50)_0%,rgba(8,11,15,0.06)_47%,rgba(8,11,15,0.76)_100%)]" />

        <div className="relative flex min-h-[100svh] w-full flex-col">
          <PublicNav homeAnchors />

          <div className="mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-16 pt-24 sm:px-10 sm:pb-24 lg:px-12 lg:pb-28">
            <div className="max-w-4xl">
              <div className="space-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-ats-text/72 sm:text-xs">
                <p>KULA MYTRACK</p>
                <p>20 EYLÜL 2026</p>
              </div>
              <h1 className="ats-hero-headline mt-8 max-w-5xl text-6xl font-semibold leading-[0.88] text-ats-text sm:text-7xl lg:text-8xl">
                <span className="block sm:whitespace-nowrap">Pist Tutkusunu</span>
                <span className="block sm:whitespace-nowrap">Daha Profesyonel Yaşa.</span>
              </h1>
              <p className="ats-hero-subtitle mt-8 max-w-xl whitespace-pre-line text-lg font-medium leading-8 text-ats-text/82 sm:text-xl sm:leading-9">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <StorySection>
        <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div className="max-w-lg">
            <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
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
                Aynı tutkuyu paylaşan sürücüleri güvenli, profesyonel ve
                unutulmaz pist deneyimlerinde buluşturuyoruz.
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

      <section className="ats-section-reveal relative isolate min-h-[100svh] overflow-hidden bg-ats-black">
        <Image
          src={images.experience.src}
          alt={images.experience.alt}
          fill
          sizes="100vw"
          className="object-cover object-[center_64%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.90)_0%,rgba(8,11,15,0.56)_40%,rgba(8,11,15,0.08)_100%),linear-gradient(180deg,rgba(8,11,15,0.08)_0%,rgba(8,11,15,0.74)_100%)]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-7xl items-end px-6 py-24 sm:px-10 sm:py-32 lg:px-12 lg:py-40">
          <h2 className="max-w-4xl text-6xl font-semibold leading-[0.92] text-ats-text sm:text-7xl lg:text-8xl">
            Her Tur
            <br />
            Bir Sonrakini Çağırır.
          </h2>
        </div>
      </section>

      <StorySection id="program">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Program.
          </h2>
          <div className="relative mx-auto mt-16 max-w-2xl sm:mt-20">
            <div className="ats-timeline-line absolute bottom-3 left-3 top-3 w-px bg-gradient-to-b from-[#4CC9F0]/20 via-[#4CC9F0] to-[#4CC9F0]/20" />
            <div className="space-y-9 sm:space-y-10">
              {scheduleItems.map(([time, title]) => (
                <div
                  key={time}
                  className="relative grid grid-cols-[4.75rem_1fr] gap-5 pl-10 sm:grid-cols-[6rem_1fr] sm:gap-8"
                >
                  <span className="absolute left-[0.45rem] top-2 h-3 w-3 rounded-full bg-[#4CC9F0] shadow-[0_0_0_6px_rgba(183,240,255,0.14)]" />
                  <p className="text-lg font-semibold tabular-nums leading-7 text-[#4CC9F0] sm:text-xl">
                    {time}
                  </p>
                  <h3 className="text-lg font-semibold leading-7 text-ats-text sm:text-xl">
                    {title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StorySection>

      <StorySection id="galeri" className="px-0 sm:px-0 lg:px-0">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Pistten Kareler.
          </h2>
        </div>

        <div className="mx-auto mt-20 grid max-w-7xl gap-5 px-6 sm:px-10 md:grid-cols-12 md:auto-rows-[230px] lg:auto-rows-[280px] lg:px-12">
          <PhotoFrame
            image={images.side}
            position="center 42%"
            sizes="(min-width: 768px) 58vw, 100vw"
            className="ats-gallery-image aspect-[4/5] md:col-span-7 md:row-span-2 md:aspect-auto"
          />
          <PhotoFrame
            image={images.back}
            position="center center"
            sizes="(min-width: 768px) 42vw, 100vw"
            className="ats-gallery-image aspect-[3/2] md:col-span-5 md:aspect-auto"
          />
          <PhotoFrame
            image={images.i20Front}
            position="center center"
            sizes="(min-width: 768px) 42vw, 100vw"
            className="ats-gallery-image aspect-[3/2] md:col-span-5 md:aspect-auto"
          />
          <PhotoFrame
            image={images.i20Back}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="ats-gallery-image aspect-[4/3] md:col-span-4 md:aspect-auto"
          />
          <PhotoFrame
            image={images.i20Girl}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="ats-gallery-image aspect-[4/5] md:col-span-4 md:aspect-auto"
          />
          <PhotoFrame
            image={images.ioniq}
            position="center center"
            sizes="(min-width: 768px) 33vw, 100vw"
            className="ats-gallery-image aspect-[4/3] md:col-span-4 md:aspect-auto"
          />
        </div>
      </StorySection>

      <StorySection>
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4CC9F0]">
              Society standard
            </p>
            <h2 className="mt-5 text-5xl font-semibold leading-[0.98] sm:text-7xl">
              Neden Aegean Track Society?
            </h2>
          </div>
          <div className="border-y border-ats-border/80">
            {whyItems.map((item, index) => (
              <div
                key={item.title}
                className="grid gap-5 border-b border-ats-border/80 py-7 last:border-b-0 sm:grid-cols-[3rem_1fr]"
              >
                <p className="text-sm font-semibold tabular-nums text-ats-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3 className="text-xl font-semibold text-ats-text">{item.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-ats-muted">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </StorySection>

      <section className="ats-section-reveal bg-ats-black px-6 py-28 text-center sm:px-10 sm:py-32 lg:px-12 lg:py-40">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#4CC9F0]">
            <p>20 EYLÜL 2026</p>
            <p>KULA MYTRACK</p>
          </div>
          <h2 className="mx-auto mt-10 max-w-4xl text-5xl font-semibold leading-[0.98] sm:text-7xl lg:text-8xl">
            Hazırsan
            <br />
            Seni pistte görmek istiyoruz.
          </h2>
          <Link
            href={registerHref}
            className="ats-button-primary mt-12 inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-[#4CC9F0] px-9 text-xs font-bold uppercase tracking-[0.14em] text-ats-black"
          >
            Kayıt Ol
          </Link>
        </div>
      </section>

      <ManifestoFooter />
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
    <section
      id={id}
      className={`ats-section-reveal px-6 py-28 sm:px-10 sm:py-36 lg:px-12 lg:py-48 ${className}`}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
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

function HeroImage({ src, alt }: { src: string; alt: string }) {
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

function ManifestoFooter() {
  return (
    <footer className="ats-footer-reveal border-t border-ats-border/70 bg-ats-black px-6 py-10 sm:px-10 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 text-sm text-ats-muted md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-ats-text">
            Aegean Track Society
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <a
              href="https://www.instagram.com/aegeantracksociety"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#4CC9F0]"
            >
              Instagram: @aegeantracksociety
            </a>
            <a
              href="mailto:societyaegean@gmail.com"
              className="transition hover:text-[#4CC9F0]"
            >
              Email: societyaegean@gmail.com
            </a>
          </div>
        </div>
        <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-ats-muted md:text-right">
          <p>
            Proudly developed by <span className="text-ats-text">MORA Engineering</span>
          </p>
          <p>© 2026 Aegean Track Society</p>
        </div>
      </div>
    </footer>
  );
}
