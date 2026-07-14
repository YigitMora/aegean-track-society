import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type AuditRow = {
  code: string;
  overall: number;
  handling: number;
  trackReadiness: number;
};

const root = process.cwd();
const files = {
  data: read("src/lib/rating-discovery.ts"),
  demo: read("src/components/rating-discovery/build-impact-demo.tsx"),
  homepage: read("src/app/page.tsx"),
  audit: read("docs/ats-vehicle-rating-audit.md"),
};
const topTenBuilderBody = extractFunctionBody(files.data, "getStockRatingTopTen");
const auditRows = parseAuditRows(files.audit);
const topTen = Array.from(auditRows.values())
  .sort(
    (first, second) =>
      second.overall - first.overall ||
      second.trackReadiness - first.trackReadiness ||
      second.handling - first.handling ||
      first.code.localeCompare(second.code),
  )
  .slice(0, 10);

const checks = [
  {
    name: "cached server data builder exists",
    pass:
      files.data.includes("unstable_cache") &&
      files.data.includes("getStockRatingTopTen") &&
      files.data.includes("revalidate: 60 * 60 * 6") &&
      files.data.includes('"vehicle-definitions"'),
  },
  {
    name: "leaderboard uses active stock centralized ratings",
    pass:
      topTenBuilderBody.includes("active: true") &&
      topTenBuilderBody.includes('not: "UNAVAILABLE"') &&
      topTenBuilderBody.includes("calculateVehiclePerformanceRating") &&
      topTenBuilderBody.includes("installedModifications: []"),
  },
  {
    name: "leaderboard sort is deterministic",
    pass:
      topTenBuilderBody.includes("second.rating.overall") &&
      topTenBuilderBody.includes("second.rating.trackReadiness") &&
      topTenBuilderBody.includes("second.rating.handling") &&
      topTenBuilderBody.includes("localeCompare"),
  },
  {
    name: "top ten list is not hardcoded",
    pass:
      !/porsche_911|ferrari_|mclaren_|lamborghini_|ford_mustang_gtd/.test(
        topTenBuilderBody,
      ),
  },
  {
    name: "homepage passes leaderboard into Focus RS demo section",
    pass: files.homepage.includes("stockTopTen={ratingDiscovery.stockTopTen}"),
  },
  {
    name: "left panel renders compact stock top ten",
    pass:
      files.demo.includes("Stock ATS Rating Top 10") &&
      files.demo.includes("Liste, aktif katalog araçlarının modifikasyonsuz") &&
      files.demo.includes("StockTopTenLeaderboard") &&
      files.demo.includes("StockTopTenRow"),
  },
  {
    name: "rating tones and visible numeric scores are preserved",
    pass:
      files.demo.includes("ratingToneForScore") &&
      files.demo.includes("{entry.overall}") &&
      files.demo.includes("entry.strongestComponents") &&
      files.demo.includes("RatingStatusBadge"),
  },
  {
    name: "mobile/desktop ordering keeps Focus RS demo readable",
    pass:
      files.demo.includes("order-2 bg-ats-black") &&
      files.demo.includes("lg:order-1") &&
      files.demo.includes("order-1 p-6") &&
      files.demo.includes("lg:order-2"),
  },
  {
    name: "computed top ten has exactly ten rows",
    pass: topTen.length === 10,
  },
];
const failedChecks = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

console.log(
  `Top 10 leaderboard: ${topTen
    .map((row) => `${row.code}:${row.overall}`)
    .join(", ")}`,
);

if (failedChecks.length > 0) {
  throw new Error(
    `Stock Top 10 validation failed: ${failedChecks
      .map((check) => check.name)
      .join(", ")}`,
  );
}

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function parseAuditRows(text: string) {
  const rows = new Map<string, AuditRow>();

  for (const line of text.split("\n")) {
    const match = /^\| `([^`]+)` \| .*? \| (CALIBRATED|PROVISIONAL|UNAVAILABLE) \| (\d+) \| \d+ \| (\d+) \| \d+ \| \d+ \| \d+ \| (\d+) \|/.exec(
      line,
    );

    if (!match) {
      continue;
    }

    rows.set(match[1], {
      code: match[1],
      overall: Number(match[3]),
      handling: Number(match[4]),
      trackReadiness: Number(match[5]),
    });
  }

  return rows;
}

function extractFunctionBody(source: string, functionName: string) {
  const start = source.indexOf(`const ${functionName} = unstable_cache(`);

  if (start === -1) {
    throw new Error(`Missing ${functionName}`);
  }

  const end = source.indexOf("\n);\n", start);

  if (end === -1) {
    throw new Error(`Could not find end of ${functionName}`);
  }

  return source.slice(start, end);
}
