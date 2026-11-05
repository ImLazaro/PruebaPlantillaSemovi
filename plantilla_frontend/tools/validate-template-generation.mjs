#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = path.join(root, 'tools', 'create-app.mjs');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'frontend-template-'));
const target = path.join(temporaryRoot, 'generated-app');

try {
  const result = spawnSync(process.execPath, [generator, target, 'Aplicación de Validación', '--skip-install'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'El generador terminó con error.');
  }

  const packageJson = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
  const angularJson = JSON.parse(await readFile(path.join(target, 'angular.json'), 'utf8'));
  const dockerfile = await readFile(path.join(target, 'Dockerfile'), 'utf8');
  const projectName = 'aplicacion-de-validacion';

  if (packageJson.name !== projectName) throw new Error('package.json no normalizó el nombre.');
  if (!angularJson.projects?.[projectName]) throw new Error('angular.json no contiene el proyecto generado.');
  if (!dockerfile.includes(`dist/${projectName}/browser`)) throw new Error('Dockerfile no actualizó la salida.');

  console.log('✅ Generación de plantilla validada.');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
