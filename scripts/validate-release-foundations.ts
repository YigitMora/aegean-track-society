import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mobileApplicationsContractHeader,
  mobileApplicationsContractVersion,
} from "../src/lib/mobile-applications-contract";
import {
  mobileAuthContractHeader,
  mobileAuthContractVersion,
} from "../src/lib/mobile-auth-contract";
import {
  mobileGarageLifecycleContractHeader,
  mobileGarageLifecycleContractVersion,
} from "../src/lib/mobile-garage-contract";
import {
  mobileGarageDetailContractHeader,
  mobileGarageDetailContractVersion,
} from "../src/lib/mobile-garage-detail-contract";
import {
  buildMobileReleaseManifest,
  getMobileApiContractManifest,
} from "../src/lib/mobile-release-contract";
import {
  ReleaseVerificationError,
  verifyProductionRelease,
} from "../src/lib/release-verifier";

const expectedSha = "0123456789abcdef0123456789abcdef01234567";
const deploymentHost = "ats-release-012345.vercel.app";
const canonicalHost = "www.aegeantracksociety.com";
const contract = getMobileApiContractManifest();

async function main() {
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.releaseContract, "release-v1");
assert.deepEqual(contract.contracts.auth, {
  header: mobileAuthContractHeader,
  supportedVersions: [mobileAuthContractVersion],
});
assert.deepEqual(contract.contracts.garageLifecycle, {
  header: mobileGarageLifecycleContractHeader,
  supportedVersions: [mobileGarageLifecycleContractVersion],
});
assert.deepEqual(contract.contracts.garageDetail, {
  header: mobileGarageDetailContractHeader,
  supportedVersions: [mobileGarageDetailContractVersion],
});
assert.deepEqual(contract.contracts.applications, {
  header: mobileApplicationsContractHeader,
  supportedVersions: [mobileApplicationsContractVersion],
});
assert.equal(buildMobileReleaseManifest(expectedSha).backendCommitSha, expectedSha);
assert.equal(buildMobileReleaseManifest("not-a-sha").backendCommitSha, null);

const happy = createMockFetch();
const result = await verifyProductionRelease({
  repository: "YigitMora/aegean-track-society",
  expectedSha,
  canonicalUrl: `https://${canonicalHost}`,
  githubToken: "test-token-not-a-real-credential",
  expectedContract: contract,
  fetchImpl: happy.fetch,
});
assert.equal(result.expectedSha, expectedSha);
assert.equal(result.verifiedProbeCount, 5);
assert.equal(result.deploymentOrigin, `https://${deploymentHost}`);
assert.equal(result.canonicalOrigin, `https://${canonicalHost}`);
assert.equal(happy.productRequests.length, 7);
assert.ok(happy.productRequests.every((request) => request.method === "GET"));
assert.ok(
  happy.productRequests.every(
    (request) => !new Headers(request.headers).has("Authorization"),
  ),
);

await assert.rejects(
  () =>
    verifyProductionRelease({
      repository: "YigitMora/aegean-track-society",
      expectedSha,
      canonicalUrl: `https://${canonicalHost}`,
      githubToken: "test-token-not-a-real-credential",
      expectedContract: contract,
      fetchImpl: createMockFetch({ manifestSha: "f".repeat(40) }).fetch,
    }),
  (error: unknown) => hasCode(error, "DEPLOYED_SHA_MISMATCH"),
);

await assert.rejects(
  () =>
    verifyProductionRelease({
      repository: "YigitMora/aegean-track-society",
      expectedSha,
      canonicalUrl: `https://${canonicalHost}`,
      githubToken: "test-token-not-a-real-credential",
      expectedContract: contract,
      fetchImpl: createMockFetch({ redirectProbe: true }).fetch,
    }),
  (error: unknown) => hasCode(error, "AUTH_PROBE_REDIRECTED"),
);

await assert.rejects(
  () =>
    verifyProductionRelease({
      repository: "YigitMora/aegean-track-society",
      expectedSha,
      canonicalUrl: `https://${canonicalHost}`,
      githubToken: "test-token-not-a-real-credential",
      expectedContract: contract,
      fetchImpl: createMockFetch({ deploymentSucceeded: false }).fetch,
    }),
  (error: unknown) => hasCode(error, "PRODUCTION_DEPLOYMENT_NOT_VERIFIED"),
);

const releaseRoute = read("src/app/api/mobile/v1/release/route.ts");
assert.doesNotMatch(releaseRoute, /prisma|authenticate|authorization/i);
assert.doesNotMatch(releaseRoute, /fetch\s*\(/);
assert.match(releaseRoute, /runtime = "nodejs"/);
assert.match(releaseRoute, /dynamic = "force-dynamic"/);

const migrationWorkflow = read(".github/workflows/production-database.yml");
const seedWorkflow = read(".github/workflows/production-seed.yml");
const ciWorkflow = read(".github/workflows/ci.yml");
assertProductionDatabaseWorkflow({
  source: migrationWorkflow,
  confirmationPrefix: "MIGRATE PRODUCTION",
  operationCommand: "pnpm prisma:deploy",
  forbiddenCommand: /pnpm prisma:seed|prisma db seed/,
});
assertProductionDatabaseWorkflow({
  source: seedWorkflow,
  confirmationPrefix: "SEED PRODUCTION",
  operationCommand: "pnpm prisma:seed",
  forbiddenCommand: /pnpm prisma:deploy|prisma migrate deploy/,
});
assert.doesNotMatch(ciWorkflow, /DATABASE_URL|secrets\./);

const paymentCallback = read("src/app/api/payments/iyzico/callback/route.ts");
assert.match(paymentCallback, /PAYMENT_CONFIRMATION_TRANSACTION_FAILED/);
assert.doesNotMatch(
  paymentCallback,
  /console\.error\("Payment confirmation transaction failed",\s*error\)/,
);

console.log("validate-release-foundations passed");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? `validate-release-foundations failed: ${error.message}`
      : "validate-release-foundations failed",
  );
  process.exitCode = 1;
});

function createMockFetch(options?: {
  manifestSha?: string;
  redirectProbe?: boolean;
  deploymentSucceeded?: boolean;
}) {
  const productRequests: Array<{ method: string; headers: HeadersInit }> = [];
  const manifestSha = options?.manifestSha ?? expectedSha;
  const deploymentSucceeded = options?.deploymentSucceeded ?? true;

  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/deployments")) {
      return jsonResponse([
        { id: 42, sha: expectedSha, environment: "Production" },
      ]);
    }

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/statuses")) {
      return jsonResponse(
        deploymentSucceeded
          ? [
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
              },
            ]
          : [
              { state: "failure" },
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
              },
            ],
      );
    }

    productRequests.push({
      method: init?.method ?? "GET",
      headers: init?.headers ?? {},
    });

    if (url.pathname === "/api/mobile/v1/release") {
      return jsonResponse(buildMobileReleaseManifest(manifestSha), 200, {
        "Cache-Control": "no-store",
        "X-ATS-Release-Contract": contract.releaseContract,
      });
    }

    if (options?.redirectProbe && url.pathname === "/api/mobile/v1/me") {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://example.invalid/login" },
      });
    }

    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "WWW-Authenticate": "Bearer",
      [mobileAuthContractHeader]: mobileAuthContractVersion,
    };
    if (url.pathname === "/api/mobile/v1/garage") {
      headers[mobileGarageLifecycleContractHeader] =
        mobileGarageLifecycleContractVersion;
    } else if (url.pathname.endsWith("/build")) {
      headers[mobileGarageDetailContractHeader] = mobileGarageDetailContractVersion;
    } else if (
      url.pathname === "/api/mobile/v1/events" ||
      url.pathname === "/api/mobile/v1/applications"
    ) {
      headers[mobileApplicationsContractHeader] = mobileApplicationsContractVersion;
    }

    return jsonResponse(
      {
        error: {
          code: "MOBILE_AUTH_MISSING_TOKEN",
          message: "Safe test message",
        },
      },
      401,
      headers,
    );
  };

  return { fetch, productRequests };
}

function assertProductionDatabaseWorkflow({
  source,
  confirmationPrefix,
  operationCommand,
  forbiddenCommand,
}: {
  source: string;
  confirmationPrefix: string;
  operationCommand: string;
  forbiddenCommand: RegExp;
}) {
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(
    source,
    /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  );
  assert.match(source, /group:\s*production-database/);
  assert.match(source, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(source, /\[\[ "\$GITHUB_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.ok(
    source.includes(
      `test "$CONFIRMATION" = "${confirmationPrefix} $GITHUB_SHA"`,
    ),
  );
  assert.match(source, /approved_sha=\$GITHUB_SHA/);
  assert.match(source, /needs:\s*authorize/);
  assert.match(source, /ref:\s*\$\{\{ needs\.authorize\.outputs\.approved_sha \}\}/);
  assert.match(source, /persist-credentials:\s*false/);
  assert.match(source, /environment:\s*Production/);
  assert.equal(source.match(/secrets\.DATABASE_URL/g)?.length, 1);

  const installIndex = source.indexOf("pnpm install --frozen-lockfile");
  const secretIndex = source.indexOf("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
  const operationIndex = source.indexOf(operationCommand);
  assert.ok(installIndex >= 0 && secretIndex > installIndex);
  assert.ok(operationIndex > secretIndex);
  assert.match(source, /DATABASE_URL:\s*\$\{\{ secrets\.DATABASE_URL \}\}/);
  assert.match(source, new RegExp(escapeRegExp(operationCommand)));
  assert.doesNotMatch(source, forbiddenCommand);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function hasCode(error: unknown, code: string) {
  return error instanceof ReleaseVerificationError && error.code === code;
}

function read(path: string) {
  return readFileSync(path, "utf8");
}
