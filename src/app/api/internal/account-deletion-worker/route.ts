import { timingSafeEqual } from "node:crypto";

import { runAccountDeletionWorker } from "@/lib/account-deletion-service";
import { mobileJsonResponse } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !safeEqual(expected, supplied)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const result = await runAccountDeletionWorker();
  return mobileJsonResponse({ data: { processed: result.processed } });
}

function safeEqual(expected: string, supplied: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}
