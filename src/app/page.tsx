import Link from "next/link";
import { FooterCredit } from "@/components/footer-credit";
import { atsImages } from "@/lib/ats-images";

const eventHref = "/events/kula-mytrack-2026";
const registerHref = "/events/kula-mytrack-2026/register";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <section
        className="relative isolate flex min-h-[100svh] overflow-hidden bg-ats-black"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-[position:62%_center] sm:bg-[position:58%_center] lg:bg-[position:center_72%]"
          style={{
            backgroundImage: "url('/images/ats/FL5_Hero.jpg')",
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
              {[
                ["Etkinlik", eventHref],
                ["Program", `${eventHref}#program`],
                ["Galeri", `${eventHref}#galeri`],
                ["SSS", `${eventHref}#sss`],
              ].map(([label, href]) => (
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

      <section id="etkinlik" className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
          Etkinlik
        </p>
        <div>
          <h2 className="text-3xl font-black text-ats-text sm:text-5xl">
            Kula MyTrack Track Day
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ats-muted">
            Tek günlük format, net operasyon akışı ve kontrollü pist seansları.
            Kayıt talebiniz alındıktan sonra ekibimiz ödeme ve onay sürecini
            manuel olarak tamamlar.
          </p>
        </div>
      </section>

      <section id="program" className="border-y border-ats-border bg-ats-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
                Program
              </p>
              <h2 className="mt-3 text-3xl font-black text-ats-text">
                Pazar günü akışı
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-ats-muted">
              Saatler operasyon planına göre netleşir; akış güvenlik briefingi
              ve seans disiplinine göre yönetilir.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["08:30", "Kayıt ve hazırlık"],
              ["09:30", "Sürücü briefingi"],
              ["10:00", "Pist seansları"],
              ["17:30", "Gün sonu"],
            ].map(([time, label]) => (
              <div key={time} className="rounded-lg border border-ats-border bg-ats-black p-5">
                <p className="text-2xl font-black text-ats-blue">{time}</p>
                <p className="mt-3 text-sm font-bold text-ats-text">{label}</p>
              </div>
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
            Fotoğraf odaklı deneyim alanları
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Pist", atsImages.gallery01],
            ["Paddock", atsImages.community],
            ["Detay", atsImages.experienceRear],
          ].map(([label, src]) => (
            <div
              key={label}
              data-image-src={src}
              className="aspect-[4/5] rounded-lg border border-ats-border bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(0,163,224,0.08),rgba(8,11,15,0.94))] p-5"
            >
              <p className="text-sm font-black uppercase tracking-[0.16em] text-ats-text">
                {label}
              </p>
            </div>
          ))}
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
                "Online ödeme aktif mi?",
                "Hayır. Bu lansman modunda kayıt talebi alınır; ödeme ve onay ekibimiz tarafından manuel tamamlanır.",
              ],
              [
                "QR kod ne zaman gelir?",
                "Ödeme onaylandıktan sonra katılımcı kodu ve QR doğrulaması e-posta ile gönderilir.",
              ],
              [
                "Etkinlik hangi gün?",
                "Kula MyTrack Track Day, 20 Eylül 2026 Pazar günü tek günlük formatta planlanmıştır.",
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
