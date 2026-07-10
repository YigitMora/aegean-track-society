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
    console.warn("AUTH_CALLBACK_FAILED", {
      reason: "missing_code",
    });
    return redirectTo(request, "/auth/login?error=callback_failed");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.warn("AUTH_CALLBACK_FAILED", {
        errorName: error.name,
        errorMessage: safeAuthRouteMessage(error.message),
      });
      return redirectTo(request, "/auth/login?error=callback_failed");
    }

    const { data, error: userError } = await supabase.auth.getUser();

    if (!userError && data.user) {
      try {
        const memberUser = await ensureMemberUser(data.user);

        console.log("AUTH_CALLBACK_SUCCESS", {
          userId: memberUser.id,
        });
      } catch (provisioningError) {
        console.error("AUTH_USER_PROVISION_FAILED", serializeRouteError(provisioningError));

        if (nextPath !== "/auth/reset-password") {
          return redirectTo(request, "/auth/login?error=provisioning_failed");
        }
      }
    }

    return redirectTo(request, nextPath);
  } catch (error) {
    console.error("AUTH_CALLBACK_FAILED", serializeRouteError(error));

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
