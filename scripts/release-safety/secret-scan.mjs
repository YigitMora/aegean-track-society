import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';

const privateKeyPrefix = '-----BEGIN ';
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
    pattern:
      /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/i,
  },
  {
    id: 'database-credential',
    detect(text) {
      const matches = text.matchAll(
        /(?:DATABASE_URL|DIRECT_URL)\s*[:=]\s*["']?(postgres(?:ql)?:\/\/[^\s"']+)/gi,
      );
      return [...matches].some(
        ([, value]) =>
          !/(?:USER|PASSWORD|HOST|DATABASE|example|localhost|127\.0\.0\.1|\.\.\.|<|\$\{)/i.test(
            value,
          ),
      );
    },
  },
  {
    id: 'resend-api-key',
    pattern: /\bre_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    id: 'payment-secret',
    detect(text) {
      const matches = text.matchAll(
        /(?:IYZICO|IYZIPAY)[A-Z0-9_]*(?:SECRET|KEY)\s*[:=]\s*["']([^"']{12,})["']/gi,
      );
      return [...matches].some(
        ([, value]) => !/(?:your|example|replace|change|placeholder|<|\$\{)/i.test(value),
      );
    },
  },
  {
    id: 'literal-bearer-token',
    pattern: /Authorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._-]{24,}["']/i,
  },
];

const files = new Set(
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean),
);
for (const file of execFileSync(
  'git',
  ['ls-files', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean)) {
  files.add(file);
}

const findings = [];
for (const file of files) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 5 * 1024 * 1024) {
    continue;
  }

  const buffer = readFileSync(file);
  if (buffer.includes(0)) {
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
