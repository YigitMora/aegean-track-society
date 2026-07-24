import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST } from "../src/app/admin/login/submit/route";

const routeSource = readFileSync(
  "src/app/admin/login/submit/route.ts",
  "utf8",
);
const sentinelEmail = "admin-log-sentinel@example.invalid";
const sentinelPassword = "not-a-real-admin-password";
const sentinelToken = "not-a-real-auth-token";
const sentinelCookie = "not-a-real-session-cookie";
const environmentNames = {
  email: ["ADMIN", "EMAIL"].join("_"),
  password: ["ADMIN", "PASSWORD"].join("_"),
  sessionSecret: ["ADMIN", "SESSION", "SECRET"].join("_"),
  debug: ["ADMIN", "LOGIN", "DEBUG"].join("_"),
} as const;
const originalEnvironment = Object.fromEntries(
  Object.values(environmentNames).map((name) => [name, process.env[name]]),
) as Record<string, string | undefined>;

void main().finally(() => {
  restoreEnvironment();
});

async function main() {
  validateSourceInvariants();

  process.env[environmentNames.email] = sentinelEmail;
  process.env[environmentNames.password] = sentinelPassword;
  process.env[environmentNames.sessionSecret] = "not-a-real-session-secret";
  process.env[environmentNames.debug] = "1";

  const invalidEmail = await captureErrors(() =>
    POST(loginRequest("another-admin@example.invalid", "wrong-password")),
  );
  const invalidPassword = await captureErrors(() =>
    POST(loginRequest(sentinelEmail, "wrong-password")),
  );

  assertInvalidCredentialsRedirect(invalidEmail.result);
  assertInvalidCredentialsRedirect(invalidPassword.result);
  assert.equal(
    invalidEmail.result.headers.get("location"),
    invalidPassword.result.headers.get("location"),
  );
  assert.deepEqual(invalidEmail.calls, []);
  assert.deepEqual(invalidPassword.calls, []);

  delete process.env[environmentNames.email];
  delete process.env[environmentNames.password];
  const missingConfiguration = await captureErrors(() =>
    POST(loginRequest(sentinelEmail, sentinelPassword)),
  );
  assertInvalidCredentialsRedirect(missingConfiguration.result);
  assert.deepEqual(missingConfiguration.calls, [
    ["ADMIN_LOGIN_CONFIGURATION_ERROR"],
  ]);

  process.env[environmentNames.email] = sentinelEmail;
  process.env[environmentNames.password] = sentinelPassword;
  const malformedRequest = await captureErrors(() =>
    POST(
      new Request("https://example.invalid/admin/login/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sentinelCookie,
          authorization: `Bearer ${sentinelToken}`,
        },
        body: '{"malformed":',
      }),
    ),
  );
  assertInvalidCredentialsRedirect(malformedRequest.result);
  assert.deepEqual(malformedRequest.calls, [["ADMIN_LOGIN_SUBMIT_ERROR"]]);

  const serializedLogs = JSON.stringify([
    ...invalidEmail.calls,
    ...invalidPassword.calls,
    ...missingConfiguration.calls,
    ...malformedRequest.calls,
  ]);
  for (const sentinel of [
    sentinelEmail,
    sentinelPassword,
    sentinelToken,
    sentinelCookie,
    "malformed",
  ]) {
    assert.doesNotMatch(serializedLogs, new RegExp(escapeRegExp(sentinel)));
  }
  assert.doesNotMatch(serializedLogs, /Error:|at POST|\.stack/);

  console.log("adminLoginDebugPresent=false");
  console.log("emailLogged=false");
  console.log("passwordLogged=false");
  console.log("rawErrorLogged=false");
  console.log("stackLogged=false");
  console.log("invalidLoginFailClosed=true");
}

function validateSourceInvariants() {
  assert.doesNotMatch(routeSource, /ADMIN_LOGIN_DEBUG/);
  assert.doesNotMatch(routeSource, /enteredNormalizedEmail|normalizedAdminEmail/);
  assert.doesNotMatch(routeSource, /emailsMatch|passwordMatch/);
  assert.doesNotMatch(routeSource, /errorName|errorMessage|stackFirstThreeLines/);
  assert.doesNotMatch(routeSource, /\.stack\b/);
  assert.doesNotMatch(routeSource, /console\.(?:log|info|warn)\(/);
  assert.match(
    routeSource,
    /console\.error\("ADMIN_LOGIN_CONFIGURATION_ERROR"\);/,
  );
  assert.match(routeSource, /console\.error\("ADMIN_LOGIN_SUBMIT_ERROR"\);/);
  assert.equal((routeSource.match(/console\.error\(/g) ?? []).length, 2);
  assert.doesNotMatch(routeSource, /console\.error\([^;]*,/);
  assert.match(routeSource, /verifyAdminCredentials\(email, password\)/);
  assert.match(routeSource, /createAdminSessionCookie\(normalizedEmail\)/);
  assert.match(routeSource, /status: 303/);
  assert.match(routeSource, /loginUrl\.searchParams\.set\("error", "1"\)/);
  assert.doesNotMatch(routeSource, /process\.env\.(?:DEBUG|ADMIN_LOGIN_DEBUG)/);
}

function loginRequest(email: string, password: string) {
  return new Request("https://example.invalid/admin/login/submit", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email,
      password,
      returnTo: "/admin",
    }),
  });
}

function assertInvalidCredentialsRedirect(response: Response) {
  assert.equal(response.status, 303);
  const location = response.headers.get("location");
  assert.ok(location);
  const redirect = new URL(location);
  assert.equal(redirect.pathname, "/admin/login");
  assert.equal(redirect.searchParams.get("error"), "1");
  assert.equal(redirect.searchParams.get("returnTo"), "/admin");
}

async function captureErrors<T>(operation: () => Promise<T>) {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];
  console.error = (...arguments_: unknown[]) => {
    calls.push(arguments_);
  };

  try {
    return {
      result: await operation(),
      calls,
    };
  } finally {
    console.error = originalConsoleError;
  }
}

function restoreEnvironment() {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
