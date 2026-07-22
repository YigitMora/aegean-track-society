import mobileApiContract from "../../contracts/mobile-api-contract.json";

export const mobileReleaseContractHeader = "X-ATS-Release-Contract";

export type MobileApiContractManifest = typeof mobileApiContract;

export function getMobileApiContractManifest() {
  return mobileApiContract;
}

export function buildMobileReleaseManifest(commitSha: string | undefined) {
  const normalizedCommitSha = commitSha?.trim().toLowerCase();

  return {
    ...mobileApiContract,
    backendCommitSha:
      normalizedCommitSha && /^[0-9a-f]{40}$/.test(normalizedCommitSha)
        ? normalizedCommitSha
        : null,
  };
}
