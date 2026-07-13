import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  expireAdminSessionCookieOnResponse,
  getAdminSession,
} from "@/lib/admin-auth";
import { createOptionalSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await safeGetAdminSession();
  const response = NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
  });

  expireAdminSessionCookieOnResponse(response);
  await safeClearAdminSessionCookie();

  if (session?.authSource === "MEMBER_SESSION") {
    await safeSignOutSupabaseMemberSession(response);
    expireAdminSessionCookieOnResponse(response);
  }

  return response;
}

async function safeGetAdminSession() {
  try {
    return await getAdminSession();
  } catch {
    return null;
  }
}

async function safeClearAdminSessionCookie() {
  try {
    await clearAdminSessionCookie();
  } catch {
    // Logout must remain idempotent even when request cookies are unavailable.
  }
}

async function safeSignOutSupabaseMemberSession(response: NextResponse) {
  try {
    const supabase = await createOptionalSupabaseRouteHandlerClient(response);
    await supabase?.auth.signOut();
  } catch {
    // Never block admin-cookie logout on a Supabase logout failure.
  }
}
