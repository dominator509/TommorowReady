import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['apps', 'packages'];
const forbidden = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk_live_[A-Za-z0-9]+/,
  /DEEPSEEK_API_KEY\s*=\s*\S+/,
];
const findings: string[] = [];
async function visit(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(entry.name)) await visit(full);
    } else if (entry.isFile()) {
      const value = await readFile(full, 'utf8');
      for (const pattern of forbidden)
        if (pattern.test(value)) findings.push(`${full}: forbidden secret pattern`);
    }
  }
}
for (const root of roots) await visit(root);
if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('security scan: ok');
