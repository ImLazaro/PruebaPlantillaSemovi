#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(command, ['install', '--frozen-lockfile'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`No se pudo ejecutar pnpm: ${result.error.message}`);
  console.error('Instala pnpm 10.33.4 y vuelve a ejecutar: pnpm run setup');
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status ?? 1);

const doctor = spawnSync(process.execPath, ['tools/doctor.mjs'], { stdio: 'inherit' });
process.exit(doctor.status ?? 1);
