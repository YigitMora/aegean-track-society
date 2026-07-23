import { mobileJsonResponse } from "@/lib/mobile-auth";
import type { StockRatingLeaderboardEntry } from "@/lib/stock-rating-leaderboard";

export const mobileStockLeaderboardContractHeader =
  "X-ATS-Stock-Leaderboard-Contract";
export const mobileStockLeaderboardContractVersion = "leaderboard-v1";

export function buildMobileStockLeaderboardResponseBody(
  entries: readonly StockRatingLeaderboardEntry[],
) {
  return {
    data: {
      entries: entries.map((entry) => ({
        rank: entry.rank,
        code: entry.code,
        brand: entry.brand,
        model: entry.model,
        subtitle: entry.subtitle,
        overall: entry.overall,
        status: entry.status,
        tierLabel: entry.tierLabel,
      })),
    },
  };
}

export function mobileStockLeaderboardJsonResponse(
  body: ReturnType<typeof buildMobileStockLeaderboardResponseBody>,
) {
  return mobileJsonResponse(body, {
    headers: {
      [mobileStockLeaderboardContractHeader]:
        mobileStockLeaderboardContractVersion,
    },
  });
}

export function mobileStockLeaderboardErrorResponse() {
  return mobileJsonResponse(
    {
      error: {
        code: "MOBILE_STOCK_LEADERBOARD_UNAVAILABLE",
        message: "Stock ATS Rating listesi şu anda alınamıyor.",
      },
    },
    {
      status: 503,
      headers: {
        [mobileStockLeaderboardContractHeader]:
          mobileStockLeaderboardContractVersion,
      },
    },
  );
}
