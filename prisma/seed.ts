import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const eventSlug = "kula-mytrack-2026";
const sep20 = new Date("2026-09-20T00:00:00.000Z");

function decimalFromEnv(name: string): Prisma.Decimal {
  return new Prisma.Decimal(process.env[name] ?? "0.00");
}

function intFromEnv(name: string): number {
  const parsed = Number.parseInt(process.env[name] ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      code: "KULA",
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
    },
    create: {
      code: "KULA",
      slug: eventSlug,
      name: "Kula MyTrack",
      venue: "Kula MyTrack",
      startsAt: new Date("2026-09-20T06:00:00+03:00"),
      endsAt: new Date("2026-09-20T18:00:00+03:00"),
      timezone: "Europe/Istanbul",
      status: "PUBLISHED",
      participantSequenceNext: 1,
    },
  });

  await prisma.eventPackageDay.deleteMany({
    where: {
      package: {
        eventId: event.id,
        code: { not: "SEP20" },
      },
    },
  });

  await prisma.eventPackage.deleteMany({
    where: {
      eventId: event.id,
      code: { not: "SEP20" },
    },
  });

  await prisma.eventDay.deleteMany({
    where: {
      eventId: event.id,
      date: { not: sep20 },
    },
  });

  const day20 = await prisma.eventDay.upsert({
    where: { eventId_date: { eventId: event.id, date: sep20 } },
    update: { label: "Sunday, 20 September 2026" },
    create: {
      eventId: event.id,
      date: sep20,
      label: "Sunday, 20 September 2026",
    },
  });

  const package20 = await prisma.eventPackage.upsert({
    where: { eventId_code: { eventId: event.id, code: "SEP20" } },
    update: {
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
    create: {
      eventId: event.id,
      code: "SEP20",
      name: "Sunday Track Day",
      price: decimalFromEnv("SEED_PACKAGE_SEP20_PRICE"),
      currency: "TRY",
      capacity: intFromEnv("SEED_PACKAGE_SEP20_CAPACITY"),
      active: true,
    },
  });

  const links = [{ packageId: package20.id, eventDayId: day20.id }];

  for (const link of links) {
    await prisma.eventPackageDay.upsert({
      where: { packageId_eventDayId: link },
      update: {},
      create: link,
    });
  }

  console.log(`Seeded ${event.name} with ${links.length} package-day links.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
