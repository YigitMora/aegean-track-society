import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-ats-black text-ats-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="text-xs font-black uppercase tracking-[0.2em] text-ats-text transition hover:text-ats-blue"
        >
          Aegean Track Society
        </Link>
        <Link
          href="/events/kula-mytrack-2026/register"
          className="text-xs font-bold uppercase tracking-[0.16em] text-ats-muted transition hover:text-ats-blue"
        >
          Kula MyTrack
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-24">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-ats-blue">
            {eyebrow}
          </p>
          <h1 className="mt-5 text-5xl font-black leading-none text-ats-text sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 text-base leading-7 text-ats-muted sm:text-lg sm:leading-8">
            {subtitle}
          </p>
        </div>

        <div className="rounded-lg border border-ats-border bg-ats-surface p-6 shadow-soft sm:p-8">
          {children}
          {footer ? (
            <div className="mt-6 border-t border-ats-border pt-5 text-sm font-semibold text-ats-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function AuthMessage({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const className =
    tone === "error"
      ? "border-red-300/30 bg-red-500/10 text-red-100"
      : tone === "success"
        ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
        : "border-ats-blue/30 bg-ats-blue/10 text-ats-text";

  return (
    <p className={`mb-5 rounded-md border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </p>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ats-text">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-md border border-ats-border bg-ats-black px-3 text-sm font-semibold text-ats-text outline-none transition focus:border-ats-blue focus:ring-2 focus:ring-ats-blue/20"
      />
    </label>
  );
}

export function AuthSubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-ats-blue px-6 text-sm font-black text-ats-black transition hover:bg-ats-blue-hover focus:outline-none focus:ring-2 focus:ring-ats-blue/40"
    >
      {children}
    </button>
  );
}
