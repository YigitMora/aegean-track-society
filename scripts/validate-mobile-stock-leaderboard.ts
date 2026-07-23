import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildStockRatingLeaderboard,
  type StockRatingLeaderboardCandidate,
} from "../src/lib/stock-rating-leaderboard";
import {
  buildMobileRatingDiscoveryResponseBody,
  mobileRatingDiscoveryContractHeader,
  mobileRatingDiscoveryContractVersion,
  mobileRatingDiscoveryJsonResponse,
} from "../src/lib/mobile-rating-discovery-contract";

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateLimitAndStableOrdering();
  validateResponseContract();
  validateRouteGuards();
  await validateRatingDiscoveryContract();
  console.log("validate-mobile-stock-leaderboard passed");
}

async function validateRatingDiscoveryContract() {
  const rating = {
    overall: 82,
    power: 84,
    handling: 81,
    braking: 80,
    reliability: 78,
    thermal: 79,
    trackReadiness: 83,
    status: "CALIBRATED" as const,
  };
  const body = buildMobileRatingDiscoveryResponseBody({
    vehicleLabel: "Ford Focus RS Mk3",
    vehicleSubtitle: "2.3 EcoBoost",
    presentationLabel: "Track Build",
    sourceLabel: "Örnek ATS Build",
    stockRating: { ...rating, overall: 76 },
    buildRating: rating,
    overallDelta: 6,
    formattedOverallDelta: "+6",
    deltaRows: [
      {
        label: "Güç",
        key: "power",
        stock: 78,
        build: 84,
        delta: 6,
        formattedDelta: "+6",
        tone: "positive",
      },
    ],
    parts: [
      {
        code: "synthetic-part",
        label: "Sentetik parça",
        categoryLabel: "Motor",
        fitmentLabel: "Focus RS",
      },
    ],
  });
  assert.equal(body.data.demo?.vehicleLabel, "Ford Focus RS Mk3");
  assert.equal(body.data.demo?.stockRating.overall, 76);
  assert.equal(body.data.demo?.buildRating.overall, 82);
  assert.equal("code" in (body.data.demo?.parts[0] ?? {}), false);

  const response = mobileRatingDiscoveryJsonResponse(body);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get(mobileRatingDiscoveryContractHeader),
    mobileRatingDiscoveryContractVersion,
  );

  const route = readFileSync(
    "src/app/api/mobile/v1/rating-discovery/route.ts",
    "utf8",
  );
  assert.match(route, /getFocusRsRatingDiscoveryDemo/);
  assert.match(route, /export const runtime = "nodejs"/);
  assert.doesNotMatch(route, /authenticateMobile/);

  const discovery = readFileSync("src/lib/rating-discovery.ts", "utf8");
  assert.match(discovery, /getCachedFocusRsRatingDiscoveryDemo = unstable_cache/);
  assert.match(discovery, /rating-discovery-focus-rs-demo-v1/);
}

function validateLimitAndStableOrdering() {
  const candidates = Array.from({ length: 55 }, (_, index) =>
    candidate({
      code: `vehicle-${String(index).padStart(2, "0")}`,
      overall: 100 - index,
      trackReadiness: 90,
      handling: 80,
    }),
  );
  const topFifty = buildStockRatingLeaderboard(candidates, 50);

  assert.equal(topFifty.length, 50);
  assert.equal(topFifty[0]?.rank, 1);
  assert.equal(topFifty[0]?.code, "vehicle-00");
  assert.equal(topFifty[49]?.rank, 50);
  assert.equal(topFifty[49]?.code, "vehicle-49");

  const tied = buildStockRatingLeaderboard(
    [
      candidate({ code: "d", overall: 90, trackReadiness: 89, handling: 99 }),
      candidate({ code: "c", overall: 90, trackReadiness: 90, handling: 80 }),
      candidate({ code: "b", overall: 90, trackReadiness: 90, handling: 81 }),
      candidate({ code: "a", overall: 90, trackReadiness: 90, handling: 81 }),
    ],
    50,
  );

  assert.deepEqual(
    tied.map((entry) => entry.code),
    ["a", "b", "c", "d"],
  );
  assert.deepEqual(buildStockRatingLeaderboard(candidates, -1), []);
  assert.deepEqual(buildStockRatingLeaderboard(candidates, 1.5), []);
}

function validateResponseContract() {
  const entries = buildStockRatingLeaderboard(
    [candidate({ code: "focus-rs", overall: 87 })],
    50,
  );
  assert.equal(entries[0]?.subtitle, "Mk3 · 2.3 EcoBoost · 2016-2018");
  assert.equal(entries[0]?.tierLabel, "Çok iyi");

  const contract = readFileSync(
    "src/lib/mobile-stock-leaderboard-contract.ts",
    "utf8",
  );
  assert.match(contract, /X-ATS-Stock-Leaderboard-Contract/);
  assert.match(contract, /leaderboard-v1/);
  assert.match(contract, /MOBILE_STOCK_LEADERBOARD_UNAVAILABLE/);
  assert.match(contract, /mobileJsonResponse/);
  assert.doesNotMatch(contract, /strongestComponents: entry/);
}

function validateRouteGuards() {
  const route = readFileSync(
    "src/app/api/mobile/v1/stock-leaderboard/route.ts",
    "utf8",
  );
  assert.match(route, /getStockRatingLeaderboard\(50\)/);
  assert.match(route, /export const runtime = "nodejs"/);
  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(route, /authenticateMobile/);
}

function candidate({
  code,
  overall,
  trackReadiness = 80,
  handling = 80,
}: {
  code: string;
  overall: number;
  trackReadiness?: number;
  handling?: number;
}): StockRatingLeaderboardCandidate {
  return {
    vehicleDefinition: {
      code,
      brand: "Ford",
      model: "Focus RS",
      generation: "Mk3",
      variant: "2.3 EcoBoost",
      yearFrom: 2016,
      yearTo: 2018,
    },
    rating: {
      overall,
      power: 82,
      handling,
      braking: 83,
      reliability: 78,
      thermal: 79,
      trackReadiness,
      status: "CALIBRATED",
    },
  };
}
