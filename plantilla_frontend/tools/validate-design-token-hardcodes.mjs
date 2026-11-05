#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const BASELINE_PATH = resolve(ROOT, 'tools/design-token-hardcodes-baseline.json');

const CONTENT_PATTERNS = [
  /(#[0-9a-fA-F]{3,8})/g,
  /(rgba?\([^\n\)]*\))/g,
  /(\b\d+(?:\.\d+)?px\b)/g,
  /\b(z-index\s*:\s*\d+)\b/g,
  /\b((?:padding|margin|gap|border-radius)\s*:\s*[^;\n]*\d+(?:\.\d+)?(?:px|rem))/g
];

const CRITICAL_TOKEN_RULES = [
  {
    name: 'spacing',
    pattern: /\b(?:padding|margin|gap)\s*:\s*([^;\n]+)/g,
    isAllowed: (value) => !/(?:\d+(?:\.\d+)?(?:px|rem))/.test(value) || /var\(--(?:space|spacing)-/.test(value)
  },
  {
    name: 'focus-ring',
    pattern: /\bbox-shadow\s*:\s*([^;\n]+)/g,
    isAllowed: (value) => !/0\s+0\s+0\s+\d/.test(value) || /var\(--focus-ring-/.test(value)
  },
  {
    name: 'z-index',
    pattern: /\bz-index\s*:\s*([^;\n]+)/g,
    isAllowed: (value) => !/^\s*\d+\s*$/.test(value) || /var\(--z-/.test(value)
  },
  {
    name: 'interactive-size',
    pattern: /(?:^|[{\s;])(?:min-height|min-width|height|width)\s*:\s*([^;\n]+)/gm,
    isAllowed: (value) => {
      const hasLiteral = /\d+(?:\.\d+)?(?:px|rem)/.test(value);
      return !hasLiteral || /var\(--(?:interactive-size|space)-/.test(value);
    }
  }
];

const CRITICAL_FILES = [
  'src/app/shared/components/buttons/institutional-button/institutional-button.component.css',
  'src/app/shared/components/modals/modal/modal.component.css'
];

function collectMatches(content) {
  const matches = [];
  for (const pattern of CONTENT_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      matches.push(match[1].trim());
    }
  }
  return [...new Set(matches)].sort();
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const violations = [];
const criticalViolations = [];

for (const [relativePath, allowedMatches] of Object.entries(baseline.files)) {
  const filePath = resolve(ROOT, relativePath);
  const content = readFileSync(filePath, 'utf8');
  const currentMatches = collectMatches(content);

  const extraMatches = currentMatches.filter((entry) => !allowedMatches.includes(entry));
  if (extraMatches.length > 0) {
    violations.push({ relativePath, extraMatches });
  }
}

for (const relativePath of CRITICAL_FILES) {
  const filePath = resolve(ROOT, relativePath);
  const content = readFileSync(filePath, 'utf8');

  for (const rule of CRITICAL_TOKEN_RULES) {
    for (const match of content.matchAll(rule.pattern)) {
      const value = match[1].trim();
      if (!rule.isAllowed(value)) {
        criticalViolations.push({ relativePath, rule: rule.name, value });
      }
    }
  }
}

if (violations.length > 0 || criticalViolations.length > 0) {
  console.error('❌ Se detectaron nuevos hardcodes fuera del baseline de tokens:');
  for (const violation of violations) {
    console.error(`\n- ${violation.relativePath}`);
    for (const item of violation.extraMatches) {
      console.error(`  • ${item}`);
    }
  }

  if (criticalViolations.length > 0) {
    console.error('\n❌ Se detectaron hardcodes críticos en componentes base:');
    for (const violation of criticalViolations) {
      console.error(`  • ${violation.relativePath} [${violation.rule}] => ${violation.value}`);
    }
  }

  process.exit(1);
}

console.log('✅ Validación de hardcodes de tokens: sin nuevos valores fuera de baseline.');
