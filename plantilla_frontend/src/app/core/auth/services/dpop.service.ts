/**
 * =====================================================================
 * DPoP SERVICE — Demonstrating Proof of Possession (RFC 9449)
 * =====================================================================
 *
 * Genera y gestiona el par de claves P-256 (ECDSA) del cliente para
 * binding criptográfico de tokens (access_token + refresh_token).
 *
 * Flujo:
 *  1. Al inicio de sesión, genera un par de claves P-256 efímero
 *     usando la Web Crypto API nativa del browser.
 *  2. Por cada petición al token endpoint, genera un DPoP proof JWT
 *     firmado con la clave privada.
 *  3. El servidor vincula el token emitido al JWK público (jkt claim).
 *  4. En peticiones posteriores al Resource API, cada Authorization
 *     header Bearer debe acompañarse del DPoP proof correspondiente.
 *
 * Seguridad:
 *  - La clave privada es no exportable (CryptoKeyPair.privateKey — extractable: false).
 *  - Nunca sale de la memoria del browser.
 *  - El par de claves se destruye al hacer logout (clearKeys()).
 *  - Cada proof tiene JTI único + iat + htm + htu → previene replay.
 *
 * Habilitación:
 *  Controlada por environment.dpop.enabled. Si es false, todos los
 *  métodos devuelven null y el servicio es un no-op transparente.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9449
 */

import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

/** Par de claves en memoria — nunca se serializa la clave privada */
interface DPoPKeyPair {
  publicKey:  CryptoKey;       // exportable como JWK para incluir en el proof
  privateKey: CryptoKey;       // extractable: false — solo firma
  publicJwk:  JsonWebKey;      // JWK public pre-calculado para reutilización
  jkt:        string;          // SHA-256 thumbprint del JWK público (RFC 7638)
}

/** Objeto persistido en IndexedDB — las CryptoKey pueden almacenarse por structured clone */
interface PersistedDPoPKeyPair {
  publicKey:  CryptoKey;
  privateKey: CryptoKey;
  publicJwk:  JsonWebKey;
  jkt:        string;
}

@Injectable({ providedIn: 'root' })
export class DPoPService {
  private keyPair: DPoPKeyPair | null = null;

  // =====================================================================
  // IndexedDB — persistencia de claves entre recargas de página
  // La private key es non-extractable (no sale como bytes), pero el browser
  // permite almacenar CryptoKey en IndexedDB via structured clone (mismo origen).
  // =====================================================================
  private readonly DB_NAME = 'dpop_keystore';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'keys';
  private readonly KEY_ID = 'dpop_current';

  /** true si DPoP está habilitado en la configuración del entorno */
  get enabled(): boolean {
    return (environment as { dpop?: { enabled?: boolean } }).dpop?.enabled === true;
  }

  // =====================================================================
  // INICIALIZACIÓN
  // =====================================================================

  /**
   * Genera un par de claves ECDSA P-256.
   * Debe llamarse una sola vez al inicio del flujo de login.
   * Persiste las claves en IndexedDB para sobrevivir recargas de página.
   * Si DPoP está deshabilitado, es un no-op.
   */
  async generateKeys(): Promise<void> {
    if (!this.enabled) return;

    const algorithm: EcKeyGenParams = { name: 'ECDSA', namedCurve: 'P-256' };

    const raw = await crypto.subtle.generateKey(
      algorithm,
      false,       // privateKey NO exportable
      ['sign', 'verify'],
    );

    // Exportar solo la clave pública como JWK
    const publicJwk = await crypto.subtle.exportKey('jwk', raw.publicKey);
    // Eliminar campos no necesarios en el proof header
    delete publicJwk.key_ops;
    delete publicJwk.ext;

    const jkt = await this.computeJkt(publicJwk);

    this.keyPair = {
      publicKey:  raw.publicKey,
      privateKey: raw.privateKey,
      publicJwk,
      jkt,
    };

    // Persistir en IndexedDB para sobrevivir recargas (RFC 9449 §6.5 requiere
    // el mismo thumbprint en el refresh, que ocurre tras F5).
    await this.persistKeys();
  }

  /**
   * Carga las claves DPoP persistidas en IndexedDB.
   * Llamar antes del blind refresh en initializeAuth().
   * Retorna true si se restauraron claves válidas, false si no había ninguna.
   */
  async loadPersistedKeys(): Promise<boolean> {
    if (!this.enabled) return false;
    if (this.keyPair) return true; // ya hay claves en memoria
    try {
      const db = await this.openDb();
      const stored = await new Promise<PersistedDPoPKeyPair | undefined>((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const req = tx.objectStore(this.STORE_NAME).get(this.KEY_ID);
        req.onsuccess = () => resolve(req.result as PersistedDPoPKeyPair | undefined);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (stored?.privateKey && stored?.publicKey && stored?.publicJwk && stored?.jkt) {
        this.keyPair = stored;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Devuelve el JWK Thumbprint (jkt) de la clave pública actual.
   * El servidor de autorización almacena este valor en el token.
   * Retorna null si DPoP está deshabilitado o las claves no han sido generadas.
   */
  getJkt(): string | null {
    return this.enabled ? (this.keyPair?.jkt ?? null) : null;
  }

  /**
   * Limpia el par de claves de memoria e IndexedDB. Llamar en logout.
   */
  clearKeys(): void {
    this.keyPair = null;
    void this.deletePersistedKeys(); // fire-and-forget
  }

  // =====================================================================
  // GENERACIÓN DE PROOF JWT
  // =====================================================================

  /**
   * Genera un DPoP proof JWT para una petición HTTP específica.
   *
   * @param htm  Método HTTP en mayúsculas: 'POST', 'GET', etc.
   * @param htu  URL completa del endpoint (sin query string ni fragment).
   * @param ath  SHA-256 del access_token en base64url (solo para RS protegidos).
   *             Requerido en peticiones al Resource Server (RFC 9449 §4.2).
   *
   * @returns El proof JWT como string, o null si DPoP está deshabilitado.
   */
  async createProof(htm: string, htu: string, ath?: string): Promise<string | null> {
    if (!this.enabled) return null;

    // Auto-carga de claves desde IndexedDB si no están en memoria.
    // Esto ocurre en el callback OAuth (initializeAuth() retorna early y omite
    // loadPersistedKeys()), en refreshes y en cualquier petición DPoP tras F5.
    if (!this.keyPair) {
      await this.loadPersistedKeys();
    }

    if (!this.keyPair) return null;

    const header = {
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: this.keyPair.publicJwk,
    };

    const payload: Record<string, unknown> = {
      jti: this.generateJti(),
      htm: htm.toUpperCase(),
      htu: this.normalizeHtu(htu),
      iat: Math.floor(Date.now() / 1000),
    };

    if (ath) {
      payload['ath'] = ath;
    }

    return this.signJwt(header, payload);
  }

  /**
   * Genera un DPoP proof para el token endpoint.
   * Sin `ath` — el access_token todavía no existe en este punto.
   */
  async createTokenEndpointProof(tokenUrl: string): Promise<string | null> {
    return this.createProof('POST', tokenUrl);
  }

  /**
   * Genera un DPoP proof para una petición al Resource Server.
   * Incluye `ath` (hash del access_token) requerido por RFC 9449 §4.2.
   */
  async createResourceProof(
    method: string,
    url: string,
    accessToken: string,
  ): Promise<string | null> {
    if (!this.enabled || !this.keyPair) return null;
    const ath = await this.hashAccessToken(accessToken);
    return this.createProof(method, url, ath);
  }

  // =====================================================================
  // UTILIDADES PRIVADAS
  // =====================================================================

  /**
   * Firma un JWT con la clave privada ECDSA P-256.
   * El formato de firma ES256 es R || S (64 bytes) en base64url.
   */
  private async signJwt(
    header: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const headerB64  = this.base64urlEncode(JSON.stringify(header));
    const payloadB64 = this.base64urlEncode(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const data = new TextEncoder().encode(signingInput);
    const rawSig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.keyPair!.privateKey,
      data,
    );

    // Algunos runtimes devuelven ECDSA como P1363 (R||S) y otros como DER.
    // Probar ambas representaciones y elegir una firma verificable evita
    // proofs inválidos por diferencias de implementación del navegador.
    const sig = await this.normalizeEcdsaSignature(
      data,
      new Uint8Array(rawSig),
    );
    return `${signingInput}.${this.uint8ArrayToBase64url(sig)}`;
  }

  private async normalizeEcdsaSignature(
    signedData: Uint8Array,
    rawSig: Uint8Array,
  ): Promise<Uint8Array> {
    const candidates: Uint8Array[] = [];

    // Candidato 1: firma cruda tal cual (P1363 en muchos navegadores).
    candidates.push(rawSig);

    // Candidato 2: convertir DER -> P1363 cuando aplica.
    if (rawSig.length >= 8 && rawSig[0] === 0x30) {
      try {
        candidates.push(this.derToP1363(rawSig));
      } catch {
        // Ignorar si no era DER válido.
      }
    }

    for (const candidate of candidates) {
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        this.keyPair!.publicKey,
        candidate as unknown as BufferSource,
        signedData as unknown as BufferSource,
      );
      if (valid) return candidate;
    }

    throw new Error('No se pudo normalizar la firma ECDSA para DPoP');
  }

  /**
   * Convierte firma DER (ASN.1 SEQUENCE de dos INTEGERs) a formato P1363 (R||S).
   * Web Crypto API devuelve DER para ECDSA. JWT requiere P1363.
   */
  private derToP1363(der: Uint8Array): Uint8Array {
    // DER: 30 [len] 02 [rLen] [r...] 02 [sLen] [s...]
    let offset = 2;                           // saltar SEQUENCE tag + len
    const rLen = der[offset + 1];
    const rStart = offset + 2 + (der[offset + 2] === 0 ? 1 : 0); // strip leading zero
    const r = der.slice(rStart, offset + 2 + rLen);

    offset += 2 + rLen;
    const sLen = der[offset + 1];
    const sStart = offset + 2 + (der[offset + 2] === 0 ? 1 : 0);
    const s = der.slice(sStart, offset + 2 + sLen);

    // P-256: R y S son de 32 bytes cada uno
    const result = new Uint8Array(64);
    result.set(r.length <= 32 ? r : r.slice(r.length - 32), 32 - Math.min(r.length, 32));
    result.set(s.length <= 32 ? s : s.slice(s.length - 32), 64 - Math.min(s.length, 32));
    return result;
  }

  /**
   * Calcula el JWK Thumbprint (RFC 7638 §3) del JWK público.
   * Para EC P-256: SHA-256 de {"crv":"P-256","kty":"EC","x":"...","y":"..."} (campos ordenados).
   */
  private async computeJkt(jwk: JsonWebKey): Promise<string> {
    // RFC 7638 §3.2: solo los campos requeridos, ordenados lexicográficamente
    const canonical = JSON.stringify({
      crv: jwk.crv,
      kty: jwk.kty,
      x:   jwk.x,
      y:   jwk.y,
    });
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    return this.uint8ArrayToBase64url(new Uint8Array(hash));
  }

  /**
   * Calcula SHA-256 del access_token en base64url para el claim `ath`.
   * RFC 9449 §4.2: ath = BASE64URL(SHA-256(ASCII(access_token)))
   */
  private async hashAccessToken(accessToken: string): Promise<string> {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(accessToken),
    );
    return this.uint8ArrayToBase64url(new Uint8Array(hash));
  }

  /** JTI único de 128 bits en hex */
  private generateJti(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Normaliza la URL del endpoint para el claim `htu`.
   * RFC 9449 §4.1: sin query string ni fragment.
   */
  private normalizeHtu(url: string): string {
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname}`;
    } catch {
      return url;
    }
  }

  // =====================================================================
  // IndexedDB helpers
  // =====================================================================

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(this.STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async persistKeys(): Promise<void> {
    if (!this.keyPair) return;
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const req = tx.objectStore(this.STORE_NAME).put(this.keyPair, this.KEY_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {
      // Fallo silencioso — DPoP seguirá funcionando en esta sesión
    }
  }

  private async deletePersistedKeys(): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const req = tx.objectStore(this.STORE_NAME).delete(this.KEY_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {
      // Fallo silencioso
    }
  }

  private base64urlEncode(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private uint8ArrayToBase64url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
