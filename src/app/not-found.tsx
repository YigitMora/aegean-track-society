import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ats-black px-6 text-ats-text">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ats-blue">
          Sayfa bulunamadı
        </p>
        <h1 className="mt-3 text-4xl font-black text-ats-text">
          Bu sayfa pistte değil.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ats-muted">
          Etkinlik sayfası henüz hazır olmayabilir veya bağlantı değişmiş olabilir.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-ats-blue px-5 py-3 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover"
        >
          Aegean Track Society ana sayfası
        </Link>
      </div>
    </main>
  );
}
