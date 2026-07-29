import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * A deletion request binds its Auth effect to the configured Supabase issuer.
 * This value contains no credential and remains stable across worker retries.
 */
export function getSupabaseAdminProviderIdentity() {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  try {
    return new URL(config.url).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function createSupabaseAdminClient() {
  const config = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!config || !serviceRoleKey) {
    return null;
  }

  return createClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}
