import { NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  normalizeAdminReturnTo,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = normalizeAdminReturnTo(String(formData.get("returnTo") ?? ""));

  if (!verifyAdminCredentials(email, password)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("returnTo", returnTo);

    return NextResponse.redirect(loginUrl, {
      status: 303,
    });
  }

  await createAdminSessionCookie(email.trim().toLowerCase());

  return NextResponse.redirect(new URL(returnTo, request.url), {
    status: 303,
  });
}
