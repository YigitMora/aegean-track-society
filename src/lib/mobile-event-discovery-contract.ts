import { mobileJsonResponse } from "@/lib/mobile-auth";
import { mobileApplicationsErrorResponse } from "@/lib/mobile-applications-contract";

export const mobileEventDiscoveryContractHeader =
  "X-ATS-Event-Discovery-Contract";
export const mobileEventDiscoveryContractVersion = "event-discovery-v1";

export function mobileEventDiscoveryJsonResponse<TBody>(
  body: TBody,
  init: ResponseInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    mobileEventDiscoveryContractHeader,
    mobileEventDiscoveryContractVersion,
  );
  return mobileJsonResponse(body, { ...init, headers });
}

export function mobileEventDiscoveryErrorResponse(error: unknown) {
  const response = mobileApplicationsErrorResponse(error);
  response.headers.set(
    mobileEventDiscoveryContractHeader,
    mobileEventDiscoveryContractVersion,
  );
  return response;
}
