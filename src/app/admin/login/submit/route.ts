import { NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  normalizeAdminReturnTo,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  let normalizedEmail = "";
  let returnTo = "/admin";

  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    normalizedEmail = normalizeAdminEmail(email);
    returnTo = normalizeAdminReturnTo(String(formData.get("returnTo") ?? ""));

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      logAdminLoginSubmitError(
        new Error("Admin email or password is not configured."),
        normalizedEmail,
      );

      return invalidCredentialsRedirect(request, returnTo);
    }

    if (!verifyAdminCredentials(email, password)) {
      return invalidCredentialsRedirect(request, returnTo);
    }

    await createAdminSessionCookie(normalizedEmail);

    return NextResponse.redirect(new URL(returnTo, request.url), {
      status: 303,
    });
  } catch (error) {
    logAdminLoginSubmitError(error, normalizedEmail);

    return invalidCredentialsRedirect(request, returnTo);
  }
}

function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

function invalidCredentialsRedirect(request: Request, returnTo: string) {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("error", "1");
  loginUrl.searchParams.set("returnTo", normalizeAdminReturnTo(returnTo));

  return NextResponse.redirect(loginUrl, {
    status: 303,
  });
}

function logAdminLoginSubmitError(error: unknown, normalizedEmail: string) {
  const errorObject = error instanceof Error ? error : new Error(String(error));

  console.error("ADMIN_LOGIN_SUBMIT_ERROR", {
    errorName: errorObject.name,
    errorMessage: errorObject.message,
    stackFirstThreeLines: errorObject.stack?.split("\n").slice(0, 3) ?? [],
    adminEmailExists: Boolean(process.env.ADMIN_EMAIL),
    adminPasswordExists: Boolean(process.env.ADMIN_PASSWORD),
    enteredEmailNormalized: normalizedEmail,
  });
}
