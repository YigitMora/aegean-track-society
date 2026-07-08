import Link from "next/link";
import { FooterCredit } from "@/components/footer-credit";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paddock">
      <section className="relative isolate overflow-hidden bg-asphalt text-white">
        <div className="absolute inset-0 opacity-25">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_18px,rgba(255,255,255,0.18)_18px,rgba(255,255,255,0.18)_20px)]" />
          <div className="absolute bottom-0 left-0 h-3 w-full bg-kerb" />
          <div className="absolute bottom-3 left-0 h-2 w-full bg-signal" />
        </div>

        <div className="relative mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-between px-6 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold uppercase">
              Aegean Track Days
            </Link>
            <Link
              href="/events/kula-mytrack-2026/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-asphalt transition hover:bg-signal"
            >
              Register Now
            </Link>
          </header>

          <div className="max-w-3xl pb-16 pt-24">
            <p className="mb-5 text-sm font-semibold uppercase text-signal">
              Kula MyTrack · Sunday, 20 September 2026
            </p>
            <h1 className="text-5xl font-black leading-[0.95] sm:text-7xl">
              Track days built for focused driving.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/80">
              Aegean Track Days brings organized, safety-led motorsport
              experiences to drivers who want clean sessions, clear operations,
              and a proper paddock rhythm.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/events/kula-mytrack-2026/register"
                className="rounded-full bg-kerb px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-asphalt"
              >
                Register Now
              </Link>
              <Link
                href="/events/kula-mytrack-2026"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-white hover:text-white"
              >
                Event detail
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-12 sm:grid-cols-3 sm:px-8 lg:px-10">
        {[
          ["Structured sessions", "Clear Sunday package and participant flow."],
          ["Manual confirmation", "Online payment is not currently active."],
          ["On-site check-in", "QR-enabled check-in for smooth arrivals."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-black/10 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-bold text-asphalt">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-steel">{body}</p>
          </div>
        ))}
      </section>
      <FooterCredit />
    </main>
  );
}
