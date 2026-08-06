import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['apps', 'packages', 'scripts', 'tests'];
const violations: string[] = [];
async function visit(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(entry.name)) await visit(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const text = await readFile(full, 'utf8');
      if (text.includes('\t')) violations.push(`${full}: tabs are forbidden`);
      if (/console\.log\((?:.*password|.*secret|.*token)/i.test(text))
        violations.push(`${full}: possible sensitive log`);
    }
  }
}
for (const root of roots) await visit(root);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('source lint: ok');
