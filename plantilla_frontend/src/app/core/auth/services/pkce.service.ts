import { Injectable } from '@angular/core';

/**
 * PKCE Service
 * Implementa Proof Key for Code Exchange (RFC 7636)
 * para flujos OAuth 2.0 seguros en aplicaciones públicas (SPA)
 */
@Injectable({
  providedIn: 'root'
})
export class PkceService {
  private readonly CODE_VERIFIER_KEY = 'pkce_code_verifier';
  private readonly STATE_KEY = 'pkce_state';
  private readonly NONCE_KEY = 'pkce_nonce';

  constructor() {}

  /**
   * Genera un string aleatorio seguro para code_verifier o state
   * @param length Longitud del string (43-128 para code_verifier según RFC 7636)
   */
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    
    return result;
  }

  /**
   * Genera el code_verifier (string aleatorio de 128 caracteres)
   */
  generateCodeVerifier(): string {
    return this.generateRandomString(128);
  }

  /**
   * Genera el code_challenge a partir del code_verifier usando SHA-256
   * @param codeVerifier El code verifier generado previamente
   */
  async generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Convertir el verifier a ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    // Calcular SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convertir a base64url
    return this.base64UrlEncode(hashBuffer);
  }

  /**
   * Convierte un ArrayBuffer a string base64url (sin padding)
   */
  private base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    // Convertir a base64 y luego a base64url
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Genera un state aleatorio para protección CSRF
   */
  generateState(): string {
    return this.generateRandomString(32);
  }

  /**
   * Almacena el code_verifier en sessionStorage
   */
  storeCodeVerifier(verifier: string): void {
    sessionStorage.setItem(this.CODE_VERIFIER_KEY, verifier);
  }

  /**
   * Recupera el code_verifier de sessionStorage
   */
  getCodeVerifier(): string | null {
    return sessionStorage.getItem(this.CODE_VERIFIER_KEY);
  }

  /**
   * Elimina el code_verifier de sessionStorage
   */
  clearCodeVerifier(): void {
    sessionStorage.removeItem(this.CODE_VERIFIER_KEY);
  }

  /**
   * Almacena el state en sessionStorage
   */
  storeState(state: string): void {
    sessionStorage.setItem(this.STATE_KEY, state);
  }

  /**
   * Recupera el state de sessionStorage
   */
  getState(): string | null {
    return sessionStorage.getItem(this.STATE_KEY);
  }

  /**
   * Elimina el state de sessionStorage
   */
  clearState(): void {
    sessionStorage.removeItem(this.STATE_KEY);
  }

  /**
   * Genera un nonce para protección de replay en id_token (OIDC)
   */
  generateNonce(): string {
    return this.generateRandomString(32);
  }

  storeNonce(nonce: string): void {
    sessionStorage.setItem(this.NONCE_KEY, nonce);
  }

  getNonce(): string | null {
    return sessionStorage.getItem(this.NONCE_KEY);
  }

  clearNonce(): void {
    sessionStorage.removeItem(this.NONCE_KEY);
  }

  /**
   * Limpia todos los datos PKCE almacenados
   */
  clearAll(): void {
    this.clearCodeVerifier();
    this.clearState();
    this.clearNonce();
  }

  /**
   * Compara dos strings en tiempo constante para evitar timing oracles.
   * Simula el comportamiento de crypto.timingSafeEqual() en el navegador
   * usando XOR byte a byte (Web Crypto API no expone timingSafeEqual).
   */
  private timingSafeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);
    // Si las longitudes difieren, comparar igual cantidad de bytes para
    // no revelar mediante tiempo si el prefijo coincide o no.
    const len = Math.max(aBytes.length, bBytes.length);
    const aPadded = new Uint8Array(len);
    const bPadded = new Uint8Array(len);
    aPadded.set(aBytes);
    bPadded.set(bBytes);
    let diff = aBytes.length ^ bBytes.length; // diferencia de longitud
    for (let i = 0; i < len; i++) {
      diff |= aPadded[i] ^ bPadded[i];
    }
    return diff === 0;
  }

  /**
   * Valida el state recibido contra el almacenado (protección CSRF).
   * Usa comparación en tiempo constante para prevenir timing oracles (BAJO-02).
   */
  validateState(receivedState: string): boolean {
    const storedState = this.getState();
    if (!storedState) return false;
    return this.timingSafeEqual(storedState, receivedState);
  }

  /**
   * Genera y almacena un nuevo code_verifier, retorna el code_challenge
   */
  async initiatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    this.storeCodeVerifier(codeVerifier);
    
    return {
      codeVerifier,
      codeChallenge
    };
  }
}
