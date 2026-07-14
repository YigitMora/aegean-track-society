import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type VehicleSeedRow = {
  code: string;
  brand: string;
  model: string;
  generation: string | null;
  variant: string | null;
  ratingStatus: "CALIBRATED" | "PROVISIONAL" | "UNAVAILABLE";
  sortOrder: number;
};

export type AuditRow = {
  code: string;
  status: string;
  overall: number;
  power: number;
  handling: number;
  braking: number;
  reliability: number;
  thermal: number;
  trackReadiness: number;
};

export const root = process.cwd();

export const finalVehicleArrayNames = [
  "baseVehicleDefinitions",
  "expandedPerformanceVehicleDefinitions",
  "sprint4NPerformanceVehicleDefinitions",
  "sprint4OReferenceVehicleDefinitions",
  "sprint4NDailyVehicleDefinitions",
  "sprint4PDailyVehicleDefinitions",
  "sprint4UAlfaRomeoVehicleDefinitions",
  "sprint4UDailyPerformanceVehicleDefinitions",
  "sprint4UEliteVehicleDefinitions",
  "productionCatalogExpansionVehicleDefinitions",
] as const;

export function readRepoFile(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

export function extractVehicleRows(source: string, arrayName: string): VehicleSeedRow[] {
  const body = extractArrayBody(source, arrayName);

  return extractTopLevelObjectBlocks(body).map((block) => ({
    code: requiredString(block, "code"),
    brand: requiredString(block, "brand"),
    model: requiredString(block, "model"),
    generation: optionalString(block, "generation"),
    variant: optionalString(block, "variant"),
    ratingStatus: (optionalString(block, "ratingStatus") ?? "PROVISIONAL") as VehicleSeedRow["ratingStatus"],
    sortOrder: requiredNumber(block, "sortOrder"),
  }));
}

export function extractFinalVehicleRows(source: string) {
  return finalVehicleArrayNames.flatMap((arrayName) =>
    extractVehicleRows(source, arrayName).map((row) => ({
      ...row,
      arrayName,
      active: true,
    })),
  );
}

export function extractSpreadArrayNames(source: string, arrayName: string) {
  const body = extractArrayBody(source, arrayName);

  return Array.from(body.matchAll(/\.\.\.(\w+)/g), (match) => match[1]);
}

export function extractFamilyLinks(source: string) {
  return Array.from(
    source.matchAll(
      /\bfamilyLink\("([^"]+)",\s*(?:"([^"]+)"|null),\s*(?:"([^"]+)"|null)\)/g,
    ),
    (match) => ({
      vehicleCode: match[1],
      platformFamilyCode: match[2] ?? null,
      engineFamilyCode: match[3] ?? null,
    }),
  );
}

export function parseAuditRows(text: string) {
  const rows = new Map<string, AuditRow>();

  for (const line of text.split("\n")) {
    const match = /^\| `([^`]+)` \| .*? \| (CALIBRATED|PROVISIONAL|UNAVAILABLE) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|/.exec(
      line,
    );

    if (!match) {
      continue;
    }

    rows.set(match[1], {
      code: match[1],
      status: match[2],
      overall: Number(match[3]),
      power: Number(match[4]),
      handling: Number(match[5]),
      braking: Number(match[6]),
      reliability: Number(match[7]),
      thermal: Number(match[8]),
      trackReadiness: Number(match[9]),
    });
  }

  return rows;
}

export function extractSummaryNumber(text: string, metric: string) {
  const expression = new RegExp(`\\| ${escapeRegExp(metric)} \\| (\\d+) \\|`);
  const value = expression.exec(text)?.[1];

  if (!value) {
    throw new Error(`Missing audit summary metric ${metric}`);
  }

  return Number(value);
}

export function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

export function assertCondition(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function extractArrayBody(text: string, arrayName: string) {
  const marker = `const ${arrayName} = [`;
  const start = text.indexOf(marker);

  if (start === -1) {
    throw new Error(`Could not find ${arrayName}`);
  }

  const openIndex = text.indexOf("[", start);
  const closeIndex = findMatchingDelimiter(text, openIndex, "[", "]");

  return text.slice(openIndex + 1, closeIndex);
}

function extractTopLevelObjectBlocks(text: string) {
  const blocks: string[] = [];
  let stringDelimiter: string | null = null;
  let escaped = false;
  let depth = 0;
  let blockStart = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (stringDelimiter) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringDelimiter) {
        stringDelimiter = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      stringDelimiter = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        blockStart = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0 && blockStart !== -1) {
        blocks.push(text.slice(blockStart, index + 1));
        blockStart = -1;
      }
    }
  }

  return blocks;
}

function findMatchingDelimiter(
  text: string,
  openIndex: number,
  open: string,
  close: string,
) {
  let stringDelimiter: string | null = null;
  let escaped = false;
  let depth = 0;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];

    if (stringDelimiter) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringDelimiter) {
        stringDelimiter = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      stringDelimiter = char;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error(`No matching delimiter for ${open} at ${openIndex}`);
}

function optionalString(block: string, field: string) {
  return new RegExp(`\\b${field}:\\s*"([^"]+)"`).exec(block)?.[1] ?? null;
}

function requiredString(block: string, field: string) {
  const value = optionalString(block, field);

  if (!value) {
    throw new Error(`Missing string field ${field}`);
  }

  return value;
}

function requiredNumber(block: string, field: string) {
  const match = new RegExp(`\\b${field}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(block);

  if (!match) {
    throw new Error(`Missing number field ${field}`);
  }

  return Number(match[1]);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
