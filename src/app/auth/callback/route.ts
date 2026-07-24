import { NextResponse } from "next/server";
import { ensureMemberUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = normalizeMemberReturnTo(
    url.searchParams.get("next") ?? url.searchParams.get("returnTo"),
  );

  if (!code) {
    console.error("AUTH_CALLBACK_FAILED");
    return redirectTo(request, "/auth/login?error=callback_failed");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("AUTH_CALLBACK_FAILED");
      return redirectTo(request, "/auth/login?error=callback_failed");
    }

    const { data, error: userError } = await supabase.auth.getUser();

    if (!userError && data.user) {
      try {
        await ensureMemberUser(data.user);
      } catch {
        console.error("AUTH_USER_PROVISION_FAILED");

        if (nextPath !== "/auth/reset-password") {
          return redirectTo(request, "/auth/login?error=provisioning_failed");
        }
      }
    }

    return redirectTo(request, nextPath);
  } catch (error) {
    console.error("AUTH_CALLBACK_FAILED");

    if (error instanceof SupabaseConfigurationError) {
      return redirectTo(request, "/auth/login?error=config");
    }

    return redirectTo(request, "/auth/login?error=callback_failed");
  }
}

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}
