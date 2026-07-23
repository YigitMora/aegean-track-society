import { mobileJsonResponse } from "@/lib/mobile-auth";
import type { RatingDiscoveryDemo } from "@/lib/rating-discovery";

export const mobileRatingDiscoveryContractHeader =
  "X-ATS-Rating-Discovery-Contract";
export const mobileRatingDiscoveryContractVersion = "rating-discovery-v1";

export function buildMobileRatingDiscoveryResponseBody(
  demo: RatingDiscoveryDemo | null,
) {
  return {
    data: {
      demo: demo
        ? {
            vehicleLabel: demo.vehicleLabel,
            vehicleSubtitle: demo.vehicleSubtitle,
            presentationLabel: demo.presentationLabel,
            sourceLabel: demo.sourceLabel,
            stockRating: demo.stockRating,
            buildRating: demo.buildRating,
            overallDelta: demo.overallDelta,
            formattedOverallDelta: demo.formattedOverallDelta,
            deltaRows: demo.deltaRows.map((row) => ({
              label: row.label,
              key: row.key,
              stock: row.stock,
              build: row.build,
              delta: row.delta,
              formattedDelta: row.formattedDelta,
            })),
            parts: demo.parts.map((part) => ({
              label: part.label,
              categoryLabel: part.categoryLabel,
              fitmentLabel: part.fitmentLabel,
            })),
          }
        : null,
    },
  };
}

export function mobileRatingDiscoveryJsonResponse(
  body: ReturnType<typeof buildMobileRatingDiscoveryResponseBody>,
) {
  return mobileJsonResponse(body, {
    headers: {
      [mobileRatingDiscoveryContractHeader]:
        mobileRatingDiscoveryContractVersion,
    },
  });
}

export function mobileRatingDiscoveryErrorResponse() {
  return mobileJsonResponse(
    {
      error: {
        code: "MOBILE_RATING_DISCOVERY_UNAVAILABLE",
        message: "ATS Rating örneği şu anda alınamıyor.",
      },
    },
    {
      status: 503,
      headers: {
        [mobileRatingDiscoveryContractHeader]:
          mobileRatingDiscoveryContractVersion,
      },
    },
  );
}
