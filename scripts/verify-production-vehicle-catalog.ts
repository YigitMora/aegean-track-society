import "dotenv/config";

const watchedBrands = [
  "Alfa Romeo",
  "Ferrari",
  "Lamborghini",
  "McLaren",
  "Maserati",
  "Aston Martin",
  "Lotus",
  "Abarth",
  "Cupra",
  "Subaru",
  "Mitsubishi",
  "Mazda",
  "Jaguar",
  "Chevrolet",
  "Cadillac",
] as const;

const representativeCodes = [
  "alfa_romeo_giulia_quadrifoglio_952",
  "alfa_romeo_giulietta_qv_940",
  "alfa_romeo_4c_960",
  "ferrari_488_pista",
  "ferrari_458_speciale",
  "ferrari_sf90_stradale",
  "ferrari_f8_tributo",
  "ferrari_812_superfast",
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not configured; read-only production catalog verification skipped.");
    return;
  }

  const { prisma } = await import("../src/lib/prisma");

  try {
    const [activeTotal, brandRows, representatives, volvoPolestarCount] =
      await Promise.all([
        prisma.vehicleDefinition.count({
          where: {
            active: true,
          },
        }),
        prisma.vehicleDefinition.groupBy({
          by: ["brand"],
          where: {
            active: true,
          },
          _count: {
            _all: true,
          },
          orderBy: {
            brand: "asc",
          },
        }),
        prisma.vehicleDefinition.findMany({
          where: {
            active: true,
            code: {
              in: [...representativeCodes],
            },
          },
          orderBy: {
            code: "asc",
          },
          select: {
            code: true,
            brand: true,
            model: true,
            generation: true,
            variant: true,
          },
        }),
        prisma.vehicleDefinition.count({
          where: {
            active: true,
            brand: {
              in: ["Volvo", "Polestar"],
            },
          },
        }),
      ]);
    const brandCounts = new Map(
      brandRows.map((row) => [row.brand, row._count._all]),
    );

    console.log("READ_ONLY production vehicle catalog verification");
    console.log(`total active VehicleDefinitions: ${activeTotal}`);
    console.log(`distinct active brands: ${brandRows.length}`);

    for (const brand of watchedBrands) {
      console.log(`active ${brand} count: ${brandCounts.get(brand) ?? 0}`);
    }

    console.log(`active Volvo/Polestar count: ${volvoPolestarCount}`);
    console.log("representative active codes:");

    for (const code of representativeCodes) {
      const match = representatives.find((row) => row.code === code);
      const label = match
        ? [match.brand, match.model, match.generation, match.variant]
            .filter(Boolean)
            .join(" ")
        : "MISSING";

      console.log(`- ${code}: ${label}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
