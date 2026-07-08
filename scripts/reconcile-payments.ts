import "dotenv/config";
import { finalizeCheckoutPayment } from "../src/lib/payment-confirmation";
import { retrieveCheckoutForm } from "../src/lib/iyzico";
import { prisma } from "../src/lib/prisma";

type Options = {
  minutes: number;
  limit: number;
  failUnverified: boolean;
};

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const cutoff = new Date(Date.now() - options.minutes * 60 * 1000);
  const payments = await prisma.payment.findMany({
    where: {
      status: "INITIATED",
      createdAt: {
        lte: cutoff,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: options.limit,
    select: {
      id: true,
      conversationId: true,
      iyzicoToken: true,
      registrationId: true,
      createdAt: true,
    },
  });

  console.log(
    `Found ${payments.length} INITIATED payments older than ${options.minutes} minutes.`,
  );

  for (const payment of payments) {
    if (!payment.iyzicoToken) {
      console.log(
        `[skip] ${payment.id} registration=${payment.registrationId} has no iyzico token.`,
      );
      continue;
    }

    try {
      const checkoutResult = await retrieveCheckoutForm({
        token: payment.iyzicoToken,
        conversationId: payment.conversationId,
      });
      const result = await finalizeCheckoutPayment({
        paymentId: payment.id,
        checkoutResult,
        failUnverified: options.failUnverified,
      });

      console.log(
        `[${result.status}] payment=${payment.id} registration=${payment.registrationId}${
          result.reason ? ` reason=${result.reason}` : ""
        }`,
      );
    } catch (error) {
      console.error(
        `[error] payment=${payment.id} registration=${payment.registrationId}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

function parseOptions(args: string[]): Options {
  return {
    minutes: readNumberOption(args, "--minutes", 30),
    limit: readNumberOption(args, "--limit", 50),
    failUnverified: args.includes("--fail-unverified"),
  };
}

function readNumberOption(args: string[], name: string, fallback: number) {
  const arg = args.find((value) => value.startsWith(`${name}=`));

  if (!arg) {
    return fallback;
  }

  const value = Number.parseInt(arg.slice(name.length + 1), 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
