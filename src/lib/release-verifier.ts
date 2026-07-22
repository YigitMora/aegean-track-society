import type { MobileApiContractManifest } from "@/lib/mobile-release-contract";

const releasePath = "/api/mobile/v1/release";
const githubApiOrigin = "https://api.github.com";
const githubDeploymentsPerPage = 100;
const maximumGitHubDeploymentPages = 100;

export const expectedBackendRepository =
  "YigitMora/aegean-track-society";
export const expectedBackendRepositoryId = 1293619947;
export const trustedVercelActorId = 35613825;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GitHubDeployment = {
  id: number;
  sha: string;
  ref: string;
  task: string;
  environment: string;
  creator: GitHubActor;
  performed_via_github_app?: unknown;
};

type GitHubDeploymentStatus = {
  state: string;
  environment_url?: string | null;
  target_url?: string | null;
  creator: GitHubActor;
  performed_via_github_app?: unknown;
};

type GitHubActor = {
  id: number;
  login: string;
  type: string;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
};

type VercelProject = {
  id: string;
  accountId: string;
  name: string;
  link?: {
    type?: unknown;
    org?: unknown;
    repo?: unknown;
    repoId?: unknown;
    productionBranch?: unknown;
  } | null;
};

type VercelDeployment = {
  id: string;
  url: string;
  projectId: string;
  ownerId: string;
  target?: string | null;
  readyState: string;
  status?: string;
  aliasAssigned: boolean;
  alias?: unknown;
  gitSource?: {
    type?: unknown;
    org?: unknown;
    repo?: unknown;
    repoId?: unknown;
    ref?: unknown;
    sha?: unknown;
  } | null;
};

type VercelAlias = {
  alias: string;
  deploymentId: string | null;
  projectId: string | null;
};

type ReleaseManifest = MobileApiContractManifest & {
  backendCommitSha: string | null;
};

export class ReleaseVerificationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "ReleaseVerificationError";
  }
}

export type VerifyProductionReleaseOptions = {
  repository: string;
  expectedSha: string;
  githubToken: string;
  vercelAccessToken: string;
  vercelProjectId: string;
  vercelTeamId: string;
  expectedContract: MobileApiContractManifest;
  fetchImpl?: FetchLike;
};

export const canonicalBackendProductionOrigin =
  "https://www.aegeantracksociety.com";

export async function verifyProductionRelease({
  repository,
  expectedSha,
  githubToken,
  vercelAccessToken,
  vercelProjectId,
  vercelTeamId,
  expectedContract,
  fetchImpl = fetch,
}: VerifyProductionReleaseOptions) {
  const normalizedSha = normalizeSha(expectedSha);
  const canonicalOrigin = canonicalBackendProductionOrigin;
  const deploymentUrl = await findTrustedProductionDeployment({
    repository,
    expectedSha: normalizedSha,
    githubToken,
    vercelAccessToken,
    vercelProjectId,
    vercelTeamId,
    canonicalOrigin,
    fetchImpl,
  });

  const deploymentOrigin = normalizeHttpsOrigin(deploymentUrl);
  if (!new URL(deploymentOrigin).hostname.endsWith(".vercel.app")) {
    throw new ReleaseVerificationError(
      "DEPLOYMENT_URL_INVALID",
      "Production deployment does not expose a unique Vercel deployment URL.",
    );
  }

  await verifyReleaseManifest(
    fetchImpl,
    deploymentOrigin,
    normalizedSha,
    expectedContract,
  );
  await verifyReleaseManifest(
    fetchImpl,
    canonicalOrigin,
    normalizedSha,
    expectedContract,
  );

  const probes = buildUnauthenticatedProbes(expectedContract);
  for (const probe of probes) {
    await verifyUnauthenticatedProbe(fetchImpl, canonicalOrigin, probe);
  }

  return {
    expectedSha: normalizedSha,
    deploymentOrigin,
    canonicalOrigin,
    verifiedProbeCount: probes.length,
  };
}

async function findTrustedProductionDeployment({
  repository,
  expectedSha,
  githubToken,
  vercelAccessToken,
  vercelProjectId,
  vercelTeamId,
  canonicalOrigin,
  fetchImpl,
}: {
  repository: string;
  expectedSha: string;
  githubToken: string;
  vercelAccessToken: string;
  vercelProjectId: string;
  vercelTeamId: string;
  canonicalOrigin: string;
  fetchImpl: FetchLike;
}) {
  if (repository !== expectedBackendRepository) {
    throw new ReleaseVerificationError(
      "REPOSITORY_INVALID",
      "GitHub repository does not match the fixed backend repository.",
    );
  }

  if (!githubToken.trim()) {
    throw new ReleaseVerificationError(
      "GITHUB_TOKEN_MISSING",
      "A read-only GitHub token is required for deployment verification.",
    );
  }
  assertVercelConfiguration({
    vercelAccessToken,
    vercelProjectId,
    vercelTeamId,
  });

  const repositoryMetadata = await readGitHubJson<unknown>(
    await fetchImpl(
      new URL(`/repos/${expectedBackendRepository}`, githubApiOrigin),
      {
        method: "GET",
        redirect: "manual",
        headers: githubHeaders(githubToken),
      },
    ),
    "REPOSITORY_LOOKUP_FAILED",
  );
  if (!isExpectedGitHubRepository(repositoryMetadata)) {
    throw new ReleaseVerificationError(
      "GITHUB_REPOSITORY_PROVENANCE_MISMATCH",
      "GitHub repository metadata does not match the immutable backend repository identity.",
    );
  }

  const deploymentsUrl = new URL(
    `/repos/${repository}/deployments`,
    githubApiOrigin,
  );
  deploymentsUrl.searchParams.set("sha", expectedSha);
  deploymentsUrl.searchParams.set(
    "per_page",
    String(githubDeploymentsPerPage),
  );

  const deployments = await readAllGitHubDeployments({
    initialUrl: deploymentsUrl,
    repository,
    expectedSha,
    githubToken,
    fetchImpl,
  });
  if (!deployments.every(isGitHubDeployment)) {
    throw new ReleaseVerificationError(
      "DEPLOYMENTS_RESPONSE_INVALID",
      "GitHub returned malformed deployment metadata.",
    );
  }

  const matchingDeployments = deployments.filter(
    (deployment) =>
      deployment.sha.toLowerCase() === expectedSha &&
      deployment.ref.toLowerCase() === expectedSha &&
      deployment.task === "deploy" &&
      deployment.environment === "Production" &&
      hasTrustedVercelIntegrationIdentity(deployment),
  );

  if (matchingDeployments.length !== 1) {
    throw new ReleaseVerificationError(
      "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
      "Exactly one trusted Vercel Production deployment must match the expected commit SHA.",
    );
  }
  const [deployment] = matchingDeployments;

  const statusesResponse = await fetchImpl(
    `https://api.github.com/repos/${repository}/deployments/${deployment.id}/statuses?per_page=30`,
    {
      method: "GET",
      redirect: "manual",
      headers: githubHeaders(githubToken),
    },
  );
  const statuses = await readGitHubJson<unknown>(
    statusesResponse,
    "DEPLOYMENT_STATUS_LOOKUP_FAILED",
  );
  const latestStatus =
    Array.isArray(statuses) && isGitHubDeploymentStatus(statuses[0])
      ? statuses[0]
      : null;
  const deploymentUrl =
    latestStatus?.state === "success" &&
    hasTrustedVercelIntegrationIdentity(latestStatus)
      ? getVercelDeploymentUrl(latestStatus)
      : null;

  if (!deploymentUrl) {
    throw new ReleaseVerificationError(
      "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
      "The trusted Vercel deployment is not successful.",
    );
  }

  await verifyVercelProductionMetadata({
    deploymentUrl,
    repository,
    repositoryId: expectedBackendRepositoryId,
    expectedSha,
    canonicalOrigin,
    vercelAccessToken,
    vercelProjectId,
    vercelTeamId,
    fetchImpl,
  });

  return deploymentUrl;
}

async function verifyVercelProductionMetadata({
  deploymentUrl,
  repository,
  repositoryId,
  expectedSha,
  canonicalOrigin,
  vercelAccessToken,
  vercelProjectId,
  vercelTeamId,
  fetchImpl,
}: {
  deploymentUrl: string;
  repository: string;
  repositoryId: number;
  expectedSha: string;
  canonicalOrigin: string;
  vercelAccessToken: string;
  vercelProjectId: string;
  vercelTeamId: string;
  fetchImpl: FetchLike;
}) {
  const [expectedOwner, expectedRepository] = repository.split("/");
  const projectUrl = new URL(
    `/v9/projects/${encodeURIComponent(vercelProjectId)}`,
    "https://api.vercel.com",
  );
  projectUrl.searchParams.set("teamId", vercelTeamId);
  const project = await readVercelJson<VercelProject>(
    await fetchImpl(projectUrl, {
      method: "GET",
      redirect: "manual",
      headers: vercelHeaders(vercelAccessToken),
    }),
    "VERCEL_PROJECT_LOOKUP_FAILED",
  );

  if (
    project.id !== vercelProjectId ||
    project.accountId !== vercelTeamId ||
    !project.link ||
    !["github", "github-limited"].includes(String(project.link.type)) ||
    String(project.link.org).toLowerCase() !== expectedOwner?.toLowerCase() ||
    String(project.link.repo).toLowerCase() !==
      expectedRepository?.toLowerCase() ||
    project.link.productionBranch !== "main" ||
    project.link.repoId !== repositoryId
  ) {
    throw new ReleaseVerificationError(
      "VERCEL_PROJECT_PROVENANCE_MISMATCH",
      "Vercel project metadata does not match the expected GitHub repository and Production branch.",
    );
  }

  const deploymentHost = new URL(deploymentUrl).hostname;
  const deploymentApiUrl = new URL(
    `/v13/deployments/${encodeURIComponent(deploymentHost)}`,
    "https://api.vercel.com",
  );
  deploymentApiUrl.searchParams.set("teamId", vercelTeamId);
  deploymentApiUrl.searchParams.set("withGitRepoInfo", "true");
  const deployment = await readVercelJson<VercelDeployment>(
    await fetchImpl(deploymentApiUrl, {
      method: "GET",
      redirect: "manual",
      headers: vercelHeaders(vercelAccessToken),
    }),
    "VERCEL_DEPLOYMENT_LOOKUP_FAILED",
  );

  const gitSource = deployment.gitSource;
  const repositoryMatches =
    gitSource &&
    ["github", "github-limited"].includes(String(gitSource.type)) &&
    String(gitSource.org).toLowerCase() === expectedOwner?.toLowerCase() &&
    String(gitSource.repo).toLowerCase() ===
      expectedRepository?.toLowerCase() &&
    gitSource.repoId === repositoryId;

  if (
    deployment.projectId !== vercelProjectId ||
    deployment.ownerId !== vercelTeamId ||
    deployment.target !== "production" ||
    deployment.readyState !== "READY" ||
    (deployment.status !== undefined && deployment.status !== "READY") ||
    deployment.aliasAssigned !== true ||
    deployment.url.toLowerCase() !== deploymentHost.toLowerCase() ||
    !repositoryMatches ||
    String(gitSource?.sha).toLowerCase() !== expectedSha ||
    gitSource?.ref !== "main"
  ) {
    throw new ReleaseVerificationError(
      "VERCEL_DEPLOYMENT_PROVENANCE_MISMATCH",
      "Vercel deployment metadata does not prove the expected READY Production deployment.",
    );
  }

  const canonicalHost = new URL(canonicalOrigin).hostname;
  const aliasUrl = new URL(
    `/v4/aliases/${encodeURIComponent(canonicalHost)}`,
    "https://api.vercel.com",
  );
  aliasUrl.searchParams.set("teamId", vercelTeamId);
  aliasUrl.searchParams.set("projectId", vercelProjectId);
  const alias = await readVercelJson<VercelAlias>(
    await fetchImpl(aliasUrl, {
      method: "GET",
      redirect: "manual",
      headers: vercelHeaders(vercelAccessToken),
    }),
    "VERCEL_ALIAS_LOOKUP_FAILED",
  );

  if (
    alias.alias.toLowerCase() !== canonicalHost.toLowerCase() ||
    alias.projectId !== vercelProjectId ||
    alias.deploymentId !== deployment.id
  ) {
    throw new ReleaseVerificationError(
      "VERCEL_CANONICAL_ALIAS_MISMATCH",
      "The canonical production alias is not bound to the verified deployment.",
    );
  }
}

function assertVercelConfiguration({
  vercelAccessToken,
  vercelProjectId,
  vercelTeamId,
}: {
  vercelAccessToken: string;
  vercelProjectId: string;
  vercelTeamId: string;
}) {
  if (!vercelAccessToken.trim()) {
    throw new ReleaseVerificationError(
      "VERCEL_ACCESS_TOKEN_MISSING",
      "A read-only Vercel access token is required for deployment verification.",
    );
  }
  if (!/^prj_[A-Za-z0-9]+$/.test(vercelProjectId)) {
    throw new ReleaseVerificationError(
      "VERCEL_PROJECT_ID_INVALID",
      "The expected Vercel project identifier is missing or invalid.",
    );
  }
  if (!/^(?:team|user)_[A-Za-z0-9]+$/.test(vercelTeamId)) {
    throw new ReleaseVerificationError(
      "VERCEL_TEAM_ID_INVALID",
      "The expected Vercel team or account identifier is missing or invalid.",
    );
  }
}

async function verifyReleaseManifest(
  fetchImpl: FetchLike,
  origin: string,
  expectedSha: string,
  expectedContract: MobileApiContractManifest,
) {
  const response = await fetchImpl(new URL(releasePath, origin), {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "application/json",
    },
  });

  assertNoRedirect(response, "RELEASE_MANIFEST_REDIRECTED");
  if (response.status !== 200 || !isJsonResponse(response)) {
    throw new ReleaseVerificationError(
      "RELEASE_MANIFEST_UNAVAILABLE",
      "Release manifest did not return a successful JSON response.",
    );
  }
  assertNoStore(response);
  assertHeader(
    response,
    "X-ATS-Release-Contract",
    expectedContract.releaseContract,
    "RELEASE_CONTRACT_HEADER_MISMATCH",
  );

  const manifest = (await safeJson(response)) as Partial<ReleaseManifest>;
  if (manifest.backendCommitSha?.toLowerCase() !== expectedSha) {
    throw new ReleaseVerificationError(
      "DEPLOYED_SHA_MISMATCH",
      "Release manifest does not match the expected backend commit SHA.",
    );
  }

  assertCompatibleContract(manifest, expectedContract);
}

type UnauthenticatedProbe = {
  path: string;
  requestHeaders?: Record<string, string>;
  responseHeaders: Record<string, string>;
};

function buildUnauthenticatedProbes(
  contract: MobileApiContractManifest,
): UnauthenticatedProbe[] {
  const auth = contract.contracts.auth;
  const garage = contract.contracts.garageLifecycle;
  const applications = contract.contracts.applications;

  return [
    {
      path: "/api/mobile/v1/me",
      responseHeaders: expectedHeaders(auth),
    },
    ...garage.routes
      .filter((route) => route.method === "GET" && route.liveProbe)
      .map((route) => {
        const routeContracts = route.contracts.map(
          (name) => contract.contracts[name as keyof typeof contract.contracts],
        );
        return {
          path: route.path.replaceAll(
            /\{[A-Za-z][A-Za-z0-9]*\}/g,
            "release-verifier",
          ),
          requestHeaders: Object.assign(
            {},
            ...routeContracts.map(currentRequestHeader),
          ),
          responseHeaders: Object.assign(
            {},
            expectedHeaders(auth),
            ...routeContracts.map(expectedHeaders),
          ),
        };
      }),
    {
      path: "/api/mobile/v1/events",
      requestHeaders: currentRequestHeader(applications),
      responseHeaders: {
        ...expectedHeaders(auth),
        ...expectedHeaders(applications),
      },
    },
    {
      path: "/api/mobile/v1/applications",
      requestHeaders: currentRequestHeader(applications),
      responseHeaders: {
        ...expectedHeaders(auth),
        ...expectedHeaders(applications),
      },
    },
  ];
}

async function verifyUnauthenticatedProbe(
  fetchImpl: FetchLike,
  origin: string,
  probe: UnauthenticatedProbe,
) {
  const response = await fetchImpl(new URL(probe.path, origin), {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      ...probe.requestHeaders,
    },
  });

  assertNoRedirect(response, "AUTH_PROBE_REDIRECTED");
  if (response.status !== 401 || !isJsonResponse(response)) {
    throw new ReleaseVerificationError(
      "AUTH_PROBE_INVALID",
      `Unauthenticated probe failed for ${probe.path}.`,
    );
  }
  assertNoStore(response);

  const authentication = response.headers.get("WWW-Authenticate");
  if (!authentication || !/^Bearer(?:\s|$)/i.test(authentication)) {
    throw new ReleaseVerificationError(
      "BEARER_CHALLENGE_MISSING",
      `Bearer challenge is missing for ${probe.path}.`,
    );
  }

  for (const [header, value] of Object.entries(probe.responseHeaders)) {
    assertHeader(response, header, value, "CONTRACT_HEADER_MISMATCH");
  }

  const body = (await safeJson(response)) as {
    error?: { code?: unknown; message?: unknown };
  };
  if (
    typeof body.error?.code !== "string" ||
    !body.error.code.startsWith("MOBILE_AUTH_") ||
    typeof body.error.message !== "string"
  ) {
    throw new ReleaseVerificationError(
      "AUTH_ERROR_ENVELOPE_INVALID",
      `Authentication error envelope is invalid for ${probe.path}.`,
    );
  }
}

async function readAllGitHubDeployments({
  initialUrl,
  repository,
  expectedSha,
  githubToken,
  fetchImpl,
}: {
  initialUrl: URL;
  repository: string;
  expectedSha: string;
  githubToken: string;
  fetchImpl: FetchLike;
}) {
  const deployments: unknown[] = [];
  const visitedUrls = new Set<string>();
  let pageUrl: URL | null = initialUrl;
  let fetchedPages = 0;

  while (pageUrl) {
    if (
      fetchedPages >= maximumGitHubDeploymentPages ||
      visitedUrls.has(pageUrl.href)
    ) {
      throw new ReleaseVerificationError(
        "DEPLOYMENT_PAGINATION_INCOMPLETE",
        "GitHub deployment pagination could not be completed safely.",
      );
    }
    visitedUrls.add(pageUrl.href);
    fetchedPages += 1;

    const response = await fetchImpl(pageUrl, {
      method: "GET",
      redirect: "manual",
      headers: githubHeaders(githubToken),
    });
    const page = await readGitHubJson<unknown>(
      response,
      "DEPLOYMENTS_LOOKUP_FAILED",
    );
    if (
      !Array.isArray(page) ||
      page.length > githubDeploymentsPerPage
    ) {
      throw new ReleaseVerificationError(
        "DEPLOYMENTS_RESPONSE_INVALID",
        "GitHub returned an invalid deployments response.",
      );
    }
    if (fetchedPages >= maximumGitHubDeploymentPages) {
      throw new ReleaseVerificationError(
        "DEPLOYMENT_PAGINATION_INCOMPLETE",
        "GitHub deployment pagination reached the defensive page limit.",
      );
    }
    deployments.push(...page);

    const nextPageUrl = parseNextGitHubDeploymentPage({
      linkHeader: response.headers.get("Link"),
      currentUrl: pageUrl,
      repository,
      expectedSha,
    });
    if (!nextPageUrl && page.length === githubDeploymentsPerPage) {
      throw new ReleaseVerificationError(
        "DEPLOYMENT_PAGINATION_INCOMPLETE",
        "GitHub deployment enumeration may be truncated.",
      );
    }
    pageUrl = nextPageUrl;
  }

  return deployments;
}

function parseNextGitHubDeploymentPage({
  linkHeader,
  currentUrl,
  repository,
  expectedSha,
}: {
  linkHeader: string | null;
  currentUrl: URL;
  repository: string;
  expectedSha: string;
}) {
  if (linkHeader === null) {
    return null;
  }

  const links = parseGitHubLinkHeader(linkHeader);
  const nextValue = links.get("next");
  if (!nextValue) {
    if (links.has("last")) {
      throw invalidPagination();
    }
    return null;
  }

  let nextUrl: URL;
  try {
    nextUrl = new URL(nextValue);
  } catch {
    throw invalidPagination();
  }

  const expectedPath = `/repos/${repository}/deployments`;
  if (!nextValue.startsWith(`${githubApiOrigin}${expectedPath}?`)) {
    throw invalidPagination();
  }
  const allowedParameters = new Set(["sha", "per_page", "page"]);
  if (
    nextUrl.origin !== githubApiOrigin ||
    nextUrl.pathname !== expectedPath ||
    nextUrl.username ||
    nextUrl.password ||
    nextUrl.hash ||
    [...nextUrl.searchParams.keys()].some(
      (key) => !allowedParameters.has(key),
    ) ||
    nextUrl.searchParams.getAll("sha").length !== 1 ||
    nextUrl.searchParams.get("sha") !== expectedSha ||
    nextUrl.searchParams.getAll("per_page").length !== 1 ||
    nextUrl.searchParams.get("per_page") !==
      String(githubDeploymentsPerPage) ||
    nextUrl.searchParams.getAll("page").length !== 1
  ) {
    throw invalidPagination();
  }

  const currentPage = parseGitHubPageNumber(
    currentUrl.searchParams.get("page") ?? "1",
  );
  const nextPage = parseGitHubPageNumber(nextUrl.searchParams.get("page"));
  if (nextPage !== currentPage + 1) {
    throw invalidPagination();
  }

  return nextUrl;
}

function parseGitHubLinkHeader(value: string) {
  const links = new Map<string, string>();
  for (const part of splitGitHubLinkHeader(value)) {
    const match = part.match(/^\s*<([^<>]+)>\s*;\s*rel="([a-z]+)"\s*$/);
    if (!match) {
      throw invalidPagination();
    }
    const [, url, relation] = match;
    if (
      !url ||
      !relation ||
      !["first", "last", "next", "prev"].includes(relation) ||
      links.has(relation)
    ) {
      throw invalidPagination();
    }
    links.set(relation, url);
  }
  return links;
}

function splitGitHubLinkHeader(value: string) {
  const parts: string[] = [];
  let start = 0;
  let insideAngle = false;
  let insideQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "<" && !insideQuote) {
      if (insideAngle) {
        throw invalidPagination();
      }
      insideAngle = true;
    } else if (character === ">" && !insideQuote) {
      if (!insideAngle) {
        throw invalidPagination();
      }
      insideAngle = false;
    } else if (character === '"' && !insideAngle) {
      insideQuote = !insideQuote;
    } else if (character === "," && !insideAngle && !insideQuote) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  if (insideAngle || insideQuote) {
    throw invalidPagination();
  }
  parts.push(value.slice(start));
  if (parts.some((part) => !part.trim())) {
    throw invalidPagination();
  }
  return parts;
}

function parseGitHubPageNumber(value: string | null) {
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    throw invalidPagination();
  }
  const page = Number(value);
  if (!Number.isSafeInteger(page)) {
    throw invalidPagination();
  }
  return page;
}

function invalidPagination() {
  return new ReleaseVerificationError(
    "DEPLOYMENT_PAGINATION_INVALID",
    "GitHub deployment pagination metadata is invalid.",
  );
}

function assertCompatibleContract(
  manifest: Partial<ReleaseManifest>,
  expected: MobileApiContractManifest,
) {
  if (
    manifest.schemaVersion !== expected.schemaVersion ||
    manifest.releaseContract !== expected.releaseContract ||
    !manifest.contracts ||
    typeof manifest.contracts !== "object"
  ) {
    throw new ReleaseVerificationError(
      "RELEASE_CONTRACT_MISMATCH",
      "Release manifest schema does not match the repository contract.",
    );
  }

  for (const [name, expectedEntry] of Object.entries(expected.contracts)) {
    const actualEntry = manifest.contracts[name as keyof typeof manifest.contracts];
    const expectedRoutes =
      "routes" in expectedEntry ? expectedEntry.routes : undefined;
    const actualRoutes =
      actualEntry && "routes" in actualEntry ? actualEntry.routes : undefined;
    if (
      !actualEntry ||
      actualEntry.header !== expectedEntry.header ||
      !Array.isArray(actualEntry.supportedVersions) ||
      !expectedEntry.supportedVersions.every((version) =>
        actualEntry.supportedVersions.includes(version),
      ) ||
      (expectedRoutes !== undefined &&
        JSON.stringify(actualRoutes) !== JSON.stringify(expectedRoutes))
    ) {
      throw new ReleaseVerificationError(
        "RELEASE_CONTRACT_MISMATCH",
        `Release manifest is incompatible with ${name}.`,
      );
    }
  }
}

async function readGitHubJson<T>(response: Response, code: string): Promise<T> {
  assertNoRedirect(response, code);
  if (!response.ok || !isJsonResponse(response)) {
    throw new ReleaseVerificationError(
      code,
      "GitHub deployment metadata could not be verified.",
    );
  }

  return (await safeJson(response)) as T;
}

async function readVercelJson<T>(response: Response, code: string): Promise<T> {
  assertNoRedirect(response, code);
  if (!response.ok || !isJsonResponse(response)) {
    throw new ReleaseVerificationError(
      code,
      "Vercel deployment metadata could not be verified.",
    );
  }

  return (await safeJson(response)) as T;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new ReleaseVerificationError(
      "INVALID_JSON_RESPONSE",
      "A required endpoint returned invalid JSON.",
    );
  }
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function vercelHeaders(token: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function normalizeSha(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(normalized)) {
    throw new ReleaseVerificationError(
      "EXPECTED_SHA_INVALID",
      "Expected backend commit must be a full 40-character SHA.",
    );
  }
  return normalized;
}

function normalizeHttpsOrigin(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ReleaseVerificationError(
      "ORIGIN_INVALID",
      "Release verification origin is invalid.",
    );
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new ReleaseVerificationError(
      "ORIGIN_INVALID",
      "Release verification requires an HTTPS origin without credentials.",
    );
  }

  return url.origin;
}

function assertNoRedirect(response: Response, code: string) {
  if (
    (response.status >= 300 && response.status < 400) ||
    response.headers.has("Location")
  ) {
    throw new ReleaseVerificationError(
      code,
      "A release verification request was redirected.",
    );
  }
}

function assertNoStore(response: Response) {
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  if (!/(?:^|,)\s*no-store\s*(?:,|$)/i.test(cacheControl)) {
    throw new ReleaseVerificationError(
      "NO_STORE_MISSING",
      "A verified API response is missing Cache-Control: no-store.",
    );
  }
}

function assertHeader(
  response: Response,
  header: string,
  expected: string,
  code: string,
) {
  if (response.headers.get(header) !== expected) {
    throw new ReleaseVerificationError(
      code,
      `Required response header is invalid: ${header}.`,
    );
  }
}

function isJsonResponse(response: Response) {
  return /^application\/json(?:;|$)/i.test(
    response.headers.get("Content-Type") ?? "",
  );
}

function isGitHubDeployment(value: unknown): value is GitHubDeployment {
  if (!value || typeof value !== "object") {
    return false;
  }
  const deployment = value as Partial<GitHubDeployment>;
  return (
    Number.isInteger(deployment.id) &&
    typeof deployment.sha === "string" &&
    typeof deployment.ref === "string" &&
    typeof deployment.task === "string" &&
    typeof deployment.environment === "string" &&
    isGitHubActor(deployment.creator)
  );
}

function isExpectedGitHubRepository(
  value: unknown,
): value is GitHubRepository {
  if (!value || typeof value !== "object") {
    return false;
  }
  const repository = value as Partial<GitHubRepository>;
  return (
    repository.id === expectedBackendRepositoryId &&
    repository.name === "aegean-track-society" &&
    repository.full_name === expectedBackendRepository &&
    repository.owner?.login === "YigitMora"
  );
}

function isGitHubDeploymentStatus(
  value: unknown,
): value is GitHubDeploymentStatus {
  if (!value || typeof value !== "object") {
    return false;
  }
  const status = value as Partial<GitHubDeploymentStatus>;
  return typeof status.state === "string" && isGitHubActor(status.creator);
}

function isGitHubActor(value: unknown): value is GitHubActor {
  if (!value || typeof value !== "object") {
    return false;
  }
  const actor = value as Partial<GitHubActor>;
  return (
    Number.isSafeInteger(actor.id) &&
    typeof actor.login === "string" &&
    typeof actor.type === "string"
  );
}

function isTrustedVercelActor(actor: GitHubActor) {
  return (
    actor.id === trustedVercelActorId &&
    actor.login === "vercel[bot]" &&
    actor.type === "Bot"
  );
}

function hasTrustedVercelIntegrationIdentity(value: {
  creator: GitHubActor;
  performed_via_github_app?: unknown;
}) {
  // Live Vercel deployment metadata currently has no GitHub App identity.
  // Any future non-null App metadata must be independently reviewed first.
  return (
    isTrustedVercelActor(value.creator) &&
    (value.performed_via_github_app === undefined ||
      value.performed_via_github_app === null)
  );
}

function getVercelDeploymentUrl(status: GitHubDeploymentStatus) {
  for (const candidate of [status.environment_url, status.target_url]) {
    if (!candidate) {
      continue;
    }
    try {
      const url = new URL(candidate);
      if (
        url.protocol === "https:" &&
        url.hostname.endsWith(".vercel.app") &&
        !url.username &&
        !url.password
      ) {
        return url.origin;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function currentRequestHeader(entry: {
  header: string;
  supportedVersions: string[];
}) {
  return {
    [entry.header]: entry.supportedVersions.at(-1) ?? "",
  };
}

function expectedHeaders(entry: {
  header: string;
  supportedVersions: string[];
}) {
  return currentRequestHeader(entry);
}
