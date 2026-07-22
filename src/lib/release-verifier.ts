import type { MobileApiContractManifest } from "@/lib/mobile-release-contract";

const releasePath = "/api/mobile/v1/release";

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GitHubDeployment = {
  id: number;
  sha: string;
  environment: string;
};

type GitHubDeploymentStatus = {
  state: string;
  environment_url?: string | null;
  target_url?: string | null;
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
  canonicalUrl: string;
  githubToken: string;
  expectedContract: MobileApiContractManifest;
  fetchImpl?: FetchLike;
};

export async function verifyProductionRelease({
  repository,
  expectedSha,
  canonicalUrl,
  githubToken,
  expectedContract,
  fetchImpl = fetch,
}: VerifyProductionReleaseOptions) {
  const normalizedSha = normalizeSha(expectedSha);
  const canonicalOrigin = normalizeHttpsOrigin(canonicalUrl);
  const deploymentUrl = await findSuccessfulProductionDeployment({
    repository,
    expectedSha: normalizedSha,
    githubToken,
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

async function findSuccessfulProductionDeployment({
  repository,
  expectedSha,
  githubToken,
  fetchImpl,
}: {
  repository: string;
  expectedSha: string;
  githubToken: string;
  fetchImpl: FetchLike;
}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new ReleaseVerificationError(
      "REPOSITORY_INVALID",
      "GitHub repository must use the owner/name format.",
    );
  }

  if (!githubToken.trim()) {
    throw new ReleaseVerificationError(
      "GITHUB_TOKEN_MISSING",
      "A read-only GitHub token is required for deployment verification.",
    );
  }

  const deploymentsUrl = new URL(
    `https://api.github.com/repos/${repository}/deployments`,
  );
  deploymentsUrl.searchParams.set("sha", expectedSha);
  deploymentsUrl.searchParams.set("per_page", "30");

  const deploymentsResponse = await fetchImpl(deploymentsUrl, {
    method: "GET",
    redirect: "manual",
    headers: githubHeaders(githubToken),
  });
  const deployments = await readGitHubJson<unknown>(
    deploymentsResponse,
    "DEPLOYMENTS_LOOKUP_FAILED",
  );

  if (!Array.isArray(deployments)) {
    throw new ReleaseVerificationError(
      "DEPLOYMENTS_RESPONSE_INVALID",
      "GitHub returned an invalid deployments response.",
    );
  }

  const candidates = deployments.filter(isGitHubDeployment).filter(
    (deployment) =>
      deployment.sha.toLowerCase() === expectedSha &&
      deployment.environment.toLowerCase() === "production",
  );

  for (const deployment of candidates) {
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

    if (!Array.isArray(statuses)) {
      continue;
    }

    const latestStatus = statuses.filter(isGitHubDeploymentStatus).at(0);
    const deploymentUrl =
      latestStatus?.state.toLowerCase() === "success"
      ? getVercelDeploymentUrl(latestStatus)
      : null;

    if (deploymentUrl) {
      return deploymentUrl;
    }
  }

  throw new ReleaseVerificationError(
    "PRODUCTION_DEPLOYMENT_NOT_VERIFIED",
    "No successful Production deployment matched the expected commit SHA.",
  );
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
  const detail = contract.contracts.garageDetail;
  const applications = contract.contracts.applications;

  return [
    {
      path: "/api/mobile/v1/me",
      responseHeaders: expectedHeaders(auth),
    },
    {
      path: "/api/mobile/v1/garage",
      requestHeaders: currentRequestHeader(garage),
      responseHeaders: {
        ...expectedHeaders(auth),
        ...expectedHeaders(garage),
      },
    },
    {
      path: "/api/mobile/v1/garage/release-verifier/build",
      requestHeaders: currentRequestHeader(detail),
      responseHeaders: {
        ...expectedHeaders(auth),
        ...expectedHeaders(detail),
      },
    },
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
    if (
      !actualEntry ||
      actualEntry.header !== expectedEntry.header ||
      !Array.isArray(actualEntry.supportedVersions) ||
      !expectedEntry.supportedVersions.every((version) =>
        actualEntry.supportedVersions.includes(version),
      )
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
    typeof deployment.environment === "string"
  );
}

function isGitHubDeploymentStatus(
  value: unknown,
): value is GitHubDeploymentStatus {
  if (!value || typeof value !== "object") {
    return false;
  }
  const status = value as Partial<GitHubDeploymentStatus>;
  return typeof status.state === "string";
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
