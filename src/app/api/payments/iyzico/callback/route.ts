import { NextResponse } from "next/server";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { finalizeCheckoutPayment } from "@/lib/payment-confirmation";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  return handleIyzicoCallback(request);
}

export async function GET(request: Request) {
  return handleIyzicoCallback(request);
}

async function handleIyzicoCallback(request: Request) {
  const token = await extractIyzicoToken(request);

  if (!token) {
    return redirectTo(request, "/payment/failure");
  }

  const payment = await findPaymentByToken(token);

  if (!payment) {
    return redirectTo(request, "/payment/failure");
  }

  if (
    payment.status === "SUCCESS" &&
    payment.registration.status === "CONFIRMED" &&
    payment.registration.paymentStatus === "PAID"
  ) {
    return redirectTo(request, `/payment/success?registrationId=${payment.registrationId}`);
  }

  let checkoutResult: Awaited<ReturnType<typeof retrieveCheckoutForm>>;

  try {
    checkoutResult = await retrieveCheckoutForm({
      token,
      conversationId: payment.conversationId,
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        rawCallbackResponse: {
          status: "failure",
          errorMessage: error instanceof Error ? error.message : "Unknown iyzico error",
        },
      },
    });

    return redirectTo(request, "/payment/failure");
  }

  try {
    const confirmation = await finalizeCheckoutPayment({
      paymentId: payment.id,
      checkoutResult,
      failUnverified: true,
    });

    if (
      (confirmation.status === "confirmed" ||
        confirmation.status === "already_confirmed") &&
      confirmation.registrationId
    ) {
      return redirectTo(
        request,
        `/payment/success?registrationId=${confirmation.registrationId}`,
      );
    }
  } catch (error) {
    console.error("PAYMENT_CONFIRMATION_TRANSACTION_FAILED", {
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
    return redirectTo(request, "/payment/failure");
  }

  return redirectTo(request, "/payment/failure");
}

async function findPaymentByToken(token: string) {
  return prisma.payment.findUnique({
    where: { iyzicoToken: token },
    include: {
      registration: true,
    },
  });
}

async function extractIyzicoToken(request: Request) {
  const urlToken = new URL(request.url).searchParams.get("token");

  if (urlToken) {
    return urlToken;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    return typeof body?.token === "string" ? body.token : null;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => null);
    const token = formData?.get("token");
    return typeof token === "string" ? token : null;
  }

  const text = await request.text().catch(() => "");
  return new URLSearchParams(text).get("token");
}

function redirectTo(request: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), { status: 303 });
}
