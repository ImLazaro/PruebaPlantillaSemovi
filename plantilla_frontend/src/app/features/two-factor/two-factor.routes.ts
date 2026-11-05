import { Route } from '@angular/router';
import { secureAuthGuard } from '../../core/auth';

export const TwoFactorRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./two-factor-settings/two-factor-settings.component').then(m => m.TwoFactorSettingsComponent),
    canActivate: [secureAuthGuard]
  }
];
