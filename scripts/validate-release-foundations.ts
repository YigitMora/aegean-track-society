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
  expectedBackendRepository,
  expectedBackendRepositoryId,
  ReleaseVerificationError,
  trustedVercelActorId,
  verifyProductionRelease,
} from "../src/lib/release-verifier";

const expectedSha = "0123456789abcdef0123456789abcdef01234567";
const repository = expectedBackendRepository;
const deploymentHost = "ats-release-012345.vercel.app";
const deploymentId = "dpl_TestDeployment123";
const canonicalHost = "www.aegeantracksociety.com";
const vercelProjectId = "prj_TestProject123";
const vercelTeamId = "team_TestAccount123";
const repositoryId = expectedBackendRepositoryId;
const contract = getMobileApiContractManifest();
let adversarialVerificationFixtureCount = 0;
let adversarialInvocationFixtureCount = 0;

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
assert.equal(expectedBackendRepositoryId, 1293619947);
assert.equal(trustedVercelActorId, 35613825);
assert.deepEqual(happy.githubDeploymentPages, [1]);
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
  { repositoryMetadataWrongId: true },
  "GITHUB_REPOSITORY_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { repositoryMetadataWrongName: true },
  "GITHUB_REPOSITORY_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { repositoryMetadataMissing: true },
  "GITHUB_REPOSITORY_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { repositoryMetadataMalformed: true },
  "GITHUB_REPOSITORY_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { projectRepositoryIdWrong: true },
  "VERCEL_PROJECT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { projectRepositoryIdMalformed: true },
  "VERCEL_PROJECT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { deploymentRepositoryIdWrong: true },
  "VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { deploymentRepositoryIdMalformed: true },
  "VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH",
);
await expectVerificationFailure(
  { bothVercelRepositoryIdsWrong: true },
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
  { deploymentActorWrongId: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { deploymentActorTrustedLookingUser: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { deploymentActorInconsistent: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { deploymentActorMissingId: true },
  "DEPLOYMENTS_RESPONSE_INVALID",
);
await expectVerificationFailure(
  { deploymentActorMalformedId: true },
  "DEPLOYMENTS_RESPONSE_INVALID",
);
await expectVerificationFailure(
  { wrongGitHubAppId: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { ambiguousGitHubAppMetadata: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { untrustedStatusCreator: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { statusActorWrongId: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { wrongStatusGitHubAppId: true },
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
const matchingSecondPage = createMockFetch({ matchingDeploymentOnPageTwo: true });
await verifyProductionRelease(verificationOptions(matchingSecondPage.fetch));
assert.deepEqual(matchingSecondPage.githubDeploymentPages, [1, 2]);
const nonMatchingFirstPage = createMockFetch({
  nonMatchingFirstPage: true,
});
await verifyProductionRelease(verificationOptions(nonMatchingFirstPage.fetch));
assert.deepEqual(nonMatchingFirstPage.githubDeploymentPages, [1, 2]);
const belowPaginationLimit = createMockFetch({
  completeOnPageNinetyNine: true,
});
await verifyProductionRelease(verificationOptions(belowPaginationLimit.fetch));
assert.deepEqual(
  belowPaginationLimit.githubDeploymentPages,
  Array.from({ length: 99 }, (_, index) => index + 1),
);
await expectVerificationFailure(
  { duplicateDeploymentAcrossPages: true },
  "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
);
await expectVerificationFailure(
  { malformedPaginationLink: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { paginationLoop: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { disallowedPaginationOrigin: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { disallowedPaginationPath: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { paginationConstraintTamper: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { paginationLastWithoutNext: true },
  "DEPLOYMENT_PAGINATION_INVALID",
);
await expectVerificationFailure(
  { laterPageApiFailure: true },
  "DEPLOYMENTS_LOOKUP_FAILED",
);
await expectVerificationFailure(
  { laterPageRateLimit: true },
  "DEPLOYMENTS_LOOKUP_FAILED",
);
await expectVerificationFailure(
  { truncatedDeploymentPage: true },
  "DEPLOYMENT_PAGINATION_INCOMPLETE",
);
const exactBoundaryNaturalEof = createMockFetch({
  exactBoundaryNaturalEof: true,
});
adversarialVerificationFixtureCount += 1;
await assert.rejects(
  () =>
    verifyProductionRelease(
      verificationOptions(exactBoundaryNaturalEof.fetch),
    ),
  (error: unknown) => hasCode(error, "DEPLOYMENT_PAGINATION_INCOMPLETE"),
);
assert.deepEqual(
  exactBoundaryNaturalEof.githubDeploymentPages,
  Array.from({ length: 100 }, (_, index) => index + 1),
);
const excessiveDeploymentPages = createMockFetch({
  excessiveDeploymentPages: true,
});
adversarialVerificationFixtureCount += 1;
await assert.rejects(
  () =>
    verifyProductionRelease(
      verificationOptions(excessiveDeploymentPages.fetch),
    ),
  (error: unknown) => hasCode(error, "DEPLOYMENT_PAGINATION_INCOMPLETE"),
);
assert.deepEqual(
  excessiveDeploymentPages.githubDeploymentPages,
  Array.from({ length: 100 }, (_, index) => index + 1),
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
adversarialVerificationFixtureCount += 1;

const releaseRoute = read("src/app/api/mobile/v1/release/route.ts");
assert.doesNotMatch(releaseRoute, /prisma|authenticate|authorization/i);
assert.doesNotMatch(releaseRoute, /fetch\s*\(/);
assert.match(releaseRoute, /runtime = "nodejs"/);
assert.match(releaseRoute, /dynamic = "force-dynamic"/);

const migrationWorkflow = read(".github/workflows/production-database.yml");
const seedWorkflow = read(".github/workflows/production-seed.yml");
const eventSeedWorkflow = read(".github/workflows/production-event-seed.yml");
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
  operationCommand: "pnpm seed:catalog",
  forbiddenCommand: /pnpm prisma:deploy|prisma migrate deploy|SEED_PACKAGE|event_slug/,
  confirmationIncludesSha: false,
  verifyCurrentMain: true,
});
assertProductionDatabaseWorkflow({
  source: eventSeedWorkflow,
  confirmationPrefix: "SEED EVENT PRODUCTION",
  operationCommand: "pnpm seed:event",
  forbiddenCommand: /pnpm prisma:deploy|prisma migrate deploy|pnpm seed:catalog/,
  confirmationIncludesSha: false,
  verifyCurrentMain: true,
});
assert.doesNotMatch(
  seedWorkflow,
  /SEED_PACKAGE|event_slug|package_price|package_capacity/,
);
assert.match(eventSeedWorkflow, /event_slug:/);
assert.match(eventSeedWorkflow, /package_price:/);
assert.match(eventSeedWorkflow, /package_capacity:/);
assert.match(eventSeedWorkflow, /SEED_EVENT_SLUG:/);
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

console.log(
  `validate-release-foundations passed (4 positive provenance fixtures, ${adversarialVerificationFixtureCount} adversarial provenance fixtures, ${adversarialInvocationFixtureCount} adversarial invocation fixtures)`,
);
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
  repositoryMetadataWrongId?: boolean;
  repositoryMetadataWrongName?: boolean;
  repositoryMetadataMissing?: boolean;
  repositoryMetadataMalformed?: boolean;
  projectRepositoryIdWrong?: boolean;
  projectRepositoryIdMalformed?: boolean;
  deploymentRepositoryIdWrong?: boolean;
  deploymentRepositoryIdMalformed?: boolean;
  bothVercelRepositoryIdsWrong?: boolean;
  untrustedProjectLinkType?: boolean;
  previewTarget?: boolean;
  incompleteDeploymentGitSource?: boolean;
  untrustedDeploymentCreator?: boolean;
  deploymentActorWrongId?: boolean;
  deploymentActorTrustedLookingUser?: boolean;
  deploymentActorInconsistent?: boolean;
  deploymentActorMissingId?: boolean;
  deploymentActorMalformedId?: boolean;
  wrongGitHubAppId?: boolean;
  ambiguousGitHubAppMetadata?: boolean;
  untrustedStatusCreator?: boolean;
  statusActorWrongId?: boolean;
  wrongStatusGitHubAppId?: boolean;
  missingDeployment?: boolean;
  ambiguousDeployment?: boolean;
  matchingDeploymentOnPageTwo?: boolean;
  nonMatchingFirstPage?: boolean;
  duplicateDeploymentAcrossPages?: boolean;
  malformedPaginationLink?: boolean;
  paginationLoop?: boolean;
  disallowedPaginationOrigin?: boolean;
  disallowedPaginationPath?: boolean;
  paginationConstraintTamper?: boolean;
  paginationLastWithoutNext?: boolean;
  laterPageApiFailure?: boolean;
  laterPageRateLimit?: boolean;
  truncatedDeploymentPage?: boolean;
  completeOnPageNinetyNine?: boolean;
  exactBoundaryNaturalEof?: boolean;
  excessiveDeploymentPages?: boolean;
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
  adversarialVerificationFixtureCount += 1;
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
  const githubDeploymentPages: number[] = [];
  const manifestSha = options?.manifestSha ?? expectedSha;
  const deploymentSucceeded = options?.deploymentSucceeded ?? true;
  const trustedActor = {
    id: trustedVercelActorId,
    login: "vercel[bot]",
    type: "Bot",
  };
  const untrustedActor = {
    id: 999999,
    login: "untrusted-bot[bot]",
    type: "Bot",
  };

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

    if (
      url.hostname === "api.github.com" &&
      url.pathname === `/repos/${repository}`
    ) {
      if (options?.repositoryMetadataMissing) {
        return jsonResponse({});
      }
      if (options?.repositoryMetadataMalformed) {
        return jsonResponse({
          id: String(repositoryId),
          name: "aegean-track-society",
          full_name: repository,
          owner: { login: "YigitMora" },
        });
      }
      return jsonResponse({
        id: options?.repositoryMetadataWrongId
          ? repositoryId + 1
          : repositoryId,
        name: options?.repositoryMetadataWrongName
          ? "another-repository"
          : "aegean-track-society",
        full_name: options?.repositoryMetadataWrongName
          ? "YigitMora/another-repository"
          : repository,
        owner: { login: "YigitMora" },
      });
    }

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/deployments")) {
      const page = Number(url.searchParams.get("page") ?? "1");
      githubDeploymentPages.push(page);
      if (options?.githubApiFailure) {
        return jsonResponse({ message: "Unavailable" }, 503);
      }
      if (page > 1 && options?.laterPageApiFailure) {
        return jsonResponse({ message: "Unavailable" }, 503);
      }
      if (page > 1 && options?.laterPageRateLimit) {
        return jsonResponse({ message: "Rate limited" }, 429);
      }
      if (options?.missingDeployment) {
        return jsonResponse([]);
      }
      let deploymentCreator: Record<string, unknown> = options?.untrustedDeploymentCreator
        ? untrustedActor
        : trustedActor;
      if (options?.deploymentActorWrongId) {
        deploymentCreator = { ...trustedActor, id: trustedVercelActorId + 1 };
      } else if (options?.deploymentActorTrustedLookingUser) {
        deploymentCreator = { ...trustedActor, type: "User" };
      } else if (options?.deploymentActorInconsistent) {
        deploymentCreator = { ...trustedActor, login: "trusted-looking[bot]" };
      } else if (options?.deploymentActorMissingId) {
        const { id: _id, ...withoutId } = trustedActor;
        deploymentCreator = withoutId;
      } else if (options?.deploymentActorMalformedId) {
        deploymentCreator = { ...trustedActor, id: String(trustedVercelActorId) };
      }
      const appMetadata = options?.wrongGitHubAppId
        ? { id: 999999, slug: "unverified-app" }
        : options?.ambiguousGitHubAppMetadata
          ? { id: String(999999), slug: "unverified-app" }
          : null;
      const githubDeployment = {
        id: 42,
        sha: options?.wrongDeploymentSha ? "f".repeat(40) : expectedSha,
        ref: expectedSha,
        task: "deploy",
        environment: "Production",
        creator: deploymentCreator,
        performed_via_github_app: appMetadata,
      };
      const nonMatchingDeployment = {
        ...githubDeployment,
        id: 4000 + page,
        environment: "Preview",
      };

      if (options?.matchingDeploymentOnPageTwo) {
        return page === 1
          ? deploymentPage([], 2)
          : deploymentPage([githubDeployment]);
      }
      if (options?.nonMatchingFirstPage) {
        return page === 1
          ? deploymentPage([nonMatchingDeployment], 2)
          : deploymentPage([githubDeployment]);
      }
      if (options?.duplicateDeploymentAcrossPages) {
        return page === 1
          ? deploymentPage([githubDeployment], 2)
          : deploymentPage([{ ...githubDeployment, id: 43 }]);
      }
      if (
        options?.laterPageApiFailure ||
        options?.laterPageRateLimit
      ) {
        return deploymentPage([githubDeployment], 2);
      }
      if (options?.malformedPaginationLink) {
        return jsonResponse([githubDeployment], 200, { Link: "not-a-link" });
      }
      if (options?.paginationLoop) {
        return deploymentPage([githubDeployment], 1);
      }
      if (options?.disallowedPaginationOrigin) {
        return jsonResponse([githubDeployment], 200, {
          Link: `<https://example.invalid/repos/${repository}/deployments?sha=${expectedSha}&per_page=100&page=2>; rel="next"`,
        });
      }
      if (options?.disallowedPaginationPath) {
        return jsonResponse([githubDeployment], 200, {
          Link: `<https://api.github.com/repos/${repository}/issues?sha=${expectedSha}&per_page=100&page=2>; rel="next"`,
        });
      }
      if (options?.paginationConstraintTamper) {
        return jsonResponse([githubDeployment], 200, {
          Link: `<https://api.github.com/repos/${repository}/deployments?sha=${"f".repeat(40)}&per_page=100&page=2>; rel="next"`,
        });
      }
      if (options?.paginationLastWithoutNext) {
        return jsonResponse([githubDeployment], 200, {
          Link: `<https://api.github.com/repos/${repository}/deployments?sha=${expectedSha}&per_page=100&page=2>; rel="last"`,
        });
      }
      if (options?.truncatedDeploymentPage) {
        return deploymentPage([
          githubDeployment,
          ...Array.from({ length: 99 }, (_, index) => ({
            ...nonMatchingDeployment,
            id: 5000 + index,
          })),
        ]);
      }
      if (options?.completeOnPageNinetyNine) {
        return page < 99
          ? deploymentPage(
              page === 1 ? [githubDeployment] : [nonMatchingDeployment],
              page + 1,
            )
          : deploymentPage([nonMatchingDeployment]);
      }
      if (options?.exactBoundaryNaturalEof) {
        return page < 100
          ? deploymentPage(
              page === 1 ? [githubDeployment] : [nonMatchingDeployment],
              page + 1,
            )
          : deploymentPage([nonMatchingDeployment]);
      }
      if (options?.excessiveDeploymentPages) {
        return deploymentPage(
          page === 1 ? [githubDeployment] : [nonMatchingDeployment],
          page + 1,
        );
      }
      return deploymentPage(
        options?.ambiguousDeployment
          ? [githubDeployment, { ...githubDeployment, id: 43 }]
          : [githubDeployment],
      );
    }

    if (url.hostname === "api.github.com" && url.pathname.endsWith("/statuses")) {
      const statusCreator = options?.untrustedStatusCreator
        ? untrustedActor
        : options?.statusActorWrongId
          ? { ...trustedActor, id: trustedVercelActorId + 1 }
          : trustedActor;
      const statusAppMetadata = options?.wrongStatusGitHubAppId
        ? { id: 999999, slug: "unverified-app" }
        : null;
      return jsonResponse(
        deploymentSucceeded
          ? [
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
                creator: statusCreator,
                performed_via_github_app: statusAppMetadata,
              },
            ]
          : [
              {
                state: "failure",
                creator: trustedActor,
                performed_via_github_app: null,
              },
              {
                state: "success",
                environment_url: `https://${deploymentHost}`,
                creator: trustedActor,
                performed_via_github_app: null,
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
            repoId:
              options?.projectRepositoryIdMalformed
                ? String(repositoryId)
                : options?.projectRepositoryIdWrong ||
                    options?.bothVercelRepositoryIdsWrong
                ? repositoryId + 1
                : repositoryId,
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
                  repoId:
                    options?.deploymentRepositoryIdMalformed
                      ? String(repositoryId)
                      : options?.deploymentRepositoryIdWrong ||
                          options?.bothVercelRepositoryIdsWrong
                      ? repositoryId + 1
                      : repositoryId,
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

  return { fetch, productRequests, githubDeploymentPages };
}

function deploymentPage(body: unknown[], nextPage?: number) {
  return jsonResponse(body, 200, {
    ...(nextPage
      ? {
          Link: `<https://api.github.com/repos/${repository}/deployments?sha=${expectedSha}&per_page=100&page=${nextPage}>; rel="next"`,
        }
      : {}),
  });
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
  confirmationIncludesSha = true,
  verifyCurrentMain = false,
}: {
  source: string;
  confirmationPrefix: string;
  operationCommand: string;
  forbiddenCommand: RegExp;
  confirmationIncludesSha?: boolean;
  verifyCurrentMain?: boolean;
}) {
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(
    source,
    /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  );
  assert.match(source, /group:\s*production-database/);
  assert.match(source, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(source, /\[\[ "\$GITHUB_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
  const confirmation = confirmationIncludesSha
    ? `${confirmationPrefix} $GITHUB_SHA`
    : confirmationPrefix;
  assert.ok(source.includes(`test "$CONFIRMATION" = "${confirmation}"`));
  assert.match(source, /approved_sha=\$GITHUB_SHA/);
  assert.match(source, /needs:\s*authorize/);
  assert.match(source, /ref:\s*\$\{\{ needs\.authorize\.outputs\.approved_sha \}\}/);
  assert.match(source, /persist-credentials:\s*false/);
  assert.match(source, /environment:\s*Production/);
  assert.equal(source.match(/secrets\.DATABASE_URL/g)?.length, 1);

  if (verifyCurrentMain) {
    assert.match(source, /fetch-depth:\s*0/);
    assert.match(source, /git fetch --no-tags origin main/);
    assert.match(source, /git rev-parse origin\/main/);
    assert.match(source, /test "\$CHECKED_OUT_SHA" = "\$REMOTE_MAIN_SHA"/);
  }

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
  const invocation = extractWorkflowRunCommand(
    source,
    "Verify exact Vercel Production deployment",
  );
  assertProductionVerifierInvocation(invocation);
  assertInvalidProductionVerifierInvocations();
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

function extractWorkflowRunCommand(source: string, stepName: string) {
  const lines = source.split(/\r?\n/);
  const stepIndex = lines.findIndex(
    (line) => line.trim() === `- name: ${stepName}`,
  );
  assert.ok(stepIndex >= 0, `Workflow step is missing: ${stepName}.`);

  const nextStepOffset = lines
    .slice(stepIndex + 1)
    .findIndex((line) => /^\s*- name:\s/.test(line));
  const stepEnd =
    nextStepOffset === -1 ? lines.length : stepIndex + 1 + nextStepOffset;
  const runIndex = lines.findIndex(
    (line, index) =>
      index > stepIndex && index < stepEnd && /^\s+run:\s*>-\s*$/.test(line),
  );
  assert.ok(runIndex >= 0, `Folded run command is missing: ${stepName}.`);

  const runIndent = lines[runIndex]?.search(/\S/) ?? -1;
  const commandLines: string[] = [];
  for (const line of lines.slice(runIndex + 1, stepEnd)) {
    if (!line.trim()) {
      continue;
    }
    if (line.search(/\S/) <= runIndent) {
      break;
    }
    commandLines.push(line.trim());
  }
  assert.ok(commandLines.length > 0, `Run command is empty: ${stepName}.`);
  return commandLines.join(" ");
}

function assertProductionVerifierInvocation(command: string) {
  const tokens = tokenizeShellCommand(command);
  assert.equal(tokens.includes("--"), false);
  assert.deepEqual(tokens, [
    "pnpm",
    "verify:production-release",
    "--repository",
    "YigitMora/aegean-track-society",
    "--sha",
    "${{ needs.authorize.outputs.approved_sha }}",
  ]);
}

function assertInvalidProductionVerifierInvocations() {
  const expectedSuffix =
    '--repository "YigitMora/aegean-track-society" --sha "${{ needs.authorize.outputs.approved_sha }}"';
  const invalidCommands = [
    `pnpm verify:production-release -- ${expectedSuffix}`,
    'pnpm verify:production-release --sha "${{ needs.authorize.outputs.approved_sha }}"',
    `pnpm verify:production-release ${expectedSuffix} --repository "YigitMora/aegean-track-society"`,
    `pnpm verify-production-release ${expectedSuffix}`,
    `echo ok # pnpm verify:production-release ${expectedSuffix}`,
    `$VERIFY_COMMAND ${expectedSuffix}`,
    'pnpm verify:production-release --repositry "YigitMora/aegean-track-society" --sha "${{ needs.authorize.outputs.approved_sha }}"',
  ];

  for (const command of invalidCommands) {
    adversarialInvocationFixtureCount += 1;
    assert.throws(() => assertProductionVerifierInvocation(command));
  }
}

function tokenizeShellCommand(command: string) {
  const tokens: string[] = [];
  let token = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  const pushToken = () => {
    if (token) {
      tokens.push(token);
      token = "";
    }
  };

  for (const character of command) {
    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        token += character;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
    } else if (/\s/.test(character)) {
      pushToken();
    } else {
      token += character;
    }
  }

  assert.equal(escaped, false, "Workflow invocation has an incomplete escape.");
  assert.equal(quote, null, "Workflow invocation has an unclosed quote.");
  pushToken();
  return tokens;
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
