import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ensureMemberUser } from "@/lib/member-auth";
import {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthErrorEnvelope,
  MobileAuthError,
} from "@/lib/mobile-auth-contract";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthErrorEnvelope,
  MobileAuthError,
};

export type MobileMemberUser = Awaited<ReturnType<typeof ensureMemberUser>>;

export type AuthenticatedMobileMember = {
  supabaseUser: SupabaseUser;
  memberUser: MobileMemberUser;
};

export async function authenticateMobileMember(request: Request): Promise<AuthenticatedMobileMember> {
  const accessToken = getBearerTokenFromAuthorizationHeader(
    request.headers.get("authorization"),
  );

  if (isAccessTokenExpired(accessToken)) {
    throw new MobileAuthError("MOBILE_AUTH_EXPIRED_TOKEN");
  }

  const config = getSupabasePublicConfig();

  if (!config) {
    throw new MobileAuthError("MOBILE_AUTH_CONFIGURATION_ERROR");
  }

  const supabase = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new MobileAuthError(
      isAccessTokenExpired(accessToken)
        ? "MOBILE_AUTH_EXPIRED_TOKEN"
        : "MOBILE_AUTH_INVALID_TOKEN",
    );
  }

  const memberUser = await resolveMobileMemberUser(data.user);

  if (memberUser.deletedAt) {
    throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_UNAVAILABLE");
  }

  if (memberUser.status === "SUSPENDED") {
    throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_SUSPENDED");
  }

  if (memberUser.status !== "ACTIVE") {
    throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_UNAVAILABLE");
  }

  return {
    supabaseUser: data.user,
    memberUser,
  };
}

export function mobileJsonResponse<TBody>(body: TBody, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function mobileAuthErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    return mobileJsonResponse(mobileAuthErrorEnvelope(error), {
      status: error.status,
    });
  }

  console.error("MOBILE_AUTH_UNHANDLED_ERROR", serializeMobileAuthError(error));

  const fallback = new MobileAuthError("MOBILE_AUTH_INTERNAL_ERROR");

  return mobileJsonResponse(mobileAuthErrorEnvelope(fallback), {
    status: fallback.status,
  });
}

async function resolveMobileMemberUser(supabaseUser: SupabaseUser) {
  try {
    return await ensureMemberUser(supabaseUser);
  } catch (error) {
    const code = getMemberAuthErrorCode(error);

    if (code === "EMAIL_NOT_VERIFIED") {
      throw new MobileAuthError("MOBILE_AUTH_EMAIL_UNVERIFIED");
    }

    if (code === "INVALID_USER_ID" || code === "UNAUTHENTICATED") {
      throw new MobileAuthError("MOBILE_AUTH_INVALID_TOKEN");
    }

    if (code === "PROVISIONING_FAILED") {
      throw new MobileAuthError("MOBILE_AUTH_PROVISIONING_FAILED");
    }

    throw error;
  }
}

function getMemberAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

function serializeMobileAuthError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: sanitizeLogText(error.message),
      stackFirstThreeLines: error.stack?.split("\n").slice(0, 3).map(sanitizeLogText) ?? [],
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: sanitizeLogText(String(error)),
    stackFirstThreeLines: [],
  };
}

function sanitizeLogText(value: string) {
  return value
    .replace(/(authorization:?\s*bearer\s+)([^\s]+)/gi, "$1***")
    .replace(/(access_token=)([^&\s]+)/gi, "$1***")
    .replace(/(refresh_token=)([^&\s]+)/gi, "$1***")
    .replace(/(token_hash=)([^&\s]+)/gi, "$1***")
    .replace(/(password=)([^&\s]+)/gi, "$1***")
    .replace(/(cookie:?\s*)(.+)/gi, "$1***");
}
