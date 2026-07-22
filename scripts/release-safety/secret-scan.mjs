import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';

const maximumScannableBytes = 5 * 1024 * 1024;
const privateKeyPrefix = '-----BEGIN ';
const placeholderPattern =
  /(?:your|example|replace|change|placeholder|sandbox|use-a-|localhost|127\.0\.0\.1|\.\.\.|<|\$\{)/i;
const rules = [
  {
    id: 'private-key',
    pattern: new RegExp(`${privateKeyPrefix}(?:RSA |EC |OPENSSH )?PRIVATE KEY-----`),
  },
  {
    id: 'github-token',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  },
  {
    id: 'supabase-service-role',
    detect(text) {
      return hasNonPlaceholderAssignment(
        text,
        /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?([^\s"'#]{20,})/gi,
      );
    },
  },
  {
    id: 'database-credential',
    detect(text) {
      return hasNonPlaceholderAssignment(
        text,
        /(?:DATABASE_URL|DIRECT_URL)\s*[:=]\s*["']?(postgres(?:ql)?:\/\/[^\s"']+)/gi,
      );
    },
  },
  {
    id: 'vercel-access-token',
    detect(text) {
      return hasNonPlaceholderAssignment(
        text,
        /VERCEL_ACCESS_TOKEN\s*[:=]\s*["']?([^\s"'#]{20,})/gi,
      );
    },
  },
  {
    id: 'resend-api-key',
    pattern: /\bre_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    id: 'payment-credential',
    detect(text) {
      return hasNonPlaceholderAssignment(
        text,
        /(?:IYZICO|IYZIPAY)[A-Z0-9_]*(?:SECRET|API_KEY|KEY)\s*[:=]\s*["']?([^\s"'#]{12,})/gi,
      );
    },
  },
  {
    id: 'admin-credential',
    detect(text) {
      return hasNonPlaceholderAssignment(
        text,
        /(?:ADMIN_PASSWORD|ADMIN_SESSION_SECRET)\s*[:=]\s*["']?([^\s"'#]{16,})/gi,
      );
    },
  },
  {
    id: 'literal-bearer-token',
    pattern: /Authorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._-]{24,}["']/i,
  },
];

const base = readOption('--base') ?? 'origin/main';
runGit(['rev-parse', '--verify', `${base}^{commit}`]);
const changedPaths = readChangedPaths(base);
const files = new Set(
  runGit(['ls-files', '-z'])
    .split('\0')
    .filter(Boolean),
);
for (const file of runGit(['ls-files', '--others', '--exclude-standard', '-z'])
  .split('\0')
  .filter(Boolean)) {
  files.add(file);
  changedPaths.add(file);
}

const findings = [];
for (const file of files) {
  const stat = lstatSync(file);
  if (!stat.isFile()) {
    if (changedPaths.has(file)) {
      findings.push({ file, rule: 'non-regular-file-review-required' });
    }
    continue;
  }
  if (stat.size > maximumScannableBytes) {
    if (changedPaths.has(file)) {
      findings.push({ file, rule: 'oversized-file-review-required' });
    }
    continue;
  }

  const buffer = readFileSync(file);
  if (buffer.includes(0)) {
    if (changedPaths.has(file)) {
      findings.push({ file, rule: 'binary-file-review-required' });
    }
    continue;
  }

  const text = buffer.toString('utf8');
  for (const rule of rules) {
    if (rule.detect ? rule.detect(text) : rule.pattern.test(text)) {
      findings.push({ file, rule: rule.id });
    }
  }
}

if (findings.length > 0) {
  console.error('Secret-pattern scan failed. Matched values are intentionally hidden.');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.rule}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Secret-pattern scan passed (${files.size} repository files).`);
}

function hasNonPlaceholderAssignment(text, pattern) {
  return [...text.matchAll(pattern)].some(([, value]) => !placeholderPattern.test(value));
}

function readChangedPaths(comparisonBase) {
  const fields = runGit([
    'diff',
    '--name-status',
    '--find-renames',
    '-z',
    comparisonBase,
    '--',
  ]).split('\0');
  const paths = new Set();
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (!status) {
      break;
    }
    const firstPath = fields[index++];
    if (firstPath) {
      paths.add(firstPath);
    }
    if (status.startsWith('R') || status.startsWith('C')) {
      const secondPath = fields[index++];
      if (secondPath) {
        paths.add(secondPath);
      }
    }
  }
  return paths;
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runGit(arguments_) {
  return execFileSync('git', arguments_, { encoding: 'utf8' });
}
