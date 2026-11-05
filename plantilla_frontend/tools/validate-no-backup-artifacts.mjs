import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const sourceRoot = path.join(repoRoot, 'frontend/src');

const forbiddenPattern = /(?:\.|_)(backup|refactored|old)(?:\.|$)/i;
const violations = [];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (forbiddenPattern.test(entry.name)) {
      violations.push(path.relative(repoRoot, fullPath));
    }
  }
}

if (fs.existsSync(sourceRoot)) {
  walk(sourceRoot);
}

if (violations.length > 0) {
  console.error('❌ Se detectaron archivos de respaldo/refactor legacy en frontend/src:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('✅ Higiene de frontend/src validada: sin archivos *.backup*, *.refactored* o *.old*.');
