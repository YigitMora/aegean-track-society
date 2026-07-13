import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  getSupabasePublicConfig,
  requireSupabasePublicConfig,
} from "./config";

export async function createSupabaseServerClient() {
  const config = requireSupabasePublicConfig();

  return createServerSupabaseClient(config.url, config.publishableKey);
}

export async function createOptionalSupabaseServerClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createServerSupabaseClient(config.url, config.publishableKey);
}

export async function createOptionalSupabaseRouteHandlerClient(response: NextResponse) {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

async function createServerSupabaseClient(url: string, publishableKey: string) {
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies; middleware refreshes sessions.
        }
      },
    },
  });
}
