import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureMemberUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set([
  "signup",
  "email",
  "email_change",
  "magiclink",
  "invite",
  "recovery",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = parseOtpType(url.searchParams.get("type"));
  const returnTo = normalizeMemberReturnTo(url.searchParams.get("returnTo"));

  if (!tokenHash || !type) {
    console.error("AUTH_CONFIRM_FAILED");
    return redirectTo(request, "/auth/login?error=confirm_failed");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error || !data.user) {
      console.error("AUTH_CONFIRM_FAILED");
      return redirectTo(request, "/auth/login?error=confirm_failed");
    }

    if (type === "recovery") {
      return redirectTo(request, "/auth/reset-password");
    }

    await ensureMemberUser(data.user);

    return redirectTo(request, returnTo);
  } catch (error) {
    console.error("AUTH_CONFIRM_FAILED");

    if (error instanceof SupabaseConfigurationError) {
      return redirectTo(request, "/auth/login?error=config");
    }

    return redirectTo(request, "/auth/login?error=confirm_failed");
  }
}

function parseOtpType(value: string | null): EmailOtpType | null {
  if (!value || !allowedOtpTypes.has(value)) {
    return null;
  }

  return value as EmailOtpType;
}

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), {
    status: 303,
  });
}
