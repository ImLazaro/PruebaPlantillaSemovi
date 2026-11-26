import { computed, inject, Injectable } from '@angular/core';
import { OidcAuthService } from '../index';

/**
 * Fachada de autenticación para las vistas de la aplicación.
 *
 * No reimplementa nada: delega en `OidcAuthService` (implementación canónica
 * de OAuth/OIDC) y expone solo lo que las pantallas necesitan, para que las
 * features no dependan de los detalles internos del flujo OIDC.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oidc = inject(OidcAuthService);

  /** Usuario en sesión (o `null`). */
  readonly user = computed(() => this.oidc.getCurrentUser());

  /** Identificador del área del empleado en sesión, si existe. */
  readonly areaId = computed(() => this.user()?.employee?.area?.id ?? null);

  isAuthenticated(): boolean {
    return this.oidc.isAuthenticated();
  }

  /** Cierra la sesión usando el flujo oficial de la plantilla. */
  logout(redirectTo = '/'): Promise<void> {
    return this.oidc.logoutAsync(redirectTo);
  }
}
