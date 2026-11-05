/**
 * =====================================================================
 * OIDC AUTH SERVICE — OAuth 2.1 + PKCE Redirect Flow
 * =====================================================================
 *
 * Flujo de autenticación (RFC 6749 §4.1 / OAuth 2.1):
 * 1. initiateLoginRedirect() genera PKCE y redirige a Identity via
 *    GET /oauth/authorize?code_challenge=...&state=...
 * 2. Identity sirve su propio formulario HTML (Handlebars)
 * 3. Tras autenticación exitosa, Identity redirige a
 *    /auth/callback?code=...&state=...
 * 4. OAuthCallbackComponent llama a handleAuthCallback() que
 *    intercambia el code + code_verifier por tokens en /oauth/token
 * 5. Tokens en memoria + cache de usuario no sensible en sessionStorage
 *
 * Estrategia de persistencia:
 * - access_token y refresh_token: solo en memoria (no se persisten en storage)
 * - cache de usuario no sensible: sessionStorage con TTL corto
 *
 * Seguridad:
 * - PKCE S256 obligatorio (RFC 7636)
 * - Validación de state CSRF en cada callback
 * - Refresh token rotation con detección de reuso
 * - Angular nunca ve las credenciales del usuario
 * - Cliente público: sin cookies compartidas ni sesiones proxy
 *
 * @version 1.0.0
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, firstValueFrom, interval, Subscription, of } from 'rxjs';
import { map, catchError, tap, switchMap, finalize, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';

import { OidcUserDto } from '../../identity/models/dto/auth.dto';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/lib/services/notification.service';
import { PkceService } from './pkce.service';
import { DPoPService } from './dpop.service';

// =====================================================================
// INTERFACES
// =====================================================================

/** Respuesta del token endpoint del SSO */
interface OidcTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

/** Respuesta del userinfo endpoint */
interface UserInfoResponse {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  roles?: Array<{ id: string; key: string; name: string } | string>;
  permissions?: string[];
  permissionsByAudience?: Record<string, string[]>;
  rolesByAudience?: Record<string, Array<{ id: string; key: string; name: string }>>;
  effectivePermissions?: string[];
  effective_permissions?: string[];
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    is2faEnabled: boolean;
    lastLogin?: string;
    employeeId?: string;
  };
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    phone?: string;
    sexo?: 'hombre' | 'mujer';
    rfc?: string;
    curp?: string;
    nss?: string;
    nup?: string;
    nue?: string;
    birthDate?: string;
    hireDate?: string;
    employmentStatus: string;
    areaId: string;
    facilityId: string;
    positionId: string;
    scheduleTypeId: string;
  };
  area?: {
    id: string;
    name: string;
    description?: string;
    level?: number;
    parentAreaId?: string;
  };
  facility?: {
    id: string;
    name: string;
    code?: string;
    street?: string;
    municipality?: string;
    state?: string;
    postalCode?: string;
  };
  position?: {
    id: string;
    name: string;
    code?: string;
    level?: string;
  };
  scheduleType?: {
    id: string;
    name: string;
    code?: string;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultWorkDays?: string;
    allows247Access?: boolean;
    allowsFlexibleHours?: boolean;
  };
}

/** Estado de autenticación */
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: OidcUserDto | null;
  error: string | null;
}

/** Tokens almacenados */
interface StoredTokens {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  tokenType: string;
}

interface AuthCallbackResult {
  success: boolean;
  user?: OidcUserDto;
  message: string;
  oauthErrorCode?: string;
}

// =====================================================================
// SERVICIO PRINCIPAL
// =====================================================================

@Injectable({
  providedIn: 'root'
})
export class OidcAuthService implements OnDestroy {
  // =====================================================================
  // CONFIGURACIÓN
  // =====================================================================

  private readonly OAUTH_CONFIG = environment.oauth;
  private readonly NONCE_KEY = 'pkce_nonce';
  private readonly USER_CACHE_KEY = 'oidc_user_cache';
  /** Indicador no sensible: marca que el usuario inició sesión en este navegador.
   *  Solo sirve como señal para intentar un blind-refresh (cookie mode); no contiene tokens. */
  private readonly SESSION_INDICATOR_KEY = 'oidc_si';
  private readonly USER_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min TTL para cache de usuario
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutos antes de expiración
  private readonly DEVELOPMENT_ALLOWED_AUTHORIZE_ENDPOINTS = new Set([
    'https://localhost:3001/oauth/authorize',
    'https://localhost:3001/oauth/authorize',
  ]);
  private readonly SAFE_RETURN_PATHS = new Set([
    '/profile',
    '/change-password',
    '/dashboard',
  ]);

  // =====================================================================
  // ESTADO REACTIVO
  // =====================================================================

  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null
  });

  public readonly authState$ = this.authStateSubject.asObservable();
  public readonly isAuthenticated$ = this.authState$.pipe(map(state => state.isAuthenticated));
  public readonly currentUser$ = this.authState$.pipe(map(state => state.user));
  public readonly isLoading$ = this.authState$.pipe(map(state => state.isLoading));

  // Observable para prevenir doble-submit en login redirect (Rate Limiting UX)
  private readonly authInProgressSubject = new BehaviorSubject<boolean>(false);
  public readonly authInProgress$ = this.authInProgressSubject.asObservable();

  // =====================================================================
  // CONTROL INTERNO
  // =====================================================================

  private tokens: StoredTokens | null = null;
  private isRefreshing = false;
  private refreshInProgress$: Observable<OidcTokenResponse> | null = null;
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private sessionMonitorSubscription?: Subscription;
  private isLoggingIn = false; // Flag para prevenir doble-submit en login redirect
  private isHandlingSessionExpiry = false;

  // JWKS pinning (4.6): cache de claves públicas del servidor de autorización
  private jwksCache: { keys: Record<string, unknown>[]; fetchedAt: number } | null = null;
  private readonly JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — claves públicas, sin riesgo en cachear

  // =====================================================================
  // CONSTRUCTOR
  // =====================================================================

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly notificationService: NotificationService,
    private readonly pkceService: PkceService,
    private readonly dpopService: DPoPService,
  ) {
    if (environment.production && this.OAUTH_CONFIG.clientId === 'PRODUCTION_CLIENT_ID_HERE') {
      throw new Error(
        'FATAL: oauth.clientId no está configurado para producción. ' +
        'Reemplaza PRODUCTION_CLIENT_ID_HERE en environment.prod.ts durante el deploy.',
      );
    }
    this.initializeAuth();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  public terminateExpiredSession(error?: unknown): void {
    if (this.isHandlingSessionExpiry) {
      return;
    }
    this.isHandlingSessionExpiry = true;

    this.cleanup();
    this.clearSession();

    this.notificationService.warning(
      this.resolveSessionExpiryMessage(error),
      'Sesión Expirada'
    );

    void this.router.navigateByUrl('/', { replaceUrl: true });
  }

  private resolveSessionExpiryMessage(error?: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const errorBody = error.error as Record<string, unknown> | null;
      const oauthError = typeof errorBody?.['error'] === 'string' ? errorBody['error'] : '';
      const description = typeof errorBody?.['error_description'] === 'string'
        ? errorBody['error_description']
        : typeof errorBody?.['message'] === 'string'
          ? errorBody['message']
          : '';

      if (oauthError === 'invalid_grant' && /timeout por inactividad/i.test(description)) {
        return 'Tu sesión expiró por inactividad. Inicia sesión nuevamente.';
      }

      if (
        oauthError === 'invalid_grant' &&
        /(timeout absoluto|revocad|expirad|reuse|reutilizaci|sesión expirada)/i.test(description)
      ) {
        return 'Tu sesión expiró o ya no es válida. Inicia sesión nuevamente.';
      }
    }

    return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
  }

  // =====================================================================
  // INICIALIZACIÓN
  // =====================================================================

  /**
   * Inicia el flujo OAuth 2.1 Authorization Code + PKCE.
   * Estrategia única: siempre redirect a /authorize con state y nonce.
   * 
   * Rate Limiting UX: Previene múltiples llamadas concurrentes (doble-click protection).
   */
  async initiateLoginRedirect(returnUrl = '/dashboard'): Promise<void> {
    // Prevenir doble-submit (Rate Limiting UX)
    if (this.isLoggingIn) {
      console.warn('[OidcAuthService] Login redirect ya en progreso, ignorando solicitud duplicada');
      return;
    }

    if (!environment.production && !this.DEVELOPMENT_ALLOWED_AUTHORIZE_ENDPOINTS.has(this.OAUTH_CONFIG.endpoints.authorize)) {
      throw new Error(
        `Configuración OAuth inválida en desarrollo: authorize debe ser uno de ${Array.from(this.DEVELOPMENT_ALLOWED_AUTHORIZE_ENDPOINTS).join(', ')}`,
      );
    }

    // Marcar como en progreso
    this.isLoggingIn = true;
    this.authInProgressSubject.next(true);

    try {
      const safeReturnUrl = this.sanitizeReturnUrl(returnUrl);

      const { codeChallenge } = await this.pkceService.initiatePKCE();
      const state = this.pkceService.generateState();
      const nonce = this.generateNonce();

      // DPoP (RFC 9449): generar par de claves efímero antes del flujo de login.
      // Si DPoP está deshabilitado en environment, es un no-op transparente.
      await this.dpopService.generateKeys();

      this.pkceService.storeState(state);
      sessionStorage.setItem(this.NONCE_KEY, nonce);
      sessionStorage.setItem('pkce_return_url', safeReturnUrl);

      const authParams: Record<string, string> = {
        response_type: 'code',
        client_id: this.OAUTH_CONFIG.clientId,
        redirect_uri: this.OAUTH_CONFIG.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
        scope: this.OAUTH_CONFIG.scopes.join(' ')
      };

      const configuredAudience = String(this.OAUTH_CONFIG['audience'] ?? '').trim();
      if (configuredAudience) {
        authParams['audience'] = configuredAudience;
      }

      if (!this.OAUTH_CONFIG.endpoints.par) {
        throw new Error('Configuración OAuth inválida: falta el endpoint PAR.');
      }

      // PAR requerido por el servidor (sin fallback a authorize directo).
      const parBody = new HttpParams({ fromObject: authParams });
      const parHeaders = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
      const parResponse = await firstValueFrom(
        this.http.post<{ request_uri: string; expires_in: number }>(
          this.OAUTH_CONFIG.endpoints.par,
          parBody.toString(),
          { headers: parHeaders, withCredentials: true }
        )
      );

      // Redirigir con client_id + request_uri (RFC 9126 §4).
      // Se agrega audience como respaldo defensivo para preservar compatibilidad
      // en despliegues mixtos donde PAR pudiera omitir parámetros opcionales.
      const audienceQuery = configuredAudience
        ? `&audience=${encodeURIComponent(configuredAudience)}`
        : '';
      // Nota: isLoggingIn se reseteará al recargar la página después del redirect
      window.location.href =
        `${this.OAUTH_CONFIG.endpoints.authorize}` +
        `?client_id=${encodeURIComponent(this.OAUTH_CONFIG.clientId)}` +
        `&request_uri=${encodeURIComponent(parResponse.request_uri)}` +
        audienceQuery;
      return;
    } catch (error) {
      // Si PAR falla, permitir reintentos (evita bloqueo por doble-submit permanente).
      this.isLoggingIn = false;
      this.authInProgressSubject.next(false);

      if (error instanceof HttpErrorResponse && error.status === 0) {
        this.notificationService.error(
          'Error de autenticación',
          'No fue posible contactar el servidor de autenticación (PAR). Verifica certificado SSL, CORS y conectividad.',
        );
      }

      throw error;
    }
  }

  /**
   * Inicializa la autenticación al cargar la app
   * 
   * Estrategia OAuth 2.1 Opción B:
   * 1. access_token solo en memoria.
   * 2. refresh_token vive en cookie HttpOnly (`__Host-refresh_token`) emitida
   *    por el backend; JavaScript jamás la lee.
   * 3. Al recargar la página intentamos un refresh ciego: el navegador
   *    enviará la cookie automáticamente. Si falla → sesión no autenticada.
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Durante el callback OAuth, primero debe consumirse el authorization code.
      // Evitamos un refresh ciego prematuro que genera invalid_request (sin refresh token/cookie aún vigente).
      if (this.isOAuthCallbackInProgress()) {
        this.updateState({ isAuthenticated: false, user: null, isLoading: false, error: null });
        return;
      }

      // Mostrar usuario cacheado optimista mientras se valida la sesión contra
      // el servidor (mejora UX evitando flash de "no autenticado" en recargas).
      const cachedUser = this.loadCachedUser();
      if (cachedUser) {
        this.updateState({ isAuthenticated: true, user: cachedUser, isLoading: true, error: null });
      }

      // Remove the legacy key defensively. Refresh tokens must never be
      // persisted in browser storage, even while navigating account actions.
      sessionStorage.removeItem('oidc_rt');

      // Restaurar claves DPoP de IndexedDB antes del refresh ciego.
      // Si el token family es DPoP-bound (dpopJkt en DB), el servidor exige el
      // mismo thumbprint; sin las claves persistidas el refresh fallaría con 400.
      await this.dpopService.loadPersistedKeys();

      // Optimización: si no hay refresh_token en memoria (ni restaurado desde
      // sessionStorage) pero sí indicador de sesión previa, saltamos el blind-
      // refresh (que fallaría con 400 porque la cookie HttpOnly no es accesible
      // en XHR cross-origin) e iniciamos directo el flujo SSO silent-auth, que
      // sí puede enviar __Host-sso_session al ser navegación top-level.
      if (!this.tokens?.refreshToken && localStorage.getItem(this.SESSION_INDICATOR_KEY) === '1') {
        await this.initiateSilentAuth();
        return;
      }

      // Intentar refresh ciego — si hay cookie de refresh, el backend la honrará.
      try {
        // En recarga inicial (F5) forzamos un blind-refresh aunque no exista
        // indicador local, porque la cookie HttpOnly puede seguir activa.
        await firstValueFrom(this.refreshTokens({ allowBlindAttempt: true }));
        // Pasar el access token en memoria (modo body) o undefined (modo cookie,
        // fetchUserInfo lo leerá de la cookie HttpOnly con withCredentials).
        await this.fetchUserInfo(this.tokens?.accessToken);
        this.startSessionMonitoring();
        return;
      } catch {
        // Sin cookie válida o refresh rechazado → intentar SSO silent-auth si
        // hay indicador de sesión activa (set por storeTokens tras login previo).
        this.tokens = null;
      }

      // Si existe indicador de sesión previa, intentar recuperar via SSO silent-auth
      // (prompt=none): el navigate top-level envía la cookie __Host-sso_session al
      // Identity genera un nuevo código sin mostrar el formulario de login.
      if (localStorage.getItem(this.SESSION_INDICATOR_KEY) === '1') {
        await this.initiateSilentAuth();
        return; // la navegación se encarga de actualizar el estado
      }

      this.updateState({ isAuthenticated: false, user: null, isLoading: false, error: null });
    } catch {
      this.clearTokensFromStorage();
      this.updateState({ isAuthenticated: false, user: null, isLoading: false, error: null });
    }
  }

  /**
   * Silent-auth via prompt=none (RFC 9001 §3.1.2.1).
   * Redirige a Identity con prompt=none a través de PAR; si la cookie
   * __Host-sso_session sigue activa, el servidor devuelve un código de
   * autorización sin interacción del usuario. Si no hay sesión SSO válida,
   * el servidor redirigirá con error=login_required y el callback hará un
   * login interactivo normal.
   */
  async initiateSilentAuth(): Promise<void> {
    try {
      // Fix 4: Asegurar claves DPoP antes del redirect para que el callback
      // pueda generar el proof en el token exchange (RFC 9449 §5).
      // Si clearSession() las borró previamente, generamos nuevas aquí
      // para romper el loop: clearSession → initiateSilentAuth sin keys
      // → callback 401 DPoP → error → loop.
      if (this.dpopService.enabled) {
        if (!(await this.dpopService.loadPersistedKeys())) {
          await this.dpopService.generateKeys();
        }
      }

      const { codeChallenge } = await this.pkceService.initiatePKCE();
      const state = this.pkceService.generateState();
      const nonce = this.generateNonce();

      this.pkceService.storeState(state);
      sessionStorage.setItem(this.NONCE_KEY, nonce);
      // Preservar la URL actual para que el callback redirija de vuelta al mismo lugar
      // (ej. F5 en /applications/list → vuelve a /applications/list, no a /dashboard).
      const currentPath = window.location.pathname + window.location.search;
      const safeReturnPath = currentPath.startsWith('/') && !currentPath.startsWith('//') && currentPath !== '/auth/callback'
        ? currentPath
        : '/dashboard';
      sessionStorage.setItem('pkce_return_url', safeReturnPath);

      const authParams: Record<string, string> = {
        response_type: 'code',
        client_id: this.OAUTH_CONFIG.clientId,
        redirect_uri: this.OAUTH_CONFIG.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
        scope: this.OAUTH_CONFIG.scopes.join(' '),
        prompt: 'none',
      };

      const configuredAudience = String(this.OAUTH_CONFIG['audience'] ?? '').trim();
      if (configuredAudience) {
        authParams['audience'] = configuredAudience;
      }

      const parBody = new HttpParams({ fromObject: authParams });
      const parHeaders = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
      const parResponse = await firstValueFrom(
        this.http.post<{ request_uri: string; expires_in: number }>(
          this.OAUTH_CONFIG.endpoints.par,
          parBody.toString(),
          { headers: parHeaders, withCredentials: true },
        ),
      );

      const audienceQuery = configuredAudience
        ? `&audience=${encodeURIComponent(configuredAudience)}`
        : '';
      window.location.href =
        `${this.OAUTH_CONFIG.endpoints.authorize}` +
        `?client_id=${encodeURIComponent(this.OAUTH_CONFIG.clientId)}` +
        `&request_uri=${encodeURIComponent(parResponse.request_uri)}` +
        audienceQuery;
    } catch {
      // Si PAR falla, marcar como no autenticado para que el guard fuerce login normal.
      localStorage.removeItem(this.SESSION_INDICATOR_KEY);
      this.updateState({ isAuthenticated: false, user: null, isLoading: false, error: null });
    }
  }

  private isOAuthCallbackInProgress(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const path = window.location.pathname;
    if (!path.endsWith('/auth/callback')) {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    return params.has('code') && params.has('state');
  }

  // =====================================================================
  // CALLBACK HANDLER (flujo redirect OAuth 2.1)
  // =====================================================================

  /**
   * Completes the OAuth redirect flow after returning from Identity.
   * Called by the /auth/callback route.
   */
  async handleAuthCallback(code: string, state: string): Promise<AuthCallbackResult> {
    // Restaurar claves DPoP desde IndexedDB antes del intercambio de código.
    // initializeAuth() omite este paso cuando detecta que estamos en el callback
    // (para no interferir con el flujo), por lo que hay que cargarlo aquí
    // explícitamente para que createTokenEndpointProof() pueda generar el proof.
    await this.dpopService.loadPersistedKeys();

    // Validate CSRF state
    if (!this.pkceService.validateState(state)) {
      this.pkceService.clearAll();
      return {
        success: false,
        message: 'No pudimos validar la solicitud de inicio de sesión. Intenta nuevamente.',
      };
    }

    const codeVerifier = this.pkceService.getCodeVerifier();
    if (!codeVerifier) {
      return {
        success: false,
        message: 'La sesión de inicio ya no es válida o expiró. Inicia sesión nuevamente.',
      };
    }

    try {
      const tokenResponse = await this.exchangeCodeForTokens(code, codeVerifier);

      // ── JWKS pinning: verificar firma criptográfica del id_token (4.6) ──────────
      // Defensa en profundidad contra sustitución de token (key confusion attack).
      // Usa Web Crypto API nativa del browser — sin dependencias adicionales.
      // sigValid === null → algoritmo no soportado por este browser (ej. Ed25519 en
      // Safari < 17); en ese caso continuar con validación de claims (nonce/iss/aud/exp).
      if (tokenResponse.id_token) {
        const sigValid = await this.verifyIdTokenSignature(tokenResponse.id_token);
        if (sigValid === false) {
          this.clearTokensFromStorage();
          this.pkceService.clearAll();
          return {
            success: false,
            message:
              'No pudimos validar la respuesta de autenticación. Inicia sesión nuevamente.',
          };
        }
      }

      if (!this.validateIdTokenNonce(tokenResponse.id_token)) {
        this.clearTokensFromStorage();
        this.pkceService.clearAll();
        return {
          success: false,
          message:
            'La solicitud de inicio de sesión ya no es válida. Inicia sesión nuevamente.',
        };
      }

      sessionStorage.removeItem(this.NONCE_KEY);
      this.pkceService.clearAll();
      const user = await this.fetchUserInfo(tokenResponse.access_token);
      return { success: true, user, message: 'Sesión iniciada correctamente.' };
    } catch (error) {
      this.pkceService.clearAll();
      const httpError = error as HttpErrorResponse;
      const msg = this.extractErrorMessage(httpError);
      return {
        success: false,
        message: msg,
        oauthErrorCode: this.extractOAuthErrorCode(httpError),
      };
    }
  }

  /**
   * Intercambia el authorization code por tokens
   * El backend retorna access_token y refresh_token
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OidcTokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('redirect_uri', this.OAUTH_CONFIG.redirectUri)
      .set('client_id', this.OAUTH_CONFIG.clientId)
      .set('code_verifier', codeVerifier);

    // DPoP proof para el token endpoint (RFC 9449 §5)
    const dpopProof = await this.dpopService.createTokenEndpointProof(
      this.OAUTH_CONFIG.endpoints.token,
    );

    let headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    if (dpopProof) {
      headers = headers.set('DPoP', dpopProof);
    }

    const response = await firstValueFrom(
      this.http.post<OidcTokenResponse>(
        this.OAUTH_CONFIG.endpoints.token,
        body.toString(),
        { headers, withCredentials: true }
      )
    );

    this.storeTokens(response);
    return response;
  }

  // =====================================================================
  // USER INFO
  // =====================================================================

  private async fetchUserInfo(accessToken?: string): Promise<OidcUserDto> {
    if (!accessToken) {
      throw new Error('access_token_required_for_userinfo');
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    });

    const response = await firstValueFrom(
      this.http.get<UserInfoResponse>(
        this.OAUTH_CONFIG.endpoints.userinfo,
        { headers, withCredentials: true }
      )
    );

    const user = this.mapUserInfoToUser(response);
    this.updateState({ isAuthenticated: true, user, isLoading: false, error: null });
    this.cacheUser(user);

    return user;
  }

  // =====================================================================
  // REFRESH TOKENS
  // =====================================================================

  /**
   * Refresca tokens vía grant_type=refresh_token contra /oauth/token.
   *
   * El backend lee el refresh token exclusivamente desde cookie HttpOnly.
   * Se requiere `withCredentials` y, cuando está disponible, `X-CSRF-Token`.
   */
  refreshTokens(options?: { allowBlindAttempt?: boolean }): Observable<OidcTokenResponse> {
    if (this.isOAuthCallbackInProgress()) {
      return throwError(() => new Error('refresh_skipped_during_oauth_callback'));
    }

    const hasRefreshInMemory = !!this.tokens?.refreshToken;
    const csrfToken = this.readCsrfTokenFromCookie();
    // En modo cookie, la SPA no puede leer la cookie companion CSRF porque está
    // restringida a auth.sandbox... (prefijo __Host- prohíbe Domain). El backend
    // acepta la petición cuando Origin === FRONTEND_URL (equivalente a CSRF
    // con SameSite=Strict + validación CORS). Solo omitimos el intento si
    // sabemos con certeza que no hay sesión activa en este navegador.
    const hasSessionIndicator = localStorage.getItem(this.SESSION_INDICATOR_KEY) === '1';

    // Sin ningún material: RT en memoria, CSRF cookie accesible, ni indicador
    // de sesión previa → normalmente no intentamos. Excepción: inicialización
    // de la app (F5), donde se permite blind attempt para recuperar sesión
    // basada en cookie HttpOnly aunque el indicador local se haya perdido.
    if (!options?.allowBlindAttempt && !hasRefreshInMemory && !csrfToken && !hasSessionIndicator) {
      return throwError(() => new Error('refresh_not_possible_without_credentials'));
    }

    if (this.isRefreshing && this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.isRefreshing = true;

    let body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', this.OAUTH_CONFIG.clientId);
    // DPoP proof para refresh (RFC 9449 §5) — se genera de forma síncrona
    // mediante una Promise encadenada antes de la petición HTTP.
    this.refreshInProgress$ = new Observable<OidcTokenResponse>(observer => {
      this.dpopService.createTokenEndpointProof(this.OAUTH_CONFIG.endpoints.token)
        .then(dpopProof => {
          let headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
          if (dpopProof) {
            headers = headers.set('DPoP', dpopProof);
          }
          // Header CSRF requerido para el refresh token en cookie HttpOnly.
          if (csrfToken) {
            headers = headers.set('X-CSRF-Token', csrfToken);
          }

          this.http.post<OidcTokenResponse>(
            this.OAUTH_CONFIG.endpoints.token,
            body.toString(),
            { headers, withCredentials: true }
          ).pipe(
            tap(response => {
              this.isRefreshing = false;
              this.refreshInProgress$ = null;
              this.storeTokens(response);
            }),
            catchError(error => {
              this.isRefreshing = false;
              this.refreshInProgress$ = null;
              // No llamar handleSessionExpired() aquí — el contexto del caller
              // determina si es un error durante uso activo (monitoring, interceptor)
              // o un blind-refresh silencioso al iniciar (initializeAuth). Los
              // callers que necesitan notificar/redirigir añaden su propio handler.
              return throwError(() => error);
            }),
          ).subscribe({
            next: v => observer.next(v),
            error: e => observer.error(e),
            complete: () => observer.complete(),
          });
        })
        .catch(e => observer.error(e));
    }).pipe(shareReplay(1));

    return this.refreshInProgress$;
  }

  /**
   * Lee el token CSRF (no el secret) que el frontend recibe en una cookie
   * NO-HttpOnly emitida por el backend cuando renderiza una vista. En SPA pura
   * sin renderizado server-side, devuelve null y el backend rechazará con 400.
   */
  private readCsrfTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const c of cookies) {
      const eq = c.indexOf('=');
      if (eq === -1) continue;
      const name = c.substring(0, eq);
      if (name === 'XSRF-TOKEN' || name === 'csrf_token' || name === '__Host-csrf_token') {
        return decodeURIComponent(c.substring(eq + 1));
      }
    }
    return null;
  }

  // =====================================================================
  // LOGOUT
  // =====================================================================

  /**
   * Cierre de sesión (orden garantizado):
   * 1) Intentar revocar tokens en /oauth/revoke (refresh primero, access después si existe).
   * 2) Limpiar estado local (memoria + sessionStorage) aunque revoke falle.
   * 3) Redirigir a login o ruta pública.
   *
   * Modo offline / error de red:
   * - Si /oauth/revoke no responde (status 0 u otro error), se considera logout local exitoso.
   * - La sesión local SIEMPRE se limpia para evitar sesiones zombie en el frontend.
   */
  logout(redirectTo: string = '/'): Observable<{ success: boolean; message: string }> {
    return this.revokeTokensForLogout().pipe(
      map(() => ({ success: true, message: 'Sesión cerrada correctamente' })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          return of({
            success: true,
            message: 'Sin conexión: sesión local cerrada. Se omitió revoke remoto.'
          });
        }

        return of({
          success: true,
          message: 'No se pudo completar revoke remoto, pero la sesión local fue cerrada.'
        });
      }),
      finalize(() => {
        const safeRedirectTo = this.sanitizeReturnUrl(redirectTo);
        this.clearSession();
        // Navegación de página completa para evitar quedar en la misma ruta protegida
        // cuando Angular ignora una navegación SPA equivalente (ej. / -> /dashboard actual).
        window.location.assign(safeRedirectTo);
      }),
    );
  }

  async logoutAsync(redirectTo: string = '/'): Promise<void> {
    await firstValueFrom(this.logout(redirectTo));
  }

  logoutAll(redirectTo: string = '/'): Observable<{ success: boolean; message: string }> {
    return this.revokeTokensForLogout(true).pipe(
      map(() => ({ success: true, message: 'Sesión global cerrada correctamente' })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          return of({
            success: true,
            message: 'Sin conexión: sesión local cerrada. Se omitió logout global remoto.'
          });
        }

        return of({
          success: true,
          message: 'No se pudo completar logout global remoto, pero la sesión local fue cerrada.'
        });
      }),
      finalize(() => {
        const safeRedirectTo = this.sanitizeReturnUrl(redirectTo);
        this.clearSession();
        window.location.assign(safeRedirectTo);
      }),
    );
  }

  async logoutAllAsync(redirectTo: string = '/'): Promise<void> {
    await firstValueFrom(this.logoutAll(redirectTo));
  }


  async logoutAndReauthenticate(returnUrl: string = '/dashboard'): Promise<void> {
    await firstValueFrom(this.logout('/'));
    await this.initiateLoginRedirect(this.sanitizeReturnUrl(returnUrl));
  }

  private revokeTokensForLogout(globalLogout: boolean = false): Observable<void> {
    const refreshToken = this.tokens?.refreshToken ?? null;
    const accessToken = this.tokens?.accessToken ?? null;

    // El logout normal siempre revoca la sesión del cliente actual.
    // El logout global se conserva explícitamente en /oauth/sso/logout.
    const clientLogoutUrl = this.OAUTH_CONFIG.endpoints['clientLogout'] as string | undefined;
    const ssoLogoutUrl = this.OAUTH_CONFIG.endpoints['ssoLogout'] as string | undefined;
    const remoteLogoutUrl = globalLogout ? ssoLogoutUrl : clientLogoutUrl;
    const remoteLogoutBody =
      globalLogout || !refreshToken ? null : { refresh_token: refreshToken };

    let revokeFlow$: Observable<unknown> = remoteLogoutUrl
      ? this.http.post(remoteLogoutUrl, remoteLogoutBody, { withCredentials: true }).pipe(
          tap({
            error: (error) => this.logRemoteLogoutError(error, remoteLogoutUrl),
          }),
          catchError(() => of(null)),
        )
      : of(null);

    if (refreshToken && !globalLogout) {
      revokeFlow$ = revokeFlow$.pipe(
        switchMap(() => this.revokeToken(refreshToken, 'refresh_token')),
      );
    }

    if (accessToken) {
      revokeFlow$ = revokeFlow$.pipe(
        switchMap(() => this.revokeToken(accessToken, 'access_token')),
      );
    }

    return revokeFlow$.pipe(map(() => void 0));
  }

  private logRemoteLogoutError(error: unknown, url: string): void {
    const status = error instanceof HttpErrorResponse ? error.status : 'unknown';
    console.warn('[OidcAuthService] Remote logout request failed', { status, url });
  }

  private revokeToken(token: string, tokenTypeHint?: 'refresh_token' | 'access_token'): Observable<unknown> {
    let body = new HttpParams()
      .set('token', token)
      .set('client_id', this.OAUTH_CONFIG.clientId);

    if (tokenTypeHint) {
      body = body.set('token_type_hint', tokenTypeHint);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(this.OAUTH_CONFIG.endpoints.revoke, body.toString(), { headers });
  }

  // =====================================================================
  // TOKEN STORAGE
  // =====================================================================

  private storeTokens(response: OidcTokenResponse): void {
    const expiresIn = response.expires_in ?? 0;
    const expiresAt = expiresIn > 0 ? Date.now() + (expiresIn * 1000) : Date.now() + 900_000;

    this.tokens = {
      accessToken: response.access_token,
      idToken: response.id_token,
      expiresAt,
      tokenType: response.token_type ?? 'Bearer'
    };

    // NUNCA persistir refresh_token en storage del navegador. Si el servidor lo
    // envió en body, vive solo en memoria; si lo envió en cookie HttpOnly,
    // el navegador la maneja y JavaScript jamás la lee.

    // Indicador de sesión activa (sin dato sensible) para habilitar blind-refresh
    // al recargar la página en modo cookie.
    localStorage.setItem(this.SESSION_INDICATOR_KEY, '1');
    this.isHandlingSessionExpiry = false;

    this.scheduleTokenRefresh(expiresAt);
  }

  private clearTokensFromStorage(): void {
    this.tokens = null;
    sessionStorage.removeItem(this.NONCE_KEY);
    sessionStorage.removeItem(this.USER_CACHE_KEY);
    sessionStorage.removeItem('oidc_rt');
    localStorage.removeItem(this.SESSION_INDICATOR_KEY);
  }

  // =====================================================================
  // AUTH HEADERS
  // =====================================================================

  private getAuthHeaders(): HttpHeaders {
    // Access tokens are held only in memory and sent as Authorization headers.
    const accessToken = this.tokens?.accessToken;

    if (accessToken) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `${this.tokens?.tokenType ?? 'Bearer'} ${accessToken}`,
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  getAccessToken(): string | null {
    // El access_token se guarda en memoria para enviarlo al Resource API
    return this.tokens?.accessToken ?? null;
  }

  getTokenType(): string {
    return this.tokens?.tokenType ?? 'Bearer';
  }

  // =====================================================================
  // SESSION MONITORING
  // =====================================================================

  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshInMs = Math.max(0, expiresAt - Date.now() - this.REFRESH_BUFFER_MS);

    this.refreshTimer = setTimeout(() => {
      if (this.getState().isAuthenticated) {
        this.refreshTokens().subscribe({
          error: () => this.handleSessionExpired(),
        });
      }
    }, refreshInMs);
  }

  private startSessionMonitoring(): void {
    this.stopSessionMonitoring();

    this.sessionMonitorSubscription = interval(60000).subscribe(() => {
      if (this.tokens && this.tokens.expiresAt < Date.now() + this.REFRESH_BUFFER_MS) {
        // The IdP may retain the refresh token in a host-only HttpOnly cookie.
        const canRefresh =
          !!this.tokens.refreshToken ||
          !!this.readCsrfTokenFromCookie() ||
          localStorage.getItem(this.SESSION_INDICATOR_KEY) === '1';

        if (canRefresh) {
          this.refreshTokens().subscribe({
            error: () => this.handleSessionExpired(),
          });
        } else {
          this.handleSessionExpired();
        }
      }
    });
  }

  private stopSessionMonitoring(): void {
    if (this.sessionMonitorSubscription) {
      this.sessionMonitorSubscription.unsubscribe();
      this.sessionMonitorSubscription = undefined;
    }
  }

  private handleSessionExpired(error?: unknown): void {
    this.terminateExpiredSession(error);
  }

  // =====================================================================
  // USER MAPPING
  // =====================================================================

  private mapUserInfoToUser(response: UserInfoResponse): OidcUserDto {
    const timestamp = new Date().toISOString();

    // Normalizar roles: el backend puede devolver objetos {id, key, name}
    // o strings planos. Conservamos tanto `key` como `name` cuando existan
    // `roles` corresponde al audience del token configurado. Para la UI
    // usar los roles de las APIs autorizadas, excluyendo el rol técnico del gateway.
    const audienceRoles = Object.entries(response.rolesByAudience ?? {})
      .filter(([audience]) => audience !== this.OAUTH_CONFIG.audience)
      .flatMap(([, roles]) => roles);
    const rawRoles = (audienceRoles.length > 0 ? audienceRoles : (response.roles ?? [])) as Array<string | Record<string, unknown>>;

    const roleNameToId: Record<string, string> = {
      superadmin: 'superadmin',
      admin: 'admin',
      capturista: 'capturista',
      viewer: 'viewer',
      user: 'user',
    };

    const formatFromKey = (k: string) => {
      if (!k) return 'Usuario';
      return k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    };

    const normalizedRoles = rawRoles.map((r) => {
      if (typeof r === 'string') {
        const key = r;
        return {
          id: roleNameToId[key.toLowerCase()] ?? key,
          key,
          name: formatFromKey(key),
        };
      }
      // objeto con {id?, key?, name?}
      const keyValue = typeof r['key'] === 'string'
        ? r['key']
        : typeof r['name'] === 'string'
          ? r['name'].replace(/\s+/g, '_').toLowerCase()
          : 'user';
      const name = typeof r['name'] === 'string' ? r['name'] : formatFromKey(keyValue);
      const idValue = typeof r['id'] === 'string'
        ? r['id']
        : roleNameToId[keyValue.toLowerCase()] ?? keyValue;

      return {
        id: idValue,
        key: keyValue,
        name,
      };
    });

    // Para el campo `role` (singular) del UserDto, preferir el primer rol activo
    const primaryRoleObj = normalizedRoles[0] ?? { id: 'user', key: 'user', name: 'Usuario' };
    const roleId = primaryRoleObj.id ?? roleNameToId[(primaryRoleObj.key || 'user').toLowerCase()] ?? 'user';

    // Build user object with partial DTO support
    const user: OidcUserDto = {
      id: response.user?.id ?? response.sub,
      email: response.email,
      isActive: response.user?.isActive ?? true,
      isVerified: response.user?.isVerified ?? response.email_verified ?? true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      is2faEnabled: response.user?.is2faEnabled ?? false,
      failed2faAttempts: 0,
      passwordHistoryLimit: 5,
      passwordExpirationDays: 90,
      inactivityThresholdDays: 30,
      deleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLogin: response.user?.lastLogin,
      employeeId: response.user?.employeeId,
      role: {
        id: roleId,
        key: primaryRoleObj.key,
        name: primaryRoleObj.name,
        description: '',
        isActive: true,
        deleted: false,
        isSystemRole: (primaryRoleObj.key || '').toLowerCase() === 'superadmin' || (primaryRoleObj.key || '').toLowerCase() === 'admin',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      // También agregar array de roles para consumo en UI (preservando key y name)
      roles: normalizedRoles.map(r => ({
        id: r.id ?? 'user',
        key: r.key,
        name: r.name,
        description: '',
        isActive: true,
        deleted: false,
        isSystemRole: (r.key || '').toLowerCase() === 'superadmin' || (r.key || '').toLowerCase() === 'admin',
        createdAt: timestamp,
        updatedAt: timestamp
      })),
      permissions: this.normalizePermissions(
        response.permissions ??
        response.effectivePermissions ??
        response.effective_permissions
      ),
      effectivePermissions: this.normalizePermissions(
        response.effectivePermissions ??
        response.effective_permissions ??
        response.permissions
      ),
      permissionsByAudience: response.permissionsByAudience,
      rolesByAudience: response.rolesByAudience,
    };

    // Identity devuelve `employee`; `person` se conserva por compatibilidad.
    const employeeResponse = response.employee;

    // Map person/employee if exists
    if (employeeResponse) {
      user.employee = {
        id: employeeResponse.id,
        firstName: employeeResponse.firstName,
        lastName: employeeResponse.lastName,
        secondLastName: employeeResponse.secondLastName,
        email: employeeResponse.email ?? response.email,
        phone: employeeResponse.phone,
        sexo: employeeResponse.sexo,
        rfc: employeeResponse.rfc,
        curp: employeeResponse.curp,
        nss: employeeResponse.nss,
        nup: employeeResponse.nup,
        nue: employeeResponse.nue,
        birthDate: employeeResponse.birthDate,
        hireDate: employeeResponse.hireDate,
        employmentStatus: (employeeResponse.employmentStatus ?? 'active') as 'active' | 'inactive' | 'suspended',
        isActive: true,
        deleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        areaId: employeeResponse.areaId,
        instalacionId: employeeResponse.facilityId,
        puestoId: employeeResponse.positionId,
        scheduleTypeId: employeeResponse.scheduleTypeId
      };

      // Map area if exists
      if (response.area) {
        const areaExt = response.area as typeof response.area & { orderPosition?: number; allowsSubAreas?: boolean; maxDepth?: number };
        user.employee!.area = {
          id: areaExt.id,
          name: areaExt.name,
          description: areaExt.description,
          level: areaExt.level ?? 0,
          parentAreaId: areaExt.parentAreaId,
          orderPosition: areaExt.orderPosition ?? 0,
          allowsSubAreas: areaExt.allowsSubAreas ?? true,
          maxDepth: areaExt.maxDepth ?? 5,
          isActive: true,
          deleted: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }

      // Map facility as instalacion
      if (response.facility) {
        user.employee!.instalacion = {
          id: response.facility.id,
          name: response.facility.name,
          code: response.facility.code,
          street: response.facility.street,
          municipality: response.facility.municipality,
          state: response.facility.state,
          postalCode: response.facility.postalCode,
          status: 'active',
          isActive: true,
          deleted: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }

      // Map position as puesto
      if (response.position) {
        user.employee!.puesto = {
          id: response.position.id,
          name: response.position.name,
          code: response.position.code ?? '',
          level: response.position.level,
          isActive: true,
          deleted: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }

      // Map scheduleType
      if (response.scheduleType) {
        user.employee!.scheduleType = {
          id: response.scheduleType.id,
          name: response.scheduleType.name,
          code: response.scheduleType.code ?? '',
          defaultStartTime: response.scheduleType.defaultStartTime,
          defaultEndTime: response.scheduleType.defaultEndTime,
          defaultWorkDays: response.scheduleType.defaultWorkDays,
          allows247Access: response.scheduleType.allows247Access,
          allowsFlexibleHours: response.scheduleType.allowsFlexibleHours,
          isActive: true,
          deleted: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }
    }

    return user;
  }

  // =====================================================================
  // STATE MANAGEMENT
  // =====================================================================

  private getState(): AuthState {
    return this.authStateSubject.value;
  }

  private updateState(newState: AuthState): void {
    this.authStateSubject.next(newState);
  }

  isAuthenticated(): boolean {
    return this.getState().isAuthenticated;
  }

  getCurrentUser(): OidcUserDto | null {
    return this.getState().user;
  }

  // =====================================================================
  // CACHE
  // =====================================================================

  private cacheUser(user: OidcUserDto): void {
    try {
      // Strip sensitive government PII fields (CURP, RFC, NSS, NUP, NUE, phone, dates)
      // before caching — sessionStorage is accessible to JavaScript on the same origin.
      const safePerson = user.employee
        ? {
            id: user.employee.id,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            secondLastName: user.employee.secondLastName,
            employmentStatus: user.employee.employmentStatus,
            isActive: user.employee.isActive,
            areaId: user.employee.areaId,
            instalacionId: user.employee.instalacionId,
            puestoId: user.employee.puestoId,
            scheduleTypeId: user.employee.scheduleTypeId,
            area: user.employee.area,
            instalacion: user.employee.instalacion,
            puesto: user.employee.puesto,
            scheduleType: user.employee.scheduleType,
          }
        : undefined;

      sessionStorage.setItem(this.USER_CACHE_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        employee: safePerson,
        role: user.role,
        permissions: user.permissions,
        effectivePermissions: user.effectivePermissions,
        cachedAt: Date.now()
      }));
    } catch {
      // Ignorar errores de cache
    }
  }

  private loadCachedUser(): OidcUserDto | null {
    try {
      const raw = sessionStorage.getItem(this.USER_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached?.cachedAt || Date.now() - cached.cachedAt > this.USER_CACHE_MAX_AGE_MS) {
        sessionStorage.removeItem(this.USER_CACHE_KEY);
        return null;
      }
      return cached as OidcUserDto;
    } catch {
      sessionStorage.removeItem(this.USER_CACHE_KEY);
      return null;
    }
  }

  private normalizePermissions(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .filter((permission): permission is string => typeof permission === 'string')
            .map((permission) => permission.trim())
            .filter(Boolean),
        ),
      );
    }

    return [];
  }

  // =====================================================================
  // UTILITIES
  // =====================================================================

  private extractErrorMessage(error: HttpErrorResponse): string {
    const errorBody =
      typeof error.error === 'object' && error.error !== null
        ? (error.error as Record<string, unknown>)
        : {};

    const oauthError =
      typeof errorBody['error'] === 'string'
        ? errorBody['error'].toLowerCase()
        : '';
    const description =
      typeof errorBody['error_description'] === 'string'
        ? errorBody['error_description'].toLowerCase()
        : '';
    const backendMessage =
      typeof errorBody['message'] === 'string'
        ? errorBody['message'].toLowerCase()
        : '';

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }

    if (error.status === 401) {
      if (backendMessage.includes('inactiv')) {
        return 'Tu cuenta está inactiva. Contacta al administrador para habilitar el acceso.';
      }

      return 'Credenciales inválidas. Verifica tu correo y contraseña.';
    }

    if (error.status === 429) {
      return 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    }

    if (error.status === 400) {
      if (
        oauthError === 'invalid_grant' &&
        /timeout por inactividad|expirad|revocad|reutilizaci|reuse/.test(
          description || backendMessage,
        )
      ) {
        return 'La sesión expiró o ya no es válida. Inicia sesión nuevamente.';
      }

      if (oauthError === 'invalid_grant') {
        return 'No fue posible validar la sesión de inicio. Inicia sesión nuevamente.';
      }

      if (oauthError === 'invalid_request') {
        return 'La solicitud de inicio de sesión no es válida. Inténtalo nuevamente desde el portal.';
      }

      if (
        oauthError === 'temporarily_unavailable' ||
        oauthError === 'server_error'
      ) {
        return 'El servicio no está disponible temporalmente. Intenta nuevamente en unos minutos.';
      }

      if (
        /nonce|state|code_verifier|code challenge|pkce|request_uri/.test(
          description || backendMessage,
        )
      ) {
        return 'La solicitud de inicio de sesión ya no es válida. Inicia sesión nuevamente.';
      }

      if (/captcha/.test(description || backendMessage)) {
        return 'Completa la verificación de seguridad para continuar.';
      }

      return 'No fue posible completar la autenticación. Intenta nuevamente.';
    }

    return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }

  private extractOAuthErrorCode(error: HttpErrorResponse): string | undefined {
    const errorBody =
      typeof error.error === 'object' && error.error !== null
        ? (error.error as Record<string, unknown>)
        : {};

    const oauthError = errorBody['error'];
    return typeof oauthError === 'string' ? oauthError.toLowerCase() : undefined;
  }

  async clearServerSideSession(): Promise<void> {
    const ssoLogoutUrl = this.OAUTH_CONFIG.endpoints['ssoLogout'] as string | undefined;

    try {
      if (ssoLogoutUrl) {
        await firstValueFrom(
          this.http.post(ssoLogoutUrl, null, { withCredentials: true }).pipe(
            tap({
              error: (error) => this.logRemoteLogoutError(error, ssoLogoutUrl),
            }),
            catchError(() => of(null)),
          ),
        );
      }
    } finally {
      this.clearSession();
    }
  }

  private generateNonce(): string {
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    return Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private validateIdTokenNonce(idToken?: string): boolean {
    // Si no hay id_token, no aplica validación de nonce (OAuth-only response).
    if (!idToken) {
      return true;
    }

    const expectedNonce = sessionStorage.getItem(this.NONCE_KEY);
    if (!expectedNonce) {
      return false;
    }

    const payload = this.decodeJwtPayload(idToken);
    if (!payload || typeof payload['nonce'] !== 'string') {
      return false;
    }

    // INFO-01: Validar iss, aud y exp del id_token aunque el token llegue
    // directamente del token endpoint sobre TLS (defensa en profundidad).
    // Sin librería jose — el token fue recibido directamente del servidor,
    // por lo que la validación de claims es suficiente para este modelo.
    const nowSecs = Math.floor(Date.now() / 1000);
    if (payload['iss'] !== this.OAUTH_CONFIG.issuer) {
      return false;
    }
    const aud = payload['aud'];
    const audValid = aud === this.OAUTH_CONFIG.clientId ||
      (Array.isArray(aud) && (aud as string[]).includes(this.OAUTH_CONFIG.clientId));
    if (!audValid) {
      return false;
    }
    if (typeof payload['exp'] === 'number' && payload['exp'] < nowSecs) {
      return false;
    }
    if (typeof payload['iat'] === 'number' && payload['iat'] > nowSecs + 300) {
      // Rechazar tokens emitidos más de 5 min en el futuro (clock skew attack)
      return false;
    }

    return payload['nonce'] === expectedNonce;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private cleanup(): void {
    this.stopSessionMonitoring();

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.isRefreshing = false;
    this.refreshInProgress$ = null;
  }

  // =====================================================================
  // JWKS PINNING & SIGNATURE VERIFICATION (4.6)
  // =====================================================================

  /**
   * Obtiene las claves públicas JWKS del servidor de autorización y las cachea
   * en memoria con TTL de 5 minutos. Las claves son públicas — es seguro cachear.
   */
  private async fetchJwks(forceRefresh = false): Promise<Record<string, unknown>[]> {
    const now = Date.now();
    if (!forceRefresh && this.jwksCache && now - this.jwksCache.fetchedAt < this.JWKS_CACHE_TTL_MS) {
      return this.jwksCache.keys;
    }
    // forceRefresh usa un query param de cache-busting en lugar de un header Cache-Control:
    // Cache-Control en request headers no es un CORS-safelisted header → dispara preflight →
    // el backend lo rechaza (no está en DEFAULT_ALLOWED_HEADERS) → GET se aborta.
    const jwksUrl = forceRefresh
      ? `${this.OAUTH_CONFIG.endpoints.jwks}?_=${Date.now()}`
      : this.OAUTH_CONFIG.endpoints.jwks;
    const request$ = this.http.get<{ keys: Record<string, unknown>[] }>(jwksUrl);
    const response = await firstValueFrom(request$);
    const keys = Array.isArray(response?.keys) ? response.keys : [];
    this.jwksCache = { keys, fetchedAt: now };
    return keys;
  }

  /**
   * Verifica la firma criptográfica del id_token contra la clave pública JWKS
   * usando la Web Crypto API nativa del browser (sin dependencias externas).
   *
   * Retorna:
   *   true  → firma válida ✅
   *   false → firma inválida ❌ (rechazar el token)
   *   null  → algoritmo no soportado por el browser (degradación elegante;
   *            continuar con validación de claims nonce/iss/aud/exp)
   */
  private async verifyIdTokenSignature(idToken: string): Promise<boolean | null> {
    try {
      const header = this.decodeJwtHeader(idToken);
      if (!header) return false;

      const kid = header['kid'] as string | undefined;
      const alg = (header['alg'] as string | undefined) ?? 'ES256';

      const keys = await this.fetchJwks();
      // Buscar por kid si está presente; si no, usar la primera clave del JWKS
      let jwk = kid ? keys.find(k => k['kid'] === kid) : keys[0];
      // kid no encontrado en JWKS cacheado → posible rotación de clave tras redeploy
      // → forzar recarga ignorando caché en memoria y HTTP
      if (!jwk && kid) {
        const freshKeys = await this.fetchJwks(true);
        jwk = freshKeys.find(k => k['kid'] === kid);
      }
      if (!jwk) return null; // kid no encontrado incluso con JWKS fresco → degradación elegante

      const parts = idToken.split('.');
      if (parts.length !== 3) return false;

      const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const signature   = this.base64urlToUint8Array(parts[2]);

      const algorithm = this.algToSubtleCrypto(alg);
      if (!algorithm) return null; // Algoritmo desconocido — degradación elegante

      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        jwk as JsonWebKey,
        algorithm,
        false,      // no exportable
        ['verify'],
      );

      return await crypto.subtle.verify(
        algorithm,
        cryptoKey,
        signature.buffer as ArrayBuffer,
        signingInput.buffer as ArrayBuffer,
      );
    } catch {
      // SubtleCrypto puede lanzar NotSupportedError si el algoritmo no está
      // disponible en este browser (ej. Ed25519 en Safari < 17).
      return null; // Degradación elegante — no bloquear el flujo
    }
  }

  /**
   * Mapea el campo `alg` de la cabecera JWT al descriptor de algoritmo
   * de la Web Crypto API. Retorna null para algoritmos no soportados.
   */
  private algToSubtleCrypto(
    alg: string,
  ): EcdsaParams | Algorithm | null {
    switch (alg) {
      case 'ES256': return { name: 'ECDSA', hash: 'SHA-256' } as EcdsaParams;
      case 'ES384': return { name: 'ECDSA', hash: 'SHA-384' } as EcdsaParams;
      case 'ES512': return { name: 'ECDSA', hash: 'SHA-512' } as EcdsaParams;
      case 'EdDSA': return { name: 'Ed25519' } as Algorithm;
      default:      return null;
    }
  }

  /** Decodifica la cabecera (parte 0) de un JWT en Base64URL. */
  private decodeJwtHeader(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 3) return null;
      const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const padded  = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /** Convierte un string Base64URL a Uint8Array (bytes de firma). */
  private base64urlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded  = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  }

  clearSession(): void {
    this.cleanup();
    this.clearTokensFromStorage();
    this.pkceService.clearAll();
    this.dpopService.clearKeys(); // DPoP: destruir par de claves efímero
    this.updateState({ isAuthenticated: false, user: null, isLoading: false, error: null });
  }

  // =====================================================================
  // ACCOUNT ACTION — sensitive flows handled by Identity
  // =====================================================================

  /**
   * Inicia un flujo sensible en Identity (cambio de contraseña, 2FA, etc.)
   * Solicita bootstrap_token, lo resuelve por POST y navega al bootstrap endpoint.
   * Nota: este cliente opera sin cookies HttpOnly compartidas entre dominios.
   */
  async initiateAccountAction(action: string, returnPath: string): Promise<void> {
    const safeReturnPath = this.validateInternalReturnPath(returnPath);
    const state = this.pkceService.generateState();
    sessionStorage.setItem('account_action_state', state);

    // Protected account actions require an in-memory access token.
    if (!this.tokens?.accessToken) {
      const isAuthenticated = this.authStateSubject.getValue().isAuthenticated;

      if (!isAuthenticated) {
        // Sin AT en memoria y sin sesión activa → redirigir al login.
        void this.initiateLoginRedirect(safeReturnPath);
        return;
      }

      try {
        await firstValueFrom(this.refreshTokens({ allowBlindAttempt: true }));
      } catch {
        void this.initiateLoginRedirect(safeReturnPath);
        return;
      }
    }

    const result = await firstValueFrom(
      this.http.post<{ bootstrap_token: string }>(
        `${environment.ssoUrl}/account/initiate`,
        {
          action,
          returnPath: `${window.location.origin}${safeReturnPath}`,
          state,
          clientId: this.OAUTH_CONFIG.clientId,
        },
        { headers: this.getAuthHeaders(), withCredentials: true },
      ),
    );
    if (!result.bootstrap_token) {
      throw new Error('Token de bootstrap inválido recibido del servidor');
    }

    const resolved = await firstValueFrom(
      this.http.post<{ flow_id: string; redirect_path: string }>(
        `${environment.ssoUrl}/account/action/resolve`,
        { token: result.bootstrap_token },
      ),
    );

    if (!resolved.redirect_path.startsWith('/account/action/bootstrap')) {
      throw new Error('Ruta de bootstrap inválida recibida del servidor');
    }

    // Never persist refresh tokens in Web Storage. If the browser cannot use
    // its HttpOnly session cookies after the account action, it must reauthenticate.

    window.location.href = `${environment.ssoRootUrl}${resolved.redirect_path}`;
  }

  async requestEmailVerification(returnPath: string, clientId?: string): Promise<void> {
    const safeReturnPath = this.validateInternalReturnPath(returnPath);
    const resolvedClientId = clientId ?? this.OAUTH_CONFIG.clientId;

    if (!this.tokens?.accessToken) {
      const isAuthenticated = this.authStateSubject.getValue().isAuthenticated;
      if (!isAuthenticated) {
        void this.initiateLoginRedirect(safeReturnPath);
        return;
      }
    }

    await firstValueFrom(
      this.http.post<void>(
        `${environment.ssoUrl}/account/verify-email/send`,
        {
          returnPath: `${window.location.origin}${safeReturnPath}`,
          clientId: resolvedClientId,
        },
        { headers: this.getAuthHeaders(), withCredentials: true },
      ),
    );
  }

  validateAccountActionState(state: string | null): boolean {
    const expectedState = sessionStorage.getItem('account_action_state');
    sessionStorage.removeItem('account_action_state');
    if (!expectedState || !state) return false;
    // Comparación en tiempo constante (evita timing oracle)
    const encoder = new TextEncoder();
    const a = encoder.encode(state);
    const b = encoder.encode(expectedState);
    const len = Math.max(a.length, b.length);
    const aPad = new Uint8Array(len);
    const bPad = new Uint8Array(len);
    aPad.set(a);
    bPad.set(b);
    let diff = a.length ^ b.length;
    for (let i = 0; i < len; i++) diff |= aPad[i] ^ bPad[i];
    return diff === 0;
  }

  private validateInternalReturnPath(returnPath: string): string {
    if (!returnPath || !returnPath.startsWith('/')) {
      throw new Error('returnPath inválido');
    }

    if (/^\/\//.test(returnPath) || /[\\]/.test(returnPath)) {
      throw new Error('returnPath inválido');
    }

    const pathOnly = returnPath.split('?')[0].split('#')[0];
    if (!this.SAFE_RETURN_PATHS.has(pathOnly)) {
      throw new Error('returnPath no permitido');
    }

    return returnPath;
  }

  /**
   * Sanitiza una URL de retorno post-login para prevenir Open Redirect.
   * Solo acepta rutas relativas internas (ej: /dashboard, /users/123).
   * Rechaza URLs absolutas, protocol-relative (//evil.com), y backslashes.
   */
  private sanitizeReturnUrl(url: string): string {
    if (!url || typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
      return '/dashboard';
    }
    try {
      const parsed = new URL(url, 'https://localhost:3001/oauth/authorize');
      if (parsed.origin !== 'https://localhost:3001/oauth/authorize') {
        return '/dashboard';
      }
    } catch {
      return '/dashboard';
    }
    return url;
  }

  // =====================================================================
  // HTTP CON AUTENTICACIÓN
  // =====================================================================

  requestWithAuth<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options: {
      body?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {}
  ): Observable<T> {
    const fullUrl = this.buildApiAbsoluteUrl(url);
    const isAuthServerRequest = this.isAuthServerApiUrl(fullUrl);
    const isResourceApiRequest = this.isResourceApiUrl(fullUrl);
    const isAuthenticated = this.authStateSubject.value.isAuthenticated;
    if (!isAuthenticated && !this.tokens) {
      return throwError(() => new Error('No autenticado'));
    }

    // Refresh proactively when the in-memory token is about to expire.
    if (this.tokens?.accessToken && this.tokens.expiresAt < Date.now() + 60000) {
      return this.refreshTokens().pipe(
        switchMap(() => this.executeRequest<T>(method, fullUrl, options, isAuthServerRequest, isResourceApiRequest))
      );
    }

    return this.executeRequest<T>(method, fullUrl, options, isAuthServerRequest, isResourceApiRequest);
  }

  private buildApiAbsoluteUrl(url: string): string {
    try {
      if (/^https?:\/\//i.test(url)) {
        return new URL(url).toString();
      }

      const apiBase = new URL(environment.apiUrl);
      // Use relative path (no leading slash) so it appends to the base path
      const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
      // Ensure base ends with a slash so new URL appends correctly
      if (!apiBase.pathname.endsWith('/')) apiBase.pathname = apiBase.pathname + '/';
      return new URL(normalizedPath, apiBase).toString();
    } catch {
      const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
      const base = environment.apiUrl.endsWith('/') ? environment.apiUrl : environment.apiUrl + '/';
      return `${base}${normalizedPath}`;
    }
  }

  private executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    fullUrl: string,
    options: {
      body?: unknown;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
    },
    isAuthServerRequest: boolean,
    isResourceApiRequest: boolean,
  ): Observable<T> {
    // Do not send an invalid Authorization header while a refresh is pending.
    const authHeaders = this.getAuthHeaders();
    const isMultipartBody = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const baseHeaders: Record<string, string> = isAuthServerRequest
      ? {
          'Content-Type': authHeaders.get('Content-Type') ?? 'application/json',
          'X-Requested-With': authHeaders.get('X-Requested-With') ?? 'XMLHttpRequest',
          ...(authHeaders.get('Authorization')
            ? { 'Authorization': authHeaders.get('Authorization') as string }
            : {}),
        }
      : {
          ...(isMultipartBody ? {} : { 'Content-Type': 'application/json' }),
          ...(this.tokens?.accessToken
            ? { 'Authorization': `${this.tokens.tokenType} ${this.tokens.accessToken}` }
            : {}),
        };

    const headers: Record<string, string> = {
      ...baseHeaders,
      ...options.headers
    };

    let httpParams = new HttpParams();
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(item => {
              httpParams = httpParams.append(key, String(item));
            });
          } else {
            httpParams = httpParams.set(key, String(value));
          }
        }
      });
    }

    const httpOptions = {
      headers: new HttpHeaders(headers),
      params: httpParams,
      withCredentials: isAuthServerRequest,
    };

    let request: Observable<T>;
    switch (method) {
      case 'GET':
        request = this.http.get<T>(fullUrl, httpOptions);
        break;
      case 'POST':
        request = this.http.post<T>(fullUrl, options.body, httpOptions);
        break;
      case 'PUT':
        request = this.http.put<T>(fullUrl, options.body, httpOptions);
        break;
      case 'PATCH':
        request = this.http.patch<T>(fullUrl, options.body, httpOptions);
        break;
      case 'DELETE':
        request = this.http.delete<T>(fullUrl, httpOptions);
        break;
    }

    return request.pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && isAuthServerRequest) {
          return this.refreshTokens().pipe(
            switchMap(() => this.executeRequest<T>(method, fullUrl, options, isAuthServerRequest, isResourceApiRequest)),
            catchError((refreshError) => {
              this.terminateExpiredSession(refreshError);
              return throwError(() => error);
            })
          );
        }

        if (error.status === 401 && isResourceApiRequest) {
          return throwError(() => error);
        }

        return throwError(() => error);
      })
    );
  }

  private isAuthServerApiUrl(url: string): boolean {
    return this.isUrlUnderBase(url, environment.ssoUrl);
  }

  private isResourceApiUrl(url: string): boolean {
    return this.isUrlUnderBase(url, environment.apiUrl);
  }

  private isUrlUnderBase(url: string, base: string): boolean {
    try {
      const requestUrl = new URL(url, window.location.origin);
      const baseUrl = new URL(base, window.location.origin);
      const normalizedBasePath = baseUrl.pathname.replace(/\/+$/, '') || '/';
      const normalizedRequestPath = requestUrl.pathname.replace(/\/+$/, '') || '/';

      return requestUrl.origin === baseUrl.origin &&
        (normalizedRequestPath === normalizedBasePath ||
          normalizedRequestPath.startsWith(`${normalizedBasePath}/`));
    } catch {
      return false;
    }
  }
}
