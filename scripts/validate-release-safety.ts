import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const scanner = resolve("scripts/release-safety/secret-scan.mjs");

runFixture("ordinary-text", ({ directory }) => {
  writeFileSync(resolve(directory, "safe.txt"), "ordinary repository text\n");
});

runFixture(
  "binary",
  ({ directory }) => {
    writeFileSync(resolve(directory, "new-binary.dat"), Buffer.from([0, 1, 2]));
  },
  "new-binary.dat: binary-file-review-required",
);

runFixture(
  "oversized",
  ({ directory }) => {
    writeFileSync(
      resolve(directory, "new-oversized.dat"),
      Buffer.alloc(5 * 1024 * 1024 + 1, 65),
    );
  },
  "new-oversized.dat: oversized-file-review-required",
);

const secretName = ["VERCEL", "ACCESS", "TOKEN"].join("_");
const fakeSecret = `fake_${"v".repeat(40)}`;
runFixture(
  "credential",
  ({ directory }) => {
    writeFileSync(
      resolve(directory, "credential.txt"),
      `${secretName}=${fakeSecret}\n`,
    );
  },
  "credential.txt: vercel-access-token",
  fakeSecret,
);

console.log("validate-release-safety passed (4 fixtures)");

function runFixture(
  name: string,
  mutate: (context: { directory: string }) => void,
  expectedFailure?: string,
  hiddenValue?: string,
) {
  const directory = mkdtempSync(`${tmpdir()}/ats-release-safety-${name}-`);
  try {
    runGit(directory, ["init", "--quiet"]);
    runGit(directory, ["config", "user.name", "Release Safety Test"]);
    runGit(directory, ["config", "user.email", "release-safety@example.invalid"]);
    writeFileSync(resolve(directory, "baseline.txt"), "baseline\n");
    runGit(directory, ["add", "baseline.txt"]);
    runGit(directory, ["commit", "--quiet", "-m", "baseline"]);
    mutate({ directory });

    let output = "";
    let failed = false;
    try {
      output = execFileSync(process.execPath, [scanner, "--base", "HEAD"], {
        cwd: directory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      failed = true;
      const result = error as { stdout?: string; stderr?: string };
      output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    }

    assert.equal(failed, Boolean(expectedFailure));
    if (expectedFailure) {
      assert.match(output, new RegExp(escapeRegExp(expectedFailure)));
    }
    if (hiddenValue) {
      assert.doesNotMatch(output, new RegExp(escapeRegExp(hiddenValue)));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function runGit(directory: string, arguments_: string[]) {
  execFileSync("git", arguments_, { cwd: directory, stdio: "ignore" });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
