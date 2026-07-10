"use server";

import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/registration-validation";
import { ensureMemberUser, normalizeMemberReturnTo } from "@/lib/member-auth";
import { buildPublicAuthUrl, SupabaseConfigurationError } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const minPasswordLength = 8;

export async function signUpAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const returnTo = normalizeMemberReturnTo(formData.get("returnTo"));

  if (!isValidEmail(email) || !isValidPasswordPair(password, passwordConfirmation)) {
    redirect(authPath("/auth/sign-up", { error: "invalid", returnTo }));
  }

  console.log("AUTH_SIGNUP_ATTEMPT", {
    emailDomain: emailDomainOf(email),
  });

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildPublicAuthUrl("/auth/confirm", { returnTo }),
      },
    });

    if (error) {
      console.warn("AUTH_SIGNUP_FAILED", {
        errorName: error.name,
        errorMessage: safeAuthErrorMessage(error.message),
      });
      redirect(authPath("/auth/sign-up", { error: "signup_failed", returnTo }));
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("AUTH_SIGNUP_FAILED", serializeActionError(error));
    redirect(authPath("/auth/sign-up", { error: errorCodeForAction(error), returnTo }));
  }

  redirect(authPath("/auth/check-email", { returnTo }));
}

export async function loginAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const returnTo = normalizeMemberReturnTo(formData.get("returnTo"));

  if (!isValidEmail(email) || !password) {
    redirect(authPath("/auth/login", { error: "invalid", returnTo }));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.warn("AUTH_LOGIN_FAILED", {
        errorName: error?.name ?? "AuthError",
        errorMessage: safeAuthErrorMessage(error?.message ?? "Login failed."),
      });
      redirect(authPath("/auth/login", { error: "invalid", returnTo }));
    }

    const memberUser = await ensureMemberUser(data.user);

    if (memberUser.status !== "ACTIVE" || memberUser.deletedAt) {
      redirect("/auth/login?error=account_unavailable");
    }

    console.log("AUTH_LOGIN_SUCCESS", {
      userId: memberUser.id,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("AUTH_LOGIN_FAILED", serializeActionError(error));
    redirect(authPath("/auth/login", { error: errorCodeForAction(error), returnTo }));
  }

  redirect(returnTo);
}

export async function logoutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) {
      console.error("AUTH_LOGOUT_FAILED", serializeActionError(error));
    }
  }

  redirect("/");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!isValidEmail(email)) {
    redirect("/auth/forgot-password?sent=1");
  }

  console.log("AUTH_PASSWORD_RESET_REQUESTED", {
    emailDomain: emailDomainOf(email),
  });

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildPublicAuthUrl("/auth/callback", {
        next: "/auth/reset-password",
      }),
    });

    if (error) {
      console.warn("AUTH_PASSWORD_RESET_REQUESTED", {
        status: "provider_error",
        errorName: error.name,
        errorMessage: safeAuthErrorMessage(error.message),
      });
    }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      redirect("/auth/forgot-password?error=config");
    }

    console.error("AUTH_PASSWORD_RESET_REQUESTED", serializeActionError(error));
  }

  redirect("/auth/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

  if (!isValidPasswordPair(password, passwordConfirmation)) {
    redirect("/auth/reset-password?error=invalid");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.warn("AUTH_PASSWORD_RESET_FAILED", {
        errorName: error.name,
        errorMessage: safeAuthErrorMessage(error.message),
      });
      redirect("/auth/reset-password?error=failed");
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("AUTH_PASSWORD_RESET_FAILED", serializeActionError(error));
    redirect(`/auth/reset-password?error=${errorCodeForAction(error)}`);
  }

  redirect("/auth/login?reset=success");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPasswordPair(password: string, passwordConfirmation: string) {
  return (
    password.length >= minPasswordLength &&
    password === passwordConfirmation
  );
}

function authPath(pathname: string, params: Record<string, string | null | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function errorCodeForAction(error: unknown) {
  return error instanceof SupabaseConfigurationError ? "config" : "failed";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function emailDomainOf(email: string) {
  return email.split("@")[1] ?? "unknown";
}

function serializeActionError(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: safeAuthErrorMessage(error.message),
      stackFirstThreeLines: error.stack?.split("\n").slice(0, 3).map(safeAuthErrorMessage) ?? [],
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: safeAuthErrorMessage(String(error)),
    stackFirstThreeLines: [],
  };
}

function safeAuthErrorMessage(message: string) {
  return message
    .replace(/(access_token=)([^&\s]+)/gi, "$1***")
    .replace(/(refresh_token=)([^&\s]+)/gi, "$1***")
    .replace(/(token_hash=)([^&\s]+)/gi, "$1***")
    .replace(/(password=)([^&\s]+)/gi, "$1***")
    .replace(/(cookie:?\s*)(.+)/gi, "$1***");
}
