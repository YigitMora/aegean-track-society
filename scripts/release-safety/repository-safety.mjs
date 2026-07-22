import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const base = readOption('--base') ?? 'origin/main';
runGit(['rev-parse', '--verify', `${base}^{commit}`]);

const changedEntries = parseNameStatus(runGit(['diff', '--name-status', base, '--']));
const knownPaths = new Set(changedEntries.map((entry) => entry.path));
for (const path of runGit(['ls-files', '--others', '--exclude-standard']).split('\n')) {
  if (path && !knownPaths.has(path)) {
    changedEntries.push({ status: 'A', path });
  }
}

const failures = [];
const migrationChanges = changedEntries.filter((entry) =>
  entry.path.startsWith('prisma/migrations/'),
);
for (const entry of migrationChanges) {
  if (entry.status !== 'A') {
    failures.push(`Existing migration cannot be modified or removed: ${entry.path}`);
  }
}

if (
  changedEntries.some((entry) => entry.path === 'prisma/schema.prisma') &&
  !migrationChanges.some((entry) => entry.status === 'A')
) {
  failures.push('A Prisma schema change requires a new migration directory.');
}

const migrationWorkflow = read('.github/workflows/production-database.yml');
const seedWorkflow = read('.github/workflows/production-seed.yml');
const ciWorkflow = read('.github/workflows/ci.yml');

requireMatch(migrationWorkflow, /workflow_dispatch:/, 'Migration must be manual.');
requireNoMatch(
  migrationWorkflow,
  /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  'Migration workflow has an automatic trigger.',
);
requireMatch(migrationWorkflow, /environment:\s*Production/, 'Migration must use Production.');
requireMatch(migrationWorkflow, /group:\s*production-database/, 'Migration concurrency is missing.');
requireMatch(migrationWorkflow, /pnpm prisma:deploy/, 'Migration command is missing.');
requireNoMatch(migrationWorkflow, /prisma(?::seed|\s+db\s+seed)/, 'Migration must never seed.');

requireMatch(seedWorkflow, /workflow_dispatch:/, 'Seed must be manual.');
requireNoMatch(
  seedWorkflow,
  /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  'Seed workflow has an automatic trigger.',
);
requireMatch(seedWorkflow, /environment:\s*Production/, 'Seed must use Production.');
requireMatch(seedWorkflow, /group:\s*production-database/, 'Seed concurrency is missing.');
requireMatch(seedWorkflow, /SEED PRODUCTION/, 'Seed typed confirmation is missing.');
requireMatch(seedWorkflow, /pnpm prisma:seed/, 'Seed command is missing.');
requireNoMatch(seedWorkflow, /prisma(?::deploy|\s+migrate\s+deploy)/, 'Seed must never migrate.');

requireNoMatch(ciWorkflow, /DATABASE_URL|secrets\./, 'Ordinary CI must not receive secrets.');
requireNoMatch(
  ciWorkflow,
  /prisma(?::deploy|:seed|\s+migrate\s+deploy|\s+db\s+seed)/,
  'Ordinary CI must not run production database operations.',
);

const packageJson = JSON.parse(read('package.json'));
const buildCommand = String(packageJson.scripts?.build ?? '');
if (/prisma\s+(?:migrate\s+deploy|db\s+seed)|prisma:(?:deploy|seed)/.test(buildCommand)) {
  failures.push('The application build command must not migrate or seed production.');
}

if (!/^PAYMENT_MODE=["']?manual["']?$/m.test(read('.env.example'))) {
  failures.push('The documented default PAYMENT_MODE must remain manual.');
}

if (existsSync('vercel.json')) {
  requireNoMatch(
    read('vercel.json'),
    /prisma\s+(?:migrate\s+deploy|db\s+seed)|prisma:(?:deploy|seed)/,
    'Vercel configuration must not migrate or seed production.',
  );
}

if (failures.length > 0) {
  console.error('Repository safety validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Repository safety validation passed against ${base}.`);
}

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) {
    failures.push(message);
  }
}

function requireNoMatch(text, pattern, message) {
  if (pattern.test(text)) {
    failures.push(message);
  }
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runGit(arguments_) {
  return execFileSync('git', arguments_, { encoding: 'utf8' }).trim();
}

function parseNameStatus(value) {
  if (!value) {
    return [];
  }
  return value.split('\n').map((line) => {
    const [status, firstPath, secondPath] = line.split('\t');
    return { status: status[0], path: secondPath ?? firstPath };
  });
}
