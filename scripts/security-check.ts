import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const forbidden = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe live secret', pattern: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: 'provider secret', pattern: /\bsk-[A-Za-z0-9_-]{32,}/ },
  {
    name: 'DeepSeek API key assignment',
    pattern:
      /DEEPSEEK_API_KEY\s*=\s*["']?(?!(?:replace|example|your|test|local|development)\b)[A-Za-z0-9_-]{20,}/i,
  },
];
const sensitiveName =
  /(?:^|[\\/])(?:\.env(?:\..+)?|id_(?:rsa|ed25519)|credentials\.json|secrets\.json)$|\.(?:pem|key|p12|pfx|jks|keystore|tfstate|dump)$/i;
const findings: string[] = [];

const { stdout: trackedOutput } = await execFileAsync('git', ['ls-files', '-z'], {
  encoding: 'buffer',
});
const tracked = trackedOutput.toString('utf8').split('\0').filter(Boolean);

for (const path of tracked) {
  if (path !== '.env.example' && sensitiveName.test(path)) {
    findings.push(`${path}: sensitive filename is tracked`);
  }
  const value = await readFile(path);
  if (value.includes(0)) continue;
  const text = value.toString('utf8');
  for (const { name, pattern } of forbidden) {
    if (pattern.test(text)) findings.push(`${path}: ${name} pattern`);
  }
}

const { stdout: history } = await execFileAsync(
  'git',
  ['log', '-p', '--all', '--no-color', '--no-ext-diff', '--', '.'],
  { maxBuffer: 64 * 1024 * 1024 },
);
for (const { name, pattern } of forbidden) {
  if (pattern.test(history)) findings.push(`git history: ${name} pattern`);
}

if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log(`security scan: ok (${tracked.length} tracked files and Git history)`);
