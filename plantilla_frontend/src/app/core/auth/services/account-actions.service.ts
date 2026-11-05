import { Injectable } from '@angular/core';

import { OidcAuthService } from './oidc-auth.service';

/**
 * Sensitive account operations must be handled by Identity account flows
 * (POST /account/initiate + OIDC action URLs), not by business API /users routes.
 */
@Injectable({
  providedIn: 'root',
})
export class AccountActionsService {
  constructor(private readonly oidcAuthService: OidcAuthService) {}

  startChangePasswordFlow(returnPath = '/profile'): Promise<void> {
    return this.oidcAuthService.initiateAccountAction('change-password', returnPath);
  }

  startTwoFactorSetupFlow(returnPath = '/profile'): Promise<void> {
    return this.oidcAuthService.initiateAccountAction('2fa-setup', returnPath);
  }

  startTwoFactorDisableFlow(returnPath = '/profile'): Promise<void> {
    return this.oidcAuthService.initiateAccountAction('2fa-disable', returnPath);
  }

  sendVerificationEmail(returnPath = '/profile', clientId?: string): Promise<void> {
    return this.oidcAuthService.requestEmailVerification(returnPath, clientId);
  }
}
