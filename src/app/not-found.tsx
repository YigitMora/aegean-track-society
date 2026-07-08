import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paddock px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase text-kerb">
          Not found
        </p>
        <h1 className="mt-3 text-4xl font-black text-asphalt">This page is not on the grid.</h1>
        <p className="mt-4 text-sm leading-6 text-steel">
          The event page may not exist yet, or the URL may have changed.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-asphalt px-5 py-3 text-sm font-bold text-white"
        >
          Back to Aegean Track Days
        </Link>
      </div>
    </main>
  );
}
