import { Prisma } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { normalizeEmail } from "@/lib/registration-validation";
import { prisma } from "@/lib/prisma";
import { createOptionalSupabaseServerClient, createSupabaseServerClient } from "@/lib/supabase/server";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxReturnToLength = 2048;

const memberUserInclude = Prisma.validator<Prisma.UserInclude>()({
  profile: true,
});

export type AtsMemberUser = Prisma.UserGetPayload<{
  include: typeof memberUserInclude;
}>;

class MemberAuthError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "MemberAuthError";
  }
}

export async function getOptionalAuthenticatedMemberIdentity() {
  const supabase = await createOptionalSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: normalizeEmail(data.user.email),
  };
}

export async function getVerifiedSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function ensureMemberUser(supabaseUser?: SupabaseUser | null) {
  const user = supabaseUser ?? (await getVerifiedSupabaseUser());

  if (!user) {
    throw new MemberAuthError("UNAUTHENTICATED", "No authenticated Supabase user.");
  }

  if (!uuidRegex.test(user.id)) {
    throw new MemberAuthError("INVALID_USER_ID", "Supabase user id is not a valid UUID.");
  }

  if (!user.email || !isEmailVerified(user)) {
    throw new MemberAuthError("EMAIL_NOT_VERIFIED", "Supabase user email is not verified.");
  }

  const email = normalizeEmail(user.email);

  try {
    await prisma.user.upsert({
      where: {
        id: user.id,
      },
      update: {
        email,
      },
      create: {
        id: user.id,
        email,
      },
    });

    await prisma.memberProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {},
      create: {
        userId: user.id,
      },
    });

    const memberUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: memberUserInclude,
    });

    if (!memberUser) {
      throw new MemberAuthError("PROVISIONING_FAILED", "ATS member user was not found.");
    }

    console.log("AUTH_USER_PROVISIONED", {
      userId: user.id,
    });

    return memberUser;
  } catch (error) {
    if (error instanceof MemberAuthError) {
      throw error;
    }

    console.error("AUTH_USER_PROVISION_FAILED", serializeAuthError(error));
    throw new MemberAuthError("PROVISIONING_FAILED", "ATS member provisioning failed.");
  }
}

export const requireMemberUser = cache(async (returnTo = "/account") => {
  const supabaseUser = await getVerifiedSupabaseUser();

  if (!supabaseUser) {
    redirect(
      `/auth/login?returnTo=${encodeURIComponent(normalizeMemberReturnTo(returnTo))}`,
    );
  }

  const memberUser = await ensureMemberUser(supabaseUser);

  if (memberUser.status !== "ACTIVE" || memberUser.deletedAt) {
    redirect("/auth/login?error=account_unavailable");
  }

  return memberUser;
});

export function normalizeMemberReturnTo(value: FormDataEntryValue | string | null | undefined) {
  const returnTo = typeof value === "string" ? value.trim() : "";

  if (
    !returnTo ||
    returnTo.length > maxReturnToLength ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    hasUnsafeScheme(returnTo)
  ) {
    return "/account";
  }

  if (isAllowedMemberReturnPath(returnTo)) {
    return returnTo;
  }

  return "/account";
}

function isAllowedMemberReturnPath(returnTo: string) {
  return (
    returnTo === "/" ||
    returnTo === "/account" ||
    returnTo.startsWith("/account/") ||
    returnTo === "/auth/reset-password" ||
    returnTo.startsWith("/events/") && returnTo.endsWith("/register")
  );
}

function hasUnsafeScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function isEmailVerified(user: SupabaseUser) {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function serializeAuthError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      errorName: error.name,
      prismaErrorCode: error.code,
      errorMessage: sanitizeLogText(error.message),
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      prismaErrorCode: null,
      errorMessage: sanitizeLogText(error.message),
      stackFirstThreeLines: sanitizeStack(error.stack),
    };
  }

  return {
    errorName: "UnknownError",
    prismaErrorCode: null,
    errorMessage: sanitizeLogText(String(error)),
    stackFirstThreeLines: [],
  };
}

function sanitizeStack(stack?: string) {
  return stack?.split("\n").slice(0, 3).map(sanitizeLogText) ?? [];
}

function sanitizeLogText(value: string) {
  return value
    .replace(/(access_token=)([^&\s]+)/gi, "$1***")
    .replace(/(refresh_token=)([^&\s]+)/gi, "$1***")
    .replace(/(token_hash=)([^&\s]+)/gi, "$1***")
    .replace(/(password=)([^&\s]+)/gi, "$1***")
    .replace(/(cookie:?\s*)(.+)/gi, "$1***");
}
