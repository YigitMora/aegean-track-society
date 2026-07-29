import { getMobileApiContractManifest } from "../src/lib/mobile-release-contract";
import {
  ReleaseVerificationError,
  verifyProductionRelease,
} from "../src/lib/release-verifier";

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const commonOptions = {
    repository: options.repository,
    expectedSha: options.sha,
    githubToken: process.env.GITHUB_TOKEN ?? "",
    vercelAccessToken: process.env.VERCEL_ACCESS_TOKEN ?? "",
    vercelProjectId: process.env.VERCEL_PROJECT_ID ?? "",
    vercelTeamId: process.env.VERCEL_TEAM_ID ?? "",
    expectedContract: getMobileApiContractManifest(),
  };
  const result =
    options.mode === "staged"
      ? await verifyProductionRelease({
          ...commonOptions,
          mode: "staged",
          expectedCanonicalSha: options.expectedCanonicalSha!,
        })
      : await verifyProductionRelease({ ...commonOptions, mode: "promoted" });

  console.log(`${result.mode} deployment provenance verified for ${result.expectedSha}.`);
  if (result.mode === "promoted") {
    console.log(`Read-only API probes passed: ${result.verifiedProbeCount}.`);
  }
}

function parseArguments(arguments_: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (
      !key?.startsWith("--") ||
      !value ||
      !["--mode", "--repository", "--sha", "--expected-canonical-sha"].includes(
        key,
      ) ||
      values.has(key)
    ) {
      throw new ReleaseVerificationError(
        "ARGUMENTS_INVALID",
        "Release verifier arguments are incomplete.",
      );
    }
    values.set(key, value);
  }

  const mode = values.get("--mode");
  const repository = values.get("--repository");
  const sha = values.get("--sha");
  const expectedCanonicalSha = values.get("--expected-canonical-sha");
  if (!repository || !sha || (mode !== "staged" && mode !== "promoted")) {
    throw new ReleaseVerificationError(
      "ARGUMENTS_INVALID",
      "Mode, repository, and SHA are required.",
    );
  }

  if (mode === "staged" && !expectedCanonicalSha) {
    throw new ReleaseVerificationError(
      "ARGUMENTS_INVALID",
      "A staged verification requires the expected canonical Production SHA.",
    );
  }
  if (mode === "promoted" && expectedCanonicalSha) {
    throw new ReleaseVerificationError(
      "ARGUMENTS_INVALID",
      "A promoted verification must use only its exact target SHA.",
    );
  }

  if (mode === "staged") {
    return { mode, repository, sha, expectedCanonicalSha };
  }

  return { mode: "promoted" as const, repository, sha };
}

main().catch((error: unknown) => {
  const code =
    error instanceof ReleaseVerificationError
      ? error.code
      : "RELEASE_VERIFICATION_FAILED";
  console.error(`Production release verification failed (${code}).`);
  process.exitCode = 1;
});
