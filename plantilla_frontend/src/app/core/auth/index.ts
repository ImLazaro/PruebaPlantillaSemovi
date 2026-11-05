/**
 * Punto de entrada público para autenticación.
 * Las implementaciones permanecen en sus ubicaciones actuales durante la
 * migración para conservar compatibilidad con consumidores existentes.
 */
export { OidcAuthService } from '../services/oidc-auth.service';
export { AccountActionsService } from '../services/account-actions.service';
export { TwoFactorService } from '../services/two-factor.service';
export { PasswordService } from '../services/password.service';
export { PkceService } from '../services/pkce.service';
export { DPoPService } from '../services/dpop.service';
export { secureAuthGuard } from '../guards/secure-auth.guard';
export { secureAuthInterceptor } from '../interceptors/secure-auth-fn.interceptor';
