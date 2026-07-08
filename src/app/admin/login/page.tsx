import { redirect } from "next/navigation";
import { getAdminSession, normalizeAdminReturnTo } from "@/lib/admin-auth";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error, returnTo: requestedReturnTo } = await searchParams;
  const returnTo = normalizeAdminReturnTo(requestedReturnTo);
  const session = await getAdminSession();

  if (session) {
    redirect(returnTo);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-asphalt px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/15 bg-white/10 p-6 shadow-soft sm:p-8">
        <p className="text-sm font-semibold uppercase text-signal">Aegean Track Days</p>
        <h1 className="mt-3 text-4xl font-black">Admin sign in</h1>
        <p className="mt-4 text-sm leading-6 text-white/70">
          Restricted operations area for Kula MyTrack registration management.
        </p>

        <form action="/admin/login/submit" method="post" className="mt-8 space-y-5">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="text-sm font-bold">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 h-12 w-full rounded-md border border-white/20 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 h-12 w-full rounded-md border border-white/20 bg-white px-3 text-sm font-semibold text-asphalt outline-none transition focus:border-signal"
            />
          </label>

          {error ? (
            <p className="rounded-md border border-kerb/30 bg-kerb/10 px-4 py-3 text-sm font-semibold text-white">
              Invalid admin credentials.
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-kerb px-6 text-sm font-black text-white transition hover:bg-white hover:text-asphalt"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
