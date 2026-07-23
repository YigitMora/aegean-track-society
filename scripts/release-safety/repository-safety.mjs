import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const base = readOption('--base') ?? 'origin/main';
runGit(['rev-parse', '--verify', `${base}^{commit}`]);

const changedEntries = parseNameStatus(
  runGit(['diff', '--name-status', '--find-renames', '-z', base, '--']),
);
const knownPaths = new Set(changedEntries.map((entry) => entry.path));
for (const path of runGit([
  'ls-files',
  '--others',
  '--exclude-standard',
  '-z',
]).split('\0')) {
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

const addedMigrationFiles = new Set(
  migrationChanges
    .filter((entry) => entry.status === 'A')
    .map((entry) => entry.path),
);
for (const entry of migrationChanges.filter((entry) => entry.status === 'A')) {
  const directory = entry.path.match(
    /^(prisma\/migrations\/[^/]+)\/(?:[^/]+)$/,
  )?.[1];
  if (!directory || !addedMigrationFiles.has(`${directory}/migration.sql`)) {
    failures.push(
      `New migration content requires a newly added migration.sql: ${entry.path}`,
    );
  }
}

if (
  changedEntries.some((entry) => entry.path === 'prisma/schema.prisma') &&
  ![...addedMigrationFiles].some((path) => path.endsWith('/migration.sql'))
) {
  failures.push('A Prisma schema change requires a new migration directory.');
}

const migrationWorkflow = read('.github/workflows/production-database.yml');
const seedWorkflow = read('.github/workflows/production-seed.yml');
const eventSeedWorkflow = read('.github/workflows/production-event-seed.yml');
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

requireMatch(seedWorkflow, /workflow_dispatch:/, 'Catalog seed must be manual.');
requireNoMatch(
  seedWorkflow,
  /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  'Catalog seed workflow has an automatic trigger.',
);
requireMatch(seedWorkflow, /environment:\s*Production/, 'Catalog seed must use Production.');
requireMatch(seedWorkflow, /group:\s*production-database/, 'Catalog seed concurrency is missing.');
requireMatch(seedWorkflow, /test "\$CONFIRMATION" = "SEED PRODUCTION"/, 'Catalog seed confirmation is missing.');
requireMatch(seedWorkflow, /pnpm seed:catalog/, 'Catalog seed command is missing.');
requireMatch(seedWorkflow, /git rev-parse origin\/main/, 'Catalog seed must verify current main.');
requireNoMatch(seedWorkflow, /SEED_PACKAGE|event_slug|package_price|package_capacity/, 'Catalog seed must not accept event inputs.');
requireNoMatch(seedWorkflow, /prisma(?::deploy|\s+migrate\s+deploy)/, 'Catalog seed must never migrate.');

requireMatch(eventSeedWorkflow, /workflow_dispatch:/, 'Event seed must be manual.');
requireNoMatch(
  eventSeedWorkflow,
  /^\s{2}(?:push|pull_request|schedule|deployment_status|workflow_run):/m,
  'Event seed workflow has an automatic trigger.',
);
requireMatch(eventSeedWorkflow, /environment:\s*Production/, 'Event seed must use Production.');
requireMatch(eventSeedWorkflow, /group:\s*production-database/, 'Event seed concurrency is missing.');
requireMatch(eventSeedWorkflow, /test "\$CONFIRMATION" = "SEED EVENT PRODUCTION"/, 'Event seed confirmation is missing.');
requireMatch(eventSeedWorkflow, /event_slug:/, 'Event seed slug input is missing.');
requireMatch(eventSeedWorkflow, /package_price:/, 'Event seed price input is missing.');
requireMatch(eventSeedWorkflow, /package_capacity:/, 'Event seed capacity input is missing.');
requireMatch(eventSeedWorkflow, /pnpm seed:event/, 'Event seed command is missing.');
requireMatch(eventSeedWorkflow, /git rev-parse origin\/main/, 'Event seed must verify current main.');
requireNoMatch(eventSeedWorkflow, /pnpm seed:catalog/, 'Event seed must not run the catalog seed.');
requireNoMatch(eventSeedWorkflow, /prisma(?::deploy|\s+migrate\s+deploy)/, 'Event seed must never migrate.');

requireNoMatch(ciWorkflow, /DATABASE_URL|secrets\./, 'Ordinary CI must not receive secrets.');
requireNoMatch(
  ciWorkflow,
  /prisma(?::deploy|:seed|\s+migrate\s+deploy|\s+db\s+seed)/,
  'Ordinary CI must not run production database operations.',
);

const packageJson = JSON.parse(read('package.json'));
const buildCommand = String(packageJson.scripts?.build ?? '');
if (buildCommand !== 'prisma generate && next build') {
  failures.push('The application build command must remain exactly prisma generate && next build.');
}
if (packageJson.scripts?.['prisma:deploy'] !== 'prisma migrate deploy') {
  failures.push('The prisma:deploy script must remain exactly prisma migrate deploy.');
}
if (packageJson.scripts?.['prisma:seed'] !== 'prisma db seed') {
  failures.push('The prisma:seed script must remain exactly prisma db seed.');
}
if (packageJson.scripts?.['seed:catalog'] !== 'tsx prisma/seed.ts --scope=catalog') {
  failures.push('The catalog seed script must invoke only the catalog scope.');
}
if (packageJson.scripts?.['seed:event'] !== 'tsx prisma/seed.ts --scope=event') {
  failures.push('The event seed script must invoke only the event scope.');
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
  const fields = value.split('\0');
  const entries = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (!status) {
      break;
    }
    const firstPath = fields[index++];
    if (firstPath) {
      entries.push({ status: status[0], path: firstPath });
    }
    if (status.startsWith('R') || status.startsWith('C')) {
      const secondPath = fields[index++];
      if (secondPath) {
        entries.push({ status: status[0], path: secondPath });
      }
    }
  }
  return entries;
}
