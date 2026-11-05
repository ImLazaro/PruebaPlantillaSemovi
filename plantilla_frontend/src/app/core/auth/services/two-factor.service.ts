/**
 * TwoFactorService - Estado de autenticación de dos factores
 * Los endpoints /2fa están en Identity (ssoUrl).
 */
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TwoFactorStatusDto } from '../../identity/models/dto';
import { OidcAuthService } from './oidc-auth.service';

@Injectable({
  providedIn: 'root'
})
export class TwoFactorService {
  private readonly baseUrl = `${environment.ssoUrl}/2fa`;

  constructor(private readonly auth: OidcAuthService) {}

  /**
   * GET /2fa/status - Obtener estado de 2FA del usuario actual (requiere JWT)
   */
  getStatus(): Observable<TwoFactorStatusDto> {
    return this.auth.requestWithAuth<TwoFactorStatusDto>('GET', `${this.baseUrl}/status`);
  }
}

