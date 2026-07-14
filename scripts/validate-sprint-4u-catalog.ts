import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type AuditRow = {
  code: string;
  status: string;
  overall: number;
  handling: number;
  trackReadiness: number;
};

const root = process.cwd();
const seedText = read("prisma/seed.ts");
const auditText = read("docs/ats-vehicle-rating-audit.md");
const baseline = {
  activeDefinitions: 289,
  stock90: 11,
  stock95: 3,
};
const vehicleArrayNames = [
  "baseVehicleDefinitions",
  "expandedPerformanceVehicleDefinitions",
  "sprint4NPerformanceVehicleDefinitions",
  "sprint4OReferenceVehicleDefinitions",
  "sprint4NDailyVehicleDefinitions",
  "sprint4PDailyVehicleDefinitions",
  "sprint4UAlfaRomeoVehicleDefinitions",
  "sprint4UDailyPerformanceVehicleDefinitions",
  "sprint4UEliteVehicleDefinitions",
] as const;
const requiredAlfaCodes = [
  "alfa_romeo_mito_multiair_955",
  "alfa_romeo_mito_quadrifoglio_verde_955",
  "alfa_romeo_giulietta_multiair_940",
  "alfa_romeo_giulietta_qv_940",
  "alfa_romeo_giulietta_veloce_940",
  "alfa_romeo_giulia_20_turbo_952",
  "alfa_romeo_giulia_veloce_q4_952",
  "alfa_romeo_giulia_quadrifoglio_952",
  "alfa_romeo_stelvio_20_turbo_949",
  "alfa_romeo_stelvio_veloce_949",
  "alfa_romeo_stelvio_quadrifoglio_949",
  "alfa_romeo_tonale_hybrid_965",
  "alfa_romeo_tonale_phev_q4_965",
  "alfa_romeo_147_20_twin_spark_937",
  "alfa_romeo_147_gta_937",
  "alfa_romeo_156_20_twin_spark_932",
  "alfa_romeo_156_gta_932",
  "alfa_romeo_gt_32_v6_937",
  "alfa_romeo_brera_32_jts_q4_939",
  "alfa_romeo_4c_960",
  "alfa_romeo_4c_spider_960",
  "alfa_romeo_8c_competizione_920",
] as const;

const vehicleCodes = vehicleArrayNames.flatMap((arrayName) =>
  extractCodesFromArray(seedText, arrayName),
);
const vehicleCodeSet = new Set(vehicleCodes);
const duplicateCodeCount = vehicleCodes.length - vehicleCodeSet.size;
const familyLinkedCodes = new Set(
  Array.from(seedText.matchAll(/\bfamilyLink\("([^"]+)"/g), (match) => match[1]),
);
const auditRows = parseAuditRows(auditText);
const auditRowValues = Array.from(auditRows.values());
const activeDefinitions = requiredSummaryNumber("Active vehicle definitions audited");
const stock90Rows = auditRowValues.filter((row) => row.overall >= 90);
const stock95Rows = auditRowValues.filter((row) => row.overall >= 95);
const reviewSignalCount = requiredSummaryNumber("Review-required signals");
const alfaCodes = vehicleCodes.filter((code) => code.startsWith("alfa_romeo_"));
const topTen = [...auditRowValues]
  .sort(
    (first, second) =>
      second.overall - first.overall ||
      second.trackReadiness - first.trackReadiness ||
      second.handling - first.handling ||
      first.code.localeCompare(second.code),
  )
  .slice(0, 10);

const failures = [
  duplicateCodeCount === 0 ? null : `duplicate vehicle code count ${duplicateCodeCount}`,
  activeDefinitions > baseline.activeDefinitions
    ? null
    : `active definitions did not increase from ${baseline.activeDefinitions}`,
  stock90Rows.length > baseline.stock90
    ? null
    : `stock 90+ count did not increase from ${baseline.stock90}`,
  stock95Rows.length >= baseline.stock95
    ? null
    : `stock 95+ count regressed from ${baseline.stock95}`,
  topTen.length === 10 ? null : `top ten has ${topTen.length} rows`,
  reviewSignalCount === 0 ? null : `review signal count ${reviewSignalCount}`,
  ...requiredAlfaCodes.map((code) =>
    vehicleCodeSet.has(code) ? null : `missing Alfa Romeo definition ${code}`,
  ),
  ...requiredAlfaCodes.map((code) =>
    familyLinkedCodes.has(code) ? null : `missing Alfa Romeo family link ${code}`,
  ),
].filter((failure): failure is string => Boolean(failure));

console.log(`Total active definitions: ${activeDefinitions}`);
console.log(`Alfa Romeo active definitions: ${alfaCodes.length}`);
console.log(`Stock Overall >= 90: ${stock90Rows.length}`);
console.log(`Stock Overall >= 95: ${stock95Rows.length}`);
console.log(
  `Top 10 codes and scores: ${topTen
    .map((row) => `${row.code}:${row.overall}`)
    .join(", ")}`,
);
console.log(`Duplicate code count: ${duplicateCodeCount}`);
console.log(`Rating review signal count: ${reviewSignalCount}`);

if (failures.length > 0) {
  throw new Error(`Sprint 4U catalog validation failed: ${failures.join("; ")}`);
}

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function requiredSummaryNumber(metric: string) {
  const expression = new RegExp(`\\| ${escapeRegExp(metric)} \\| (\\d+) \\|`);
  const value = expression.exec(auditText)?.[1];

  if (!value) {
    throw new Error(`Missing audit summary metric ${metric}`);
  }

  return Number(value);
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
      status: match[2],
      overall: Number(match[3]),
      handling: Number(match[4]),
      trackReadiness: Number(match[5]),
    });
  }

  return rows;
}

function extractCodesFromArray(source: string, arrayName: string) {
  const body = extractArrayBody(source, arrayName);

  return Array.from(body.matchAll(/\bcode:\s*"([^"]+)"/g), (match) => match[1]);
}

function extractArrayBody(source: string, arrayName: string) {
  const marker = `const ${arrayName} = [`;
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error(`Missing array ${arrayName}`);
  }

  const bodyStart = start + marker.length;
  let depth = 1;
  let inString = false;
  let escapeNext = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "[") {
      depth += 1;
    }

    if (char === "]") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(bodyStart, index);
      }
    }
  }

  throw new Error(`Unterminated array ${arrayName}`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
