import {
  buildMobileStockLeaderboardResponseBody,
  mobileStockLeaderboardErrorResponse,
  mobileStockLeaderboardJsonResponse,
} from "@/lib/mobile-stock-leaderboard-contract";
import { getStockRatingLeaderboard } from "@/lib/rating-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getStockRatingLeaderboard(50);
    return mobileStockLeaderboardJsonResponse(
      buildMobileStockLeaderboardResponseBody(entries),
    );
  } catch {
    return mobileStockLeaderboardErrorResponse();
  }
}
