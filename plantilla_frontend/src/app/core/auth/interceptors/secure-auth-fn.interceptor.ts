/**
 * =====================================================================
 * SECURE AUTH INTERCEPTOR (Functional API)
 * =====================================================================
 * 
 * Interceptor funcional para Angular 17+ que implementa:
 * - Inclusión automática de Authorization header con Bearer token
 * - Manejo automático de 401 con refresh estándar OAuth (/oauth/token con refresh_token)
 * - Prevención de loops infinitos
 * - No lee ni envía `csrf_token` (protección OAuth CSRF se maneja con `state` en authorize/callback)
 * 
 * Este interceptor usa tokens OIDC obtenidos directamente del SSO.
 * 
 * IMPORTANTE: Usa Injector en lugar de inject() directamente para
 * evitar dependencias circulares con OidcAuthService.
 * 
 * @author Security Team
 * @version 1.0.0
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { OidcAuthService } from '../services/oidc-auth.service';
import { DPoPService } from '../services/dpop.service';
/** Estado del refresh compartido entre peticiones */
let isRefreshing = false;
const refreshCompleted$ = new BehaviorSubject<boolean>(false);
const retryCount = new Map<string, number>();
const MAX_RETRIES = 1;

/** Cache del servicio para evitar múltiples inyecciones */
let cachedAuthService: OidcAuthService | null = null;

/**
 * Obtiene OidcAuthService desde el inyector Angular.
 */
async function getAuthServiceAsync(injector: Injector): Promise<OidcAuthService | null> {
  if (cachedAuthService) {
    return cachedAuthService;
  }
  
  try {
    cachedAuthService = injector.get(OidcAuthService);
    return cachedAuthService;
  } catch {
    return null;
  }
}

/**
 * Interceptor de autenticación OIDC
 * Agrega el Bearer token en memoria a las peticiones al Resource API.
 */
export const secureAuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const injector = inject(Injector);
  
  // Solo interceptar peticiones al Resource API
  if (!shouldIntercept(req.url)) {
    return next(req);
  }

  // Resource API requests do not carry authentication cookies.
  return from(addAuthHeader(addTraceHeaders(req), injector)).pipe(
    switchMap((secureRequest) => {
      return next(secureRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            return handle401Error(secureRequest, next, injector);
          }
          
          // Limpiar contador si no es un error autenticable por refresh
          retryCount.delete(req.url);
          
          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Verifica si la URL debe ser interceptada
 * Intercepta: Resource API
 * NO intercepta: SSO endpoints (el OidcAuthService maneja sus propias peticiones)
 */
function shouldIntercept(url: string): boolean {
  const requestUrl = resolveUrl(url);
  const apiBase = resolveUrl(environment.apiUrl);
  if (!requestUrl) return false;

  if (apiBase && requestUrl.origin === apiBase.origin) {
    const apiPath = normalizeBasePath(apiBase.pathname);
    const requestPath = normalizeRequestPath(requestUrl.pathname);
    if (apiPath === '/' || requestPath === apiPath || requestPath.startsWith(`${apiPath}/`)) {
      return true;
    }
  }

  // Application administration is served by Identity directly, not api.localhost.
  const identityBase = resolveUrl(environment.ssoUrl);
  if (!identityBase || requestUrl.origin !== identityBase.origin) return false;

  const requestPath = normalizeRequestPath(requestUrl.pathname);
  return ['/applications', '/admin/applications'].some(
    (path) => requestPath === path || requestPath.startsWith(`${path}/`),
  );
}

function resolveUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl, window.location.origin);
  } catch {
    return null;
  }
}

function normalizeBasePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function normalizeRequestPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function addTraceHeaders(request: HttpRequest<unknown>): HttpRequest<unknown> {
  const correlationId = request.headers.get('x-correlation-id') ?? createRequestId();
  const traceId = request.headers.get('x-trace-id') ?? createRequestId();

  return request.clone({
    setHeaders: {
      'x-correlation-id': correlationId,
      'x-trace-id': traceId,
    },
  });
}

function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Agrega el header Authorization con el Bearer token en memoria.
 */
async function addAuthHeader(request: HttpRequest<unknown>, injector: Injector): Promise<HttpRequest<unknown>> {
  const authService = await getAuthServiceAsync(injector);

  if (!authService) {
    return request;
  }

  const accessToken = authService.getAccessToken();
  const tokenType = authService.getTokenType();

  if (!accessToken) return request;

  const extraHeaders: Record<string, string> = {
    'Authorization': `${tokenType} ${accessToken}`,
  };

  // DPoP (RFC 9449): añadir proof para peticiones al Resource API si está habilitado.
  // El proof vincula el access_token a la clave privada efímera del cliente.
  const dpopService = injector.get(DPoPService, null);
  if (dpopService?.enabled) {
    const proof = await dpopService.createResourceProof(
      request.method,
      request.urlWithParams.split('?')[0],
      accessToken,
    );
    if (proof) {
      extraHeaders['DPoP'] = proof;
    }
  }

  return request.clone({ setHeaders: extraHeaders });
}

/**
 * Maneja errores de autenticación/autorización recuperables vía refresh.
 */
function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  injector: Injector
): Observable<HttpEvent<unknown>> {
  // Verificar si ya alcanzamos el máximo de reintentos
  const currentRetries = retryCount.get(request.url) || 0;
  if (currentRetries >= MAX_RETRIES) {
    retryCount.delete(request.url);
    // Limpiar sesión sin forzar redirección de página completa.
    getAuthServiceAsync(injector).then(authService => {
      authService?.clearSession();
    });
    return throwError(() => new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
  }

  // Incrementar contador de reintentos
  retryCount.set(request.url, currentRetries + 1);

  if (!isRefreshing) {
    isRefreshing = true;
    refreshCompleted$.next(false);

    // Obtener servicio de forma async y hacer refresh
    return from(getAuthServiceAsync(injector)).pipe(
      switchMap((authService): Observable<HttpEvent<unknown>> => {
        if (!authService) {
          isRefreshing = false;
          refreshCompleted$.next(true);
          return throwError(() => new Error('No se pudo obtener el servicio de autenticación'));
        }
        
        return authService.refreshTokens().pipe(
          switchMap((): Observable<HttpEvent<unknown>> => {
            isRefreshing = false;
            refreshCompleted$.next(true);
            
            // Limpiar contador después de éxito
            retryCount.delete(request.url);
            
            // Reintentar la petición original con nuevo token
            return from(addAuthHeader(request, injector)).pipe(
              switchMap((retryRequest) => next(retryRequest))
            );
          }),
          catchError(() => {
            isRefreshing = false;
            refreshCompleted$.next(true);
            retryCount.delete(request.url);
            
            // Limpiar sesión sin forzar recarga de documento si el refresh falla.
            authService.clearSession();
            
            return throwError(() => new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
          })
        );
      })
    );
  } else {
    // Si ya hay un refresh en progreso, esperar a que termine
    return refreshCompleted$.pipe(
      filter(completed => completed),
      take(1),
      switchMap((): Observable<HttpEvent<unknown>> => {
        return from(getAuthServiceAsync(injector)).pipe(
          switchMap((authService): Observable<HttpEvent<unknown>> => {
            // Verificar si el usuario sigue autenticado después del refresh
            if (!authService?.isAuthenticated()) {
              retryCount.delete(request.url);
              return throwError(() => new Error('Sesión expirada. Por favor inicia sesión nuevamente.'));
            }
            
            // Limpiar contador después de éxito
            retryCount.delete(request.url);
            
            // Reintentar la petición con nuevo token
            return from(addAuthHeader(request, injector)).pipe(
              switchMap((retryRequest) => next(retryRequest))
            );
          })
        );
      })
    );
  }
}
