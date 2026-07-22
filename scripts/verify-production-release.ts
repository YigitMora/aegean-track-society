import { getMobileApiContractManifest } from "../src/lib/mobile-release-contract";
import {
  ReleaseVerificationError,
  verifyProductionRelease,
} from "../src/lib/release-verifier";

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await verifyProductionRelease({
    repository: options.repository,
    expectedSha: options.sha,
    canonicalUrl: options.canonicalUrl,
    githubToken: process.env.GITHUB_TOKEN ?? "",
    expectedContract: getMobileApiContractManifest(),
  });

  console.log(`Production deployment verified for ${result.expectedSha}.`);
  console.log(`Read-only API probes passed: ${result.verifiedProbeCount}.`);
}

function parseArguments(arguments_: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new ReleaseVerificationError(
        "ARGUMENTS_INVALID",
        "Release verifier arguments are incomplete.",
      );
    }
    values.set(key, value);
  }

  const repository = values.get("--repository");
  const sha = values.get("--sha");
  const canonicalUrl = values.get("--canonical-url");
  if (!repository || !sha || !canonicalUrl) {
    throw new ReleaseVerificationError(
      "ARGUMENTS_INVALID",
      "Repository, SHA and canonical URL are required.",
    );
  }

  return { repository, sha, canonicalUrl };
}

main().catch((error: unknown) => {
  const code =
    error instanceof ReleaseVerificationError
      ? error.code
      : "RELEASE_VERIFICATION_FAILED";
  console.error(`Production release verification failed (${code}).`);
  process.exitCode = 1;
});
