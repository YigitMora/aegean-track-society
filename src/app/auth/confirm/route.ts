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
    console.warn("AUTH_CONFIRM_FAILED", {
      reason: "missing_token_or_type",
    });
    return redirectTo(request, "/auth/login?error=confirm_failed");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error || !data.user) {
      console.warn("AUTH_CONFIRM_FAILED", {
        errorName: error?.name ?? "AuthError",
        errorMessage: safeAuthRouteMessage(error?.message ?? "Email confirmation failed."),
      });
      return redirectTo(request, "/auth/login?error=confirm_failed");
    }

    if (type === "recovery") {
      return redirectTo(request, "/auth/reset-password");
    }

    const memberUser = await ensureMemberUser(data.user);

    console.log("AUTH_CONFIRM_SUCCESS", {
      userId: memberUser.id,
    });

    return redirectTo(request, returnTo);
  } catch (error) {
    console.error("AUTH_CONFIRM_FAILED", serializeRouteError(error));

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

function serializeRouteError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: safeAuthRouteMessage(error.message),
      stackFirstThreeLines: error.stack?.split("\n").slice(0, 3).map(safeAuthRouteMessage) ?? [],
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: safeAuthRouteMessage(String(error)),
    stackFirstThreeLines: [],
  };
}

function safeAuthRouteMessage(message: string) {
  return message
    .replace(/(access_token=)([^&\s]+)/gi, "$1***")
    .replace(/(refresh_token=)([^&\s]+)/gi, "$1***")
    .replace(/(token_hash=)([^&\s]+)/gi, "$1***")
    .replace(/(password=)([^&\s]+)/gi, "$1***")
    .replace(/(cookie:?\s*)(.+)/gi, "$1***");
}
