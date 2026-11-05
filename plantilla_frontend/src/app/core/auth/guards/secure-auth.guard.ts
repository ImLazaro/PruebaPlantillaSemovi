/**
 * =====================================================================
 * SECURE AUTH GUARD
 * =====================================================================
 * 
 * Guard de autenticación que usa el OidcAuthService.
 * Verifica que el usuario esté autenticado antes de permitir
 * el acceso a rutas protegidas.
 * 
 * Características:
 * - Verifica estado de autenticación con tokens OIDC
 * - Redirige a login si no está autenticado
 * - Preserva la URL de retorno para redirección después del login
 * 
 * @author Security Team
 * @version 1.0.0
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { OidcAuthService } from '../services/oidc-auth.service';

/**
 * Guard funcional de autenticación segura
 */
export const secureAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(OidcAuthService);

  return authService.authState$.pipe(
    // Esperar a que termine de cargar (isLoading = false)
    filter(authState => !authState.isLoading),
    take(1),
    map(authState => {
      if (authState.isAuthenticated) {
        return true;
      }
      
      // Guardar la URL de retorno
      const returnUrl = state.url;
      
      void authService.initiateLoginRedirect(returnUrl);
      
      return false;
    })
  );
};

/**
 * Guard para rutas que solo deben ser accesibles si NO está autenticado
 * (por ejemplo, la página de login)
 */
export const guestOnlyGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(OidcAuthService);
  const router = inject(Router);

  return authService.authState$.pipe(
    // Esperar a que termine de cargar
    filter(authState => !authState.isLoading),
    take(1),
    map(authState => {
      if (!authState.isAuthenticated) {
        return true;
      }
      
      // Si está autenticado, redirigir al dashboard
      router.navigate(['/dashboard']);
      
      return false;
    })
  );
};
