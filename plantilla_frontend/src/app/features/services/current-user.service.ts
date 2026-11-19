import { inject, Injectable } from '@angular/core';
import { OidcAuthService } from '@/app/core/auth';

export interface CurrentUserInfo {
  nombre: string;
  area: string;
}

/** Datos del usuario en sesión listos para mostrar en las vistas. */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(OidcAuthService);

  getInfo(fallbackArea = 'Coordinación Técnica'): CurrentUserInfo {
    const user = this.auth.getCurrentUser();
    const emp = user?.employee;
    const nombre = emp
      ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
      : user?.email?.split('@')[0] ?? fallbackArea;
    return { nombre, area: emp?.area?.name ?? fallbackArea };
  }
}
