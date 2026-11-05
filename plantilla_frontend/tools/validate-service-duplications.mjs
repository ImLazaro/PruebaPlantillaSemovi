import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const CORE_DIR = path.join(root, 'src/app/core/services');
const SHARED_DIR = path.join(root, 'src/app/shared/lib/services');

const DUPLICATE_POLICY = {
  'base-api.service.ts': { canonical: 'core', adapter: 'shared' },
  'pkce.service.ts': { canonical: 'core', adapter: 'shared' },
  'app-config.service.ts': { canonical: 'core', adapter: 'shared' },
  'notification.service.ts': { canonical: 'shared', adapter: 'core' },
  'icon.service.ts': { canonical: 'shared', adapter: 'core' },
};

function listServiceFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.service.ts'))
    .map((entry) => entry.name);
}

function validateAdapter(filePath, canonicalTarget) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hasCanonicalImport = canonicalTarget === 'core'
    ? content.includes("from '@/app/core/services/")
    : content.includes("from '@/app/shared/lib/services/");

  const forbiddenImplementationTokens = [
    '@Injectable',
    'class ',
    'new HttpClient',
    'providedIn:',
  ];

  if (!hasCanonicalImport) {
    throw new Error(`Adapter ${filePath} no re-exporta desde el árbol canónico (${canonicalTarget}).`);
  }

  const hasForbidden = forbiddenImplementationTokens.some((token) => content.includes(token));
  if (hasForbidden) {
    throw new Error(`Adapter ${filePath} contiene implementación funcional; debe ser solo re-export temporal.`);
  }

  if (!content.includes('Adaptador temporal')) {
    throw new Error(`Adapter ${filePath} debe incluir comentario de adaptador temporal.`);
  }
}

const coreFiles = new Set(listServiceFiles(CORE_DIR));
const sharedFiles = new Set(listServiceFiles(SHARED_DIR));
const duplicates = [...coreFiles].filter((name) => sharedFiles.has(name)).sort();

const unknownDuplicates = duplicates.filter((name) => !(name in DUPLICATE_POLICY));
if (unknownDuplicates.length) {
  throw new Error(
    `Se detectaron duplicidades no permitidas: ${unknownDuplicates.join(', ')}. ` +
      'Define canonicalidad o elimina la duplicidad.'
  );
}

for (const [name, policy] of Object.entries(DUPLICATE_POLICY)) {
  if (!duplicates.includes(name)) {
    throw new Error(`Falta el par duplicado controlado para ${name}; revisar migración/adaptadores.`);
  }

  const adapterPath = policy.adapter === 'core'
    ? path.join(CORE_DIR, name)
    : path.join(SHARED_DIR, name);

  validateAdapter(adapterPath, policy.canonical);
}

console.log(`OK: ${duplicates.length} duplicidades controladas y sin coexistencia funcional.`);
