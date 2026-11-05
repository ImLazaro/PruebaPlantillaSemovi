/**
 * Barrel export - Servicios compartidos (utilidades UI agnósticas de dominio)
 * @shared/lib/services
 */

export { NotificationService } from './notification.service';
export type { Notification } from './notification.service';
export { IconService } from './icon.service';
export { ValidatorsService } from './custom-validators.service';
export { ComponentLoadingService } from './component-loading.service';
export { InactivityService } from './inactivity.service';

// Adaptadores temporales hacia implementaciones canónicas
export { BaseApiService } from './base-api.service';
export { PkceService } from './pkce.service';
export { AppConfigService } from './app-config.service';
