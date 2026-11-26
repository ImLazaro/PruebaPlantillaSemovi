import { computed, inject, Injectable } from '@angular/core';
import { OidcAuthService } from '@/app/core/auth';

/** Datos del usuario en sesión listos para mostrar en las vistas. */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(OidcAuthService);

  /** Nombre para mostrar; si no hay empleado asociado, la parte local del correo. */
  readonly fullName = computed(() => {
    const user = this.auth.getCurrentUser();
    const emp = user?.employee;
    if (emp) return [emp.firstName, emp.lastName].filter(Boolean).join(' ');
    return user?.email?.split('@')[0] ?? 'Usuario';
  });

  /** Área del empleado en sesión (vacío si no tiene). */
  readonly areaName = computed(() => this.auth.getCurrentUser()?.employee?.area?.name ?? '');
}
