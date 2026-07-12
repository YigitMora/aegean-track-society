type ServerTimingLabel =
  | "AUTH_LOOKUP"
  | "EVENT_QUERY"
  | "ACCOUNT_SUMMARY_QUERY"
  | "GARAGE_QUERY"
  | "GARAGE_SIGNED_URLS"
  | "REGISTRATIONS_QUERY"
  | "ADMIN_DASHBOARD_QUERY"
  | "ADMIN_MEMBERS_QUERY";

export async function measureServerTiming<T>(
  label: ServerTimingLabel,
  operation: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return operation();
  }

  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    console.info("ATS_SERVER_TIMING", {
      label,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
}
