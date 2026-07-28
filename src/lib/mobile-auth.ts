import {
  createClient,
  isAuthError,
  isAuthRetryableFetchError,
  type User as SupabaseUser,
} from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { AtsMemberUser } from "@/lib/member-auth";
import {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthContractHeader,
  mobileAuthContractVersion,
  mobileAuthErrorEnvelope,
  MobileAuthError,
} from "@/lib/mobile-auth-contract";
import {
  getSupabasePublicConfig,
  type SupabasePublicConfig,
} from "@/lib/supabase/config";

export {
  getBearerTokenFromAuthorizationHeader,
  isAccessTokenExpired,
  mobileAuthErrorEnvelope,
  MobileAuthError,
};

export type MobileMemberUser = AtsMemberUser;

export type AuthenticatedMobileMember = {
  memberUser: MobileMemberUser;
  accessToken: string;
};

export type AuthenticatedMobileIdentity = {
  id: string;
  email: string;
};

type SupabaseUserLookupResult = {
  data: {
    user: SupabaseUser | null;
  };
  error: unknown;
};

export type MobileAuthDependencies = {
  getSupabaseConfig: () => SupabasePublicConfig | null;
  getSupabaseUser: (
    config: SupabasePublicConfig,
    accessToken: string,
  ) => Promise<SupabaseUserLookupResult>;
  resolveMemberUser: (supabaseUser: SupabaseUser) => Promise<MobileMemberUser>;
};

export async function authenticateMobileMember(
  request: Request,
  dependencyOverrides: Partial<MobileAuthDependencies> = {},
): Promise<AuthenticatedMobileMember> {
  const dependencies: MobileAuthDependencies = {
    getSupabaseConfig: getSupabasePublicConfig,
    getSupabaseUser,
    resolveMemberUser: resolveMobileMemberUser,
    ...dependencyOverrides,
  };
  const accessToken = getBearerTokenFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  const config = dependencies.getSupabaseConfig();

  if (!config) {
    throw new MobileAuthError("MOBILE_AUTH_CONFIGURATION_ERROR");
  }

  let lookup: SupabaseUserLookupResult;

  try {
    lookup = await dependencies.getSupabaseUser(config, accessToken);
  } catch {
    throw new MobileAuthError("MOBILE_AUTH_BACKEND_UNAVAILABLE");
  }

  const { data, error } = lookup;

  if (error || !data.user) {
    if (error && isSupabaseInfrastructureFailure(error)) {
      throw new MobileAuthError("MOBILE_AUTH_BACKEND_UNAVAILABLE");
    }

    throw new MobileAuthError(
      isAccessTokenExpired(accessToken)
        ? "MOBILE_AUTH_EXPIRED_TOKEN"
        : "MOBILE_AUTH_INVALID_TOKEN",
    );
  }

  if (!data.user.email || !isSupabaseEmailVerified(data.user)) {
    throw new MobileAuthError("MOBILE_AUTH_EMAIL_UNVERIFIED");
  }

  const memberUser = await dependencies.resolveMemberUser(data.user);

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
    memberUser,
    accessToken,
  };
}

// Account deletion cannot provision a member record: it must also be able to
// resume a deletion after the relational account data has been removed.
export async function authenticateMobileIdentity(request: Request): Promise<AuthenticatedMobileIdentity> {
  const accessToken = getBearerTokenFromAuthorizationHeader(request.headers.get("authorization"));
  const config = getSupabasePublicConfig();
  if (!config) throw new MobileAuthError("MOBILE_AUTH_CONFIGURATION_ERROR");

  let lookup: SupabaseUserLookupResult;
  try {
    lookup = await getSupabaseUser(config, accessToken);
  } catch {
    throw new MobileAuthError("MOBILE_AUTH_BACKEND_UNAVAILABLE");
  }

  if (lookup.error || !lookup.data.user) {
    if (lookup.error && isSupabaseInfrastructureFailure(lookup.error)) {
      throw new MobileAuthError("MOBILE_AUTH_BACKEND_UNAVAILABLE");
    }
    throw new MobileAuthError(isAccessTokenExpired(accessToken) ? "MOBILE_AUTH_EXPIRED_TOKEN" : "MOBILE_AUTH_INVALID_TOKEN");
  }

  if (!lookup.data.user.email || !isSupabaseEmailVerified(lookup.data.user)) {
    throw new MobileAuthError("MOBILE_AUTH_EMAIL_UNVERIFIED");
  }

  return { id: lookup.data.user.id, email: lookup.data.user.email.trim().toLowerCase() };
}

export function mobileJsonResponse<TBody>(body: TBody, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function mobileAuthJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(mobileAuthContractHeader, mobileAuthContractVersion);

  return mobileJsonResponse(body, {
    ...init,
    headers,
  });
}

export function mobileAuthErrorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const headers = error.status === 401
      ? {
          "WWW-Authenticate": "Bearer",
        }
      : undefined;

    return mobileAuthJsonResponse(mobileAuthErrorEnvelope(error), {
      status: error.status,
      headers,
    });
  }

  console.error("MOBILE_AUTH_UNHANDLED_ERROR");

  const fallback = new MobileAuthError("MOBILE_AUTH_INTERNAL_ERROR");

  return mobileAuthJsonResponse(mobileAuthErrorEnvelope(fallback), {
    status: fallback.status,
  });
}

async function resolveMobileMemberUser(supabaseUser: SupabaseUser) {
  try {
    const { ensureMemberUser } = await import("@/lib/member-auth");

    return await ensureMemberUser(supabaseUser, {
      rejectUnavailableBeforeMutation: true,
      suppressProvisioningLogs: true,
    });
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

    if (code === "ACCOUNT_SUSPENDED") {
      throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_SUSPENDED");
    }

    if (code === "ACCOUNT_UNAVAILABLE") {
      throw new MobileAuthError("MOBILE_AUTH_ACCOUNT_UNAVAILABLE");
    }

    throw error;
  }
}

async function getSupabaseUser(
  config: SupabasePublicConfig,
  accessToken: string,
): Promise<SupabaseUserLookupResult> {
  const supabase = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return supabase.auth.getUser(accessToken);
}

function isSupabaseInfrastructureFailure(error: unknown) {
  if (isAuthRetryableFetchError(error)) {
    return true;
  }

  if (!isAuthError(error)) {
    return true;
  }

  return (
    !error.status ||
    error.status === 429 ||
    error.status >= 500
  );
}

function isSupabaseEmailVerified(user: SupabaseUser) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function getMemberAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}
