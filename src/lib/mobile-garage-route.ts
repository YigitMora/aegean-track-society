import { MobileGarageError } from "@/lib/mobile-garage-contract";

export type MobileGarageRouteContext = {
  params: Promise<Record<string, string>>;
};

export async function readMobileGarageRouteId(
  context: MobileGarageRouteContext,
  field: string,
) {
  const params = await context.params;
  const value = params[field]?.trim();

  if (!value || value.length > 128) {
    throw new MobileGarageError("MOBILE_GARAGE_VEHICLE_NOT_FOUND");
  }

  return value;
}

export async function readMobileGarageJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new MobileGarageError("MOBILE_GARAGE_INVALID_BODY");
  }
}
