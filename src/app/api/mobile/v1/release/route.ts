import { mobileJsonResponse } from "@/lib/mobile-auth";
import {
  buildMobileReleaseManifest,
  getMobileApiContractManifest,
  mobileReleaseContractHeader,
} from "@/lib/mobile-release-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const contract = getMobileApiContractManifest();

  return mobileJsonResponse(
    buildMobileReleaseManifest(process.env.VERCEL_GIT_COMMIT_SHA),
    {
      headers: {
        [mobileReleaseContractHeader]: contract.releaseContract,
      },
    },
  );
}
