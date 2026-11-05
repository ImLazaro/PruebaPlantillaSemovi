#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const skipInstall = args.includes('--skip-install');
const [targetArg, appNameArg] = args.filter((arg) => arg !== '--skip-install');

if (!targetArg || !appNameArg) {
  console.error('Uso: node tools/create-app.mjs <directorio-destino> <nombre-app> [--skip-install]');
  process.exit(1);
}

const appName = appNameArg.trim();
const projectName = appName
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (!projectName) {
  console.error('El nombre de la app debe contener al menos un carácter alfanumérico.');
  process.exit(1);
}

const targetRoot = path.resolve(process.cwd(), targetArg);
if (targetRoot === repoRoot || targetRoot.startsWith(`${repoRoot}${path.sep}`)) {
  console.error('El destino debe estar fuera del repositorio de la plantilla.');
  process.exit(1);
}

try {
  const existingEntries = await readdir(targetRoot);
  if (existingEntries.length > 0) {
    console.error(`El destino no está vacío: ${targetRoot}`);
    process.exit(1);
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await mkdir(targetRoot, { recursive: true });
}

const ignoredRoots = new Set(['.angular', '.git', 'dist', 'node_modules']);
await cp(repoRoot, targetRoot, {
  recursive: true,
  filter(source) {
    const relative = path.relative(repoRoot, source);
    const firstSegment = relative.split(path.sep)[0];
    return relative === '' || !ignoredRoots.has(firstSegment);
  },
});

const replaceInFile = async (relativePath, replacements) => {
  const filePath = path.join(targetRoot, relativePath);
  let content = await readFile(filePath, 'utf8');
  for (const [from, to] of replacements) content = content.split(from).join(to);
  await writeFile(filePath, content, 'utf8');
};

const generatedPackagePath = path.join(targetRoot, 'package.json');
const generatedPackage = JSON.parse(await readFile(generatedPackagePath, 'utf8'));
generatedPackage.name = projectName;
generatedPackage.private = true;
delete generatedPackage.bin;
delete generatedPackage.publishConfig;
delete generatedPackage.repository;
await writeFile(generatedPackagePath, `${JSON.stringify(generatedPackage, null, 2)}\n`, 'utf8');
await replaceInFile('angular.json', [
  ['frontend-template', projectName],
]);
await replaceInFile('Dockerfile', [
  ['dist/frontend-template', `dist/${projectName}`],
]);

console.log(`Aplicación creada en: ${targetRoot}`);
if (!skipInstall) {
  console.log('Instalando dependencias de la nueva aplicación...');
  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const hasLockfile = existsSync(path.join(targetRoot, 'pnpm-lock.yaml'));
  const installArgs = hasLockfile ? ['install', '--frozen-lockfile'] : ['install', '--no-frozen-lockfile'];
  const install = spawnSync(pnpmCommand, installArgs, {
    cwd: targetRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (install.error) {
    console.error(`No se pudo ejecutar pnpm: ${install.error.message}`);
    console.error(`La aplicación fue creada en ${targetRoot}; instala dependencias manualmente con pnpm install.`);
    process.exit(1);
  }

  if (install.status !== 0) {
    console.error(`La aplicación fue creada en ${targetRoot}, pero pnpm install terminó con código ${install.status}.`);
    process.exit(install.status ?? 1);
  }
}

console.log(`Nombre del proyecto: ${projectName}`);
console.log('Siguiente paso: cd al proyecto generado y ejecutar pnpm start:http');
