type AccountLoadingStateProps = {
  eyebrow: string;
  title: string;
  cards?: number;
};

export function AccountLoadingState({
  eyebrow,
  title,
  cards = 3,
}: AccountLoadingStateProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
          {eyebrow}
        </p>
        <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
          {title}
        </h1>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft"
          >
            <div className="h-3 w-24 rounded-full bg-ats-border" />
            <div className="mt-5 h-7 w-3/4 rounded-full bg-ats-border/80" />
            <div className="mt-4 space-y-3">
              <div className="h-3 rounded-full bg-ats-border/60" />
              <div className="h-3 w-2/3 rounded-full bg-ats-border/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
