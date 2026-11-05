#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const minimumNode = [18, 13, 0];
const currentNode = process.versions.node.split('.').map(Number);
const hasMinimumNode = currentNode.some((part, index) => part !== minimumNode[index])
  ? currentNode[0] > minimumNode[0]
    || (currentNode[0] === minimumNode[0] && currentNode[1] >= minimumNode[1])
  : true;

const checks = [
  ['Node.js', hasMinimumNode, `Detectado ${process.versions.node}; se requiere >= 18.13.0`],
  ['package.json', existsSync('package.json'), 'Archivo encontrado'],
  ['pnpm-lock.yaml', existsSync('pnpm-lock.yaml'), 'Lockfile encontrado'],
  ['environment.ts', existsSync('src/environments/environment.ts'), 'Configuración local encontrada'],
  ['environment.prod.ts', existsSync('src/environments/environment.prod.ts'), 'Configuración productiva encontrada'],
  ['node_modules', existsSync('node_modules'), 'Dependencias instaladas'],
];

let failures = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}: ${detail}`);
  if (!ok) failures += 1;
}

if (existsSync('package.json')) {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const expectedManager = 'pnpm@10.33.4';
  const managerOk = packageJson.packageManager === expectedManager;
  console.log(`${managerOk ? '✅' : '⚠️'} packageManager: ${packageJson.packageManager ?? 'no definido'} (recomendado ${expectedManager})`);
}

if (failures > 0) {
  console.error(`\nDiagnóstico incompleto: ${failures} comprobación(es) requieren atención.`);
  process.exit(1);
}

console.log('\n✅ Entorno listo para trabajar.');
