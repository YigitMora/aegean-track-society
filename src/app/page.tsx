import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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

const scheduleItems = [
  ["08:30", "Kayıt & Karşılama"],
  ["09:30", "Sürücü Briefingi"],
  ["10:00", "Pist Seansları"],
  ["17:30", "Gün Sonu"],
];

const whyItems = [
  "Kontrollü seanslar",
  "Profesyonel organizasyon",
  "Gerçek pist deneyimi",
  "Güvenlik önceliği",
  "Topluluk ruhu",
  "Sınırlı kontenjan",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section className="relative isolate flex min-h-[100svh] overflow-hidden bg-ats-black">
        <HeroImage src={images.hero.src} alt={images.hero.alt} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,15,0.93)_0%,rgba(8,11,15,0.68)_38%,rgba(8,11,15,0.18)_70%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.54)_0%,rgba(8,11,15,0.08)_44%,rgba(8,11,15,0.82)_100%)] lg:bg-[linear-gradient(90deg,rgba(8,11,15,0.94)_0%,rgba(8,11,15,0.62)_31%,rgba(8,11,15,0.14)_61%,rgba(8,11,15,0.02)_100%),linear-gradient(180deg,rgba(8,11,15,0.50)_0%,rgba(8,11,15,0.06)_47%,rgba(8,11,15,0.76)_100%)]" />

        <div className="relative flex min-h-[100svh] w-full flex-col">
          <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-10 lg:px-12">
            <Link
              href="/"
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ats-text/80 transition hover:text-ats-text"
            >
              Aegean Track Society
            </Link>
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
                <p>20 EYLÜL 2026</p>
              </div>
              <h1 className="mt-8 max-w-5xl text-6xl font-semibold leading-[0.88] text-ats-text sm:text-7xl lg:text-8xl">
                <span className="block sm:whitespace-nowrap">Pist Tutkusunu</span>
                <span className="block sm:whitespace-nowrap">Daha Profesyonel Yaşa.</span>
              </h1>
              <p className="mt-8 max-w-xl whitespace-pre-line text-lg font-medium leading-8 text-ats-text/82 sm:text-xl sm:leading-9">
                {"Gerçek sürücüler.\nGerçek otomobiller.\nGerçek pist deneyimi."}
              </p>
              <Link
                href={registerHref}
                className="mt-11 inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-ats-blue px-8 text-xs font-bold uppercase tracking-[0.14em] text-ats-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_44px_rgba(0,163,224,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_26px_58px_rgba(0,163,224,0.32)] active:translate-y-0"
              >
                Kayıt Ol
              </Link>
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

      <section className="relative isolate min-h-[100svh] overflow-hidden bg-ats-black">
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
        <div className="mx-auto max-w-4xl">
          <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Program.
          </h2>
          <div className="relative mt-20">
            <div className="absolute bottom-0 left-[0.375rem] top-0 w-px bg-gradient-to-b from-ats-blue/15 via-ats-blue to-ats-blue/15 md:left-1/2" />
            <div className="space-y-16">
              {scheduleItems.map(([time, title], index) => (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StorySection>

      <StorySection id="anilar" className="px-0 sm:px-0 lg:px-0">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
          <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Anılar.
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

      <StorySection>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-5xl font-semibold leading-[0.98] sm:text-7xl">
            Neden ATS?
          </h2>
          <div className="mt-16 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {whyItems.map((item) => (
              <div key={item} className="border-t border-ats-border/80 pt-5">
                <p className="text-lg font-medium text-ats-text/88">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </StorySection>

      <section className="bg-ats-black px-6 py-32 text-center sm:px-10 sm:py-40 lg:px-12 lg:py-52">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-3 text-xs font-semibold uppercase tracking-[0.24em] text-ats-blue">
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
            className="mt-12 inline-flex h-14 min-w-40 items-center justify-center rounded-full bg-ats-blue px-9 text-xs font-bold uppercase tracking-[0.14em] text-ats-black shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_44px_rgba(0,163,224,0.22)] transition duration-300 hover:-translate-y-1 hover:bg-ats-blue-hover hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_26px_58px_rgba(0,163,224,0.32)] active:translate-y-0"
          >
            Kayıt Ol
          </Link>
        </div>
      </section>
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
