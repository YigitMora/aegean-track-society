import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
  canonicalBackendProductionOrigin,
  ReleaseVerificationError,
  verifyProductionRelease,
} from "../src/lib/release-verifier";

const expectedSha = "0123456789abcdef0123456789abcdef01234567";
const repository = "YigitMora/aegean-track-society";
const deploymentHost = "ats-release-012345.vercel.app";
const deploymentId = "dpl_TestDeployment123";
const canonicalHost = "www.aegeantracksociety.com";
const vercelProjectId = "prj_TestProject123";
const vercelTeamId = "team_TestAccount123";
const repositoryId = 123456789;
const contract = getMobileApiContractManifest();

async function main() {
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.releaseContract, "release-v1");
assert.deepEqual(contract.contracts.auth, {
  header: mobileAuthContractHeader,
  supportedVersions: [mobileAuthContractVersion],
});
assert.equal(
  contract.contracts.garageLifecycle.header,
  mobileGarageLifecycleContractHeader,
);
assert.deepEqual(contract.contracts.garageLifecycle.supportedVersions, [
  mobileGarageLifecycleContractVersion,
]);
assert.equal(contract.contracts.garageLifecycle.routes.length, 17);
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
assertGarageLifecycleRouteCoverage();

const happy = createMockFetch();
const result = await verifyProductionRelease({
  ...verificationOptions(happy.fetch),
});
assert.equal(result.expectedSha, expectedSha);
assert.equal(result.verifiedProbeCount, 7);
assert.equal(result.deploymentOrigin, `https://${deploymentHost}`);
assert.equal(result.canonicalOrigin, `https://${canonicalHost}`);
assert.equal(canonicalBackendProductionOrigin, `https://${canonicalHost}`);
assert.equal(happy.productRequests.length, 9);
assert.ok(happy.productRequests.every((request) => request.method === "GET"));
assert.ok(
  happy.productRequests.every(
    (request) => !new Headers(request.headers).has("Authorization"),
  ),
);

await expectVerificationFailure(
  { manifestSha: "f".repeat(40) },
  "DEPLOYED_SHA_MISMATCH",
);
await expectVerificationFailure(
  { redirectProbe: true },
  "AUTH_PROBE_REDIRECTED",
);
await expectVerificationFailure(
  { deploymentSucceeded: false },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { wrongProject: true },
  "VERCEL_PROJECT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { wrongRepository: true },
  "VERCEL_PROJECT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { untrustedProjectLinkType: true },
  "VERCEL_PROJECT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { previewTarget: true },
  "VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { incompleteDeploymentGitSource: true },
  "VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { untrustedDeploymentCreator: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { untrustedStatusCreator: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { missingDeployment: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { ambiguousDeployment: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { wrongDeploymentSha: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { staleCanonicalAlias: true },
  "VERCEL_CANONICAL_ALIAS_MISMATCH",
);
await expectVerificationFailure(
  { htmlResponse: true },
  "RELEASE_MANIFEST_UNAVAILABLE",
);
await expectVerificationFailure(
  { malformedJson: true },
  "INVALID_JSON_RESPONSE",
);
await expectVerificationFailure(
  { malformedContractHeader: true },
  "CONTRACT_HEADER_MISMATCH",
);
await expectVerificationFailure(
  { duplicateContractHeader: true },
  "CONTRACT_HEADER_MISMATCH",
);
await expectVerificationFailure(
  { wrongContractVersion: true },
  "RELEASE_CONTRACT_MISMATCH",
);
await expectVerificationFailure(
  { missingNoStore: true },
  "NO_STORE_MISSING",
);
await expectVerificationFailure(
  { missingBearer: true },
  "BEARER_CHALLENGE_MISSING",
);
await expectVerificationFailure(
  { githubApiFailure: true },
  "DEPLOYMENTS_LOOKUP_FAILED",
);
await expectVerificationFailure(
  { vercelApiFailure: true },
  "VERCEL_PROJECT_LOOKUP_FAILED",
);
await assert.rejects(() =>
  verifyProductionRelease(
    verificationOptions(createMockFetch({ networkFailure: true }).fetch),
  ),
);

const releaseRoute = read("src/app/api/mobile/v1/release/route.ts");
assert.doesNotMatch(releaseRoute, /prisma|authenticate|authorization/i);
assert.doesNotMatch(releaseRoute, /fetch\s*\(/);
assert.match(releaseRoute, /runtime = "nodejs"/);
assert.match(releaseRoute, /dynamic = "force-dynamic"/);

const migrationWorkflow = read(".github/workflows/production-database.yml");
const seedWorkflow = read(".github/workflows/production-seed.yml");
const releaseWorkflow = read(".github/workflows/verify-production-release.yml");
const ciWorkflow = read(".github/workflows/ci.yml");
const secretScanner = read("scripts/release-safety/secret-scan.mjs");
const repositorySafety = read("scripts/release-safety/repository-safety.mjs");
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
assertWorkflowActionPins(ciWorkflow, 3);
assert.match(ciWorkflow, /persist-credentials:\s*false/);
assert.match(ciWorkflow, /pnpm scan:secrets -- --base "\$BASE_SHA"/);
assertReleaseWorkflow(releaseWorkflow);
assert.match(secretScanner, /binary-file-review-required/);
assert.match(secretScanner, /oversized-file-review-required/);
assert.match(secretScanner, /VERCEL_ACCESS_TOKEN/);
assert.match(secretScanner, /values are intentionally hidden/);
assert.match(repositorySafety, /--name-status[\s\S]*--find-renames[\s\S]*-z/);
assert.match(repositorySafety, /newly added migration\.sql/);
assert.match(repositorySafety, /buildCommand !== 'prisma generate && next build'/);

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

type MockFetchOptions = {
  manifestSha?: string;
  redirectProbe?: boolean;
  deploymentSucceeded?: boolean;
  wrongProject?: boolean;
  wrongRepository?: boolean;
  untrustedProjectLinkType?: boolean;
  previewTarget?: boolean;
  incompleteDeploymentGitSource?: boolean;
  untrustedDeploymentCreator?: boolean;
  untrustedStatusCreator?: boolean;
  missingDeployment?: boolean;
  ambiguousDeployment?: boolean;
  wrongDeploymentSha?: boolean;
  staleCanonicalAlias?: boolean;
  htmlResponse?: boolean;
  malformedJson?: boolean;
  malformedContractHeader?: boolean;
  duplicateContractHeader?: boolean;
  wrongContractVersion?: boolean;
  missingNoStore?: boolean;
  missingBearer?: boolean;
  githubApiFailure?: boolean;
  vercelApiFailure?: boolean;
  networkFailure?: boolean;
};

function verificationOptions(fetchImpl: ReturnType<typeof createMockFetch>["fetch"]) {
  return {
    repository,
    expectedSha,
    githubToken: "test-github-token-not-a-real-credential",
    vercelAccessToken: "test-vercel-token-not-a-real-credential",
    vercelProjectId,
    vercelTeamId,
    expectedContract: contract,
    fetchImpl,
  };
}

async function expectVerificationFailure(
  options: MockFetchOptions,
  expectedCode: string,
) {
  await assert.rejects(
    () =>
      verifyProductionRelease(
        verificationOptions(createMockFetch(options).fetch),
      ),
    (error: unknown) => hasCode(error, expectedCode),
  );
}

function createMockFetch(options?: MockFetchOptions) {
  const productRequests: Array<{ method: string; headers: HeadersInit }> = [];
  const manifestSha = options?.manifestSha ?? expectedSha;
  const deploymentSucceeded = options?.deploymentSucceeded ?? true;
  const trustedActor = { login: "vercel[bot]", type: "Bot" };
  const untrustedActor = { login: "untrusted-bot[bot]", type: "Bot" };

  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );

    if (options?.networkFailure && url.hostname === "api.vercel.com") {
      throw new Error("Simulated network failure without sensitive details");
    }

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/deployments")) {
      if (options?.githubApiFailure) {
        return jsonResponse({ message: "Unavailable" }, 503);
      }
      if (options?.missingDeployment) {
        return jsonResponse([]);
      }
      const githubDeployment = {
        id: 42,
        sha: options?.wrongDeploymentSha ? "f".repeat(40) : expectedSha,
        ref: expectedSha,
        task: "deploy",
        environment: "Production",
        creator: options?.untrustedDeploymentCreator
          ? untrustedActor
          : trustedActor,
      };
      return jsonResponse(
        options?.ambiguousDeployment
          ? [githubDeployment, { ...githubDeployment, id: 43 }]
          : [githubDeployment],
      );
    }

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/statuses")) {
      const statusCreator = options?.untrustedStatusCreator
        ? untrustedActor
        : trustedActor;
      return jsonResponse(
        deploymentSucceeded
          ? [
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
                creator: statusCreator,
              },
            ]
          : [
              { state: "failure", creator: trustedActor },
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
                creator: trustedActor,
              },
            ],
      );
    }

    if (url.hostname === "api.vercel.com") {
      if (options?.vercelApiFailure) {
        return jsonResponse({ error: { code: "unavailable" } }, 503);
      }
      if (url.pathname.startsWith("/v9/projects/")) {
        return jsonResponse({
          id: options?.wrongProject ? "prj_WrongProject" : vercelProjectId,
          accountId: vercelTeamId,
          name: "aegean-track-society",
          link: {
            type: options?.untrustedProjectLinkType ? "vercel" : "github",
            org: "YigitMora",
            repo: options?.wrongRepository
              ? "another-repository"
              : "aegean-track-society",
            repoId: repositoryId,
            productionBranch: "main",
          },
        });
      }
      if (url.pathname.startsWith("/v13/deployments/")) {
        return jsonResponse({
          id: deploymentId,
          url: deploymentHost,
          projectId: vercelProjectId,
          ownerId: vercelTeamId,
          target: options?.previewTarget ? "preview" : "production",
          readyState: "READY",
          status: "READY",
          aliasAssigned: true,
          gitSource: {
            type: "github",
            ...(options?.incompleteDeploymentGitSource
              ? {}
              : {
                  org: "YigitMora",
                  repo: "aegean-track-society",
                  repoId: repositoryId,
                }),
            ref: "main",
            sha: expectedSha,
          },
        });
      }
      if (url.pathname.startsWith("/v4/aliases/")) {
        return jsonResponse({
          alias: canonicalHost,
          deploymentId: options?.staleCanonicalAlias
            ? "dpl_PreviousDeployment"
            : deploymentId,
          projectId: vercelProjectId,
        });
      }
    }

    productRequests.push({
      method: init?.method ?? "GET",
      headers: init?.headers ?? {},
    });

    if (url.pathname === "/api/mobile/v1/release") {
      if (options?.htmlResponse) {
        return new Response("<html>not a release manifest</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
      if (options?.malformedJson) {
        return new Response("{", {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json",
            "X-ATS-Release-Contract": contract.releaseContract,
          },
        });
      }
      const releaseManifest = buildMobileReleaseManifest(manifestSha);
      const manifest = options?.wrongContractVersion
        ? {
            ...releaseManifest,
            contracts: {
              ...releaseManifest.contracts,
              auth: {
                ...releaseManifest.contracts.auth,
                supportedVersions: ["auth-v999"],
              },
            },
          }
        : releaseManifest;
      return jsonResponse(manifest, 200, {
        ...(options?.missingNoStore ? {} : { "Cache-Control": "no-store" }),
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
      ...(options?.missingBearer ? {} : { "WWW-Authenticate": "Bearer" }),
      [mobileAuthContractHeader]: mobileAuthContractVersion,
    };
    if (
      url.pathname === "/api/mobile/v1/vehicle-definitions" ||
      url.pathname.startsWith("/api/mobile/v1/garage")
    ) {
      headers[mobileGarageLifecycleContractHeader] =
        options?.malformedContractHeader
          ? "garage-lifecycle-invalid"
          : mobileGarageLifecycleContractVersion;
    }
    if (
      url.pathname === "/api/mobile/v1/garage/release-verifier" ||
      url.pathname.endsWith("/build")
    ) {
      headers[mobileGarageDetailContractHeader] = mobileGarageDetailContractVersion;
    }
    if (
      url.pathname === "/api/mobile/v1/events" ||
      url.pathname === "/api/mobile/v1/applications"
    ) {
      headers[mobileApplicationsContractHeader] = mobileApplicationsContractVersion;
    }

    const response = jsonResponse(
      {
        error: {
          code: "MOBILE_AUTH_MISSING_TOKEN",
          message: "Safe test message",
        },
      },
      401,
      headers,
    );
    if (
      options?.duplicateContractHeader &&
      url.pathname === "/api/mobile/v1/garage"
    ) {
      response.headers.append(
        mobileGarageLifecycleContractHeader,
        mobileGarageLifecycleContractVersion,
      );
    }
    return response;
  };

  return { fetch, productRequests };
}

function assertGarageLifecycleRouteCoverage() {
  const garageRouteRoot = "src/app/api/mobile/v1/garage";
  const routeFiles = [
    "src/app/api/mobile/v1/vehicle-definitions/route.ts",
    ...readdirSync(garageRouteRoot, { recursive: true })
      .filter(
        (entry): entry is string =>
          typeof entry === "string" &&
          (entry === "route.ts" || entry.endsWith("/route.ts")),
      )
      .map((entry) => `${garageRouteRoot}/${entry}`),
  ];
  const actualOperations = routeFiles.flatMap((file) => {
    const routeSource = read(file);
    const path = file
      .replace(/^src\/app/, "")
      .replace(/\/route\.ts$/, "")
      .replaceAll(/\[([A-Za-z][A-Za-z0-9]*)\]/g, "{$1}");
    return Array.from(
      routeSource.matchAll(
        /export async function (GET|POST|PATCH|DELETE)\s*\(/g,
      ),
      (match) => `${match[1]} ${path}`,
    );
  });
  const manifestOperations = contract.contracts.garageLifecycle.routes.map(
    (route) => `${route.method} ${route.path}`,
  );

  assert.deepEqual(actualOperations.sort(), manifestOperations.sort());

  for (const route of contract.contracts.garageLifecycle.routes) {
    const sourcePath = `src/app${route.path
      .replaceAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g, "[$1]")}/route.ts`;
    const routeSource = read(sourcePath);
    assert.match(routeSource, /authenticateMobileGarageMember\(request\)/);
    if (route.contracts.includes("garageDetail")) {
      assert.match(routeSource, /mobileGarageDetailJsonResponse/);
      assert.match(routeSource, /mobileGarageDetailErrorResponse/);
    } else {
      assert.match(routeSource, /mobileGarageJsonResponse/);
      assert.match(routeSource, /mobileGarageErrorResponse/);
    }
    assert.equal(route.liveProbe, route.method === "GET");
  }
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
  assert.match(source, /persist-credentials:\s*false/);
  assertWorkflowActionPins(source, 3);
}

function assertReleaseWorkflow(source: string) {
  assert.match(source, /github\.ref == 'refs\/heads\/main'/);
  assert.match(source, /workflow_call:/);
  assert.match(source, /github\.event_name == 'workflow_call'/);
  assert.match(source, /github\.event\.deployment\.creator\.login == 'vercel\[bot\]'/);
  assert.match(
    source,
    /github\.event\.deployment_status\.creator\.login == 'vercel\[bot\]'/,
  );
  assert.match(source, /\[\[ "\$EXPECTED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  assert.match(
    source,
    /git merge-base --is-ancestor "\$EXPECTED_SHA" origin\/main/,
  );
  assert.match(source, /approved_sha=\$EXPECTED_SHA/);
  assert.match(source, /needs:\s*authorize/);
  assert.match(source, /environment:\s*Production/);
  assert.match(
    source,
    /ref:\s*\$\{\{ needs\.authorize\.outputs\.approved_sha \}\}/,
  );
  assert.equal(source.match(/persist-credentials:\s*false/g)?.length, 2);
  assert.equal(
    source.match(/repository:\s*YigitMora\/aegean-track-society/g)?.length,
    2,
  );
  assert.match(
    source,
    /--repository "YigitMora\/aegean-track-society"/,
  );
  assert.doesNotMatch(source, /canonical_url|--canonical-url|CANONICAL_URL/);
  assert.equal(source.match(/secrets\.VERCEL_ACCESS_TOKEN/g)?.length, 1);
  assert.equal(source.match(/vars\.VERCEL_PROJECT_ID/g)?.length, 1);
  assert.equal(source.match(/vars\.VERCEL_TEAM_ID/g)?.length, 1);

  const installIndex = source.indexOf("pnpm install --frozen-lockfile");
  const secretIndex = source.indexOf("VERCEL_ACCESS_TOKEN:");
  const verificationIndex = source.indexOf("pnpm verify:production-release");
  assert.ok(installIndex >= 0 && secretIndex > installIndex);
  assert.ok(verificationIndex > secretIndex);

  assertWorkflowActionPins(source, 4);
}

function assertWorkflowActionPins(source: string, expectedCount: number) {
  const actionPins = source.match(/uses:\s*[^\s]+@[0-9a-f]{40}\s+#\s+v\d+/g);
  assert.equal(actionPins?.length, expectedCount);
  assert.doesNotMatch(source, /uses:\s*[^\s]+@v\d+/);
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
