/**
 * validate-env.ts — Validación pre-build del entorno de producción
 * =====================================================================
 * Ejecutar en CI/CD ANTES de `ng build --configuration production`.
 * Sale con código 1 si alguna variable de entorno crítica contiene
 * un placeholder o valor inseguro.
 *
 * Uso (package.json):
 *   "prebuild:prod": "ts-node tools/validate-env.ts"
 *
 * Variables que sustituye el pipeline (ej. envsubst, GitHub Secrets,
 * docker --build-arg, Kubernetes ConfigMap):
 *   ANGULAR_OAUTH_CLIENT_ID     → oauth.clientId
 *   ANGULAR_AUTH_SERVER_URL     → ssoUrl / oauth.issuer (opcional override)
 *
 * =====================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Tipos ───────────────────────────────────────────────────────────────────────
interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function fail(name: string, detail: string): CheckResult {
  return { name, ok: false, detail };
}
function ok(name: string, detail = 'OK'): CheckResult {
  return { name, ok: true, detail };
}

// ── COMPROBACIONES ───────────────────────────────────────────────────────────────

const results: CheckResult[] = [];

// 1. environment.prod.ts debe existir
const envProdPath = path.resolve(__dirname, '../src/environments/environment.prod.ts');
if (!fs.existsSync(envProdPath)) {
  results.push(fail('environment.prod.ts', 'Archivo no encontrado'));
} else {
  const src = fs.readFileSync(envProdPath, 'utf8');

  // 2. clientId no puede ser el placeholder
  if (src.includes('PRODUCTION_CLIENT_ID_HERE')) {
    results.push(fail(
      'oauth.clientId',
      "Contiene el placeholder 'PRODUCTION_CLIENT_ID_HERE'. " +
      "Reemplazar vía variable de entorno ANGULAR_OAUTH_CLIENT_ID en el pipeline.",
    ));
  } else {
    results.push(ok('oauth.clientId', 'Placeholder no detectado'));
  }

  // 3. issuer debe ser HTTPS en producción
  const issuerMatch = src.match(/issuer:\s*['"`]([^'"`]+)['"`]/);
  if (issuerMatch) {
    const issuer = issuerMatch[1];
    if (!issuer.startsWith('https://')) {
      results.push(fail('oauth.issuer', `Debe usar HTTPS. Valor actual: ${issuer}`));
    } else {
      results.push(ok('oauth.issuer', issuer));
    }
  }

  // 4. redirectUri debe ser HTTPS
  const redirectMatch = src.match(/redirectUri:\s*['"`]([^'"`]+)['"`]/);
  if (redirectMatch) {
    const redirectUri = redirectMatch[1];
    if (!redirectUri.startsWith('https://')) {
      results.push(fail('oauth.redirectUri', `Debe usar HTTPS. Valor actual: ${redirectUri}`));
    } else {
      results.push(ok('oauth.redirectUri', redirectUri));
    }
  }

  // 5. dpop.enabled debe ser true en producción
  if (src.includes("enabled: false") && src.includes("dpop:")) {
    results.push(fail(
      'dpop.enabled',
      'DPoP está deshabilitado en producción. Establecer enabled: true en environment.prod.ts',
    ));
  } else {
    results.push(ok('dpop.enabled', 'true'));
  }

  // 6. No debe haber URLs de localhost en producción
  const localhostMatches = src.match(/localhost:\d+/g);
  if (localhostMatches) {
    results.push(fail(
      'URLs localhost',
      `Encontradas URLs de localhost en environment.prod.ts: ${localhostMatches.join(', ')}`,
    ));
  } else {
    results.push(ok('URLs localhost', 'No detectadas'));
  }
}

// 7. La SPA usa la raíz del gateway; los bounded contexts enrutan por path.
const apiSource = fs.existsSync(envProdPath) ? fs.readFileSync(envProdPath, 'utf8') : '';
const apiBaseMatch = apiSource.match(/const API_BASE_URL = ['"`]([^'"`]+)['"`]/);
if (apiBaseMatch) {
  try {
    const apiBase = new URL(apiBaseMatch[1]);
    const validPath = apiBase.pathname === '/' || apiBase.pathname === '';
    if (apiBase.protocol !== 'https:' || !validPath) {
      results.push(fail('apiUrl gateway', `Debe ser HTTPS sin prefijo /api. Valor actual: ${apiBaseMatch[1]}`));
    } else {
      results.push(ok('apiUrl gateway', apiBaseMatch[1]));
    }
  } catch {
    results.push(fail('apiUrl gateway', `URL inválida: ${apiBaseMatch[1]}`));
  }
} else {
  results.push(fail('apiUrl gateway', 'API_BASE_URL no encontrado'));
}

// 8. Si existe variable de entorno ANGULAR_OAUTH_CLIENT_ID, validarla
const clientIdFromEnv = process.env['ANGULAR_OAUTH_CLIENT_ID'];
if (clientIdFromEnv) {
  if (clientIdFromEnv.trim().length < 4) {
    results.push(fail('ANGULAR_OAUTH_CLIENT_ID', 'Valor demasiado corto'));
  } else {
    results.push(ok('ANGULAR_OAUTH_CLIENT_ID', `Presente (${clientIdFromEnv.length} chars)`));
  }
}

// ── REPORTE ──────────────────────────────────────────────────────────────────────
const LINE = '─'.repeat(60);
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  VALIDACIÓN PRE-BUILD — Frontend Angular Producción      ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
console.log(LINE);

const failures = results.filter(r => !r.ok);
const passes   = results.filter(r => r.ok);

for (const r of results) {
  const icon = r.ok ? '✅' : '❌';
  console.log(`  ${icon}  ${r.name.padEnd(30)} ${r.detail}`);
}

console.log(LINE);
console.log(`\n  Resultado: ${passes.length} pasaron, ${failures.length} fallaron\n`);

if (failures.length > 0) {
  console.error('FALLO: El build de producción fue bloqueado por las validaciones anteriores.');
  console.error('       Corrige los errores antes de ejecutar ng build --configuration production.\n');
  process.exit(1);
} else {
  console.log('✅  Todas las validaciones pasaron. Procediendo con el build de producción.\n');
}
