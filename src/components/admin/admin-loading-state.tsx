type AdminLoadingStateProps = {
  title: string;
  eyebrow: string;
  rows?: number;
};

export function AdminLoadingState({
  title,
  eyebrow,
  rows = 6,
}: AdminLoadingStateProps) {
  return (
    <main className="min-h-screen bg-asphalt text-white">
      <header className="border-b border-white/10 bg-asphalt/95">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="h-4 w-48 rounded-full bg-white/15" />
          <div className="mt-2 h-3 w-36 rounded-full bg-white/10" />
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase text-signal">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-white/10">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="grid gap-4 border-b border-white/10 p-5 last:border-0 md:grid-cols-4"
            >
              <div className="h-4 rounded-full bg-white/15" />
              <div className="h-4 rounded-full bg-white/10" />
              <div className="h-4 rounded-full bg-white/10" />
              <div className="h-4 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
