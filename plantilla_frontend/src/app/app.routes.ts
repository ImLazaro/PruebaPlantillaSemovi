import { Routes } from '@angular/router';
import { secureAuthGuard } from './core/auth';
import { environment } from '../environments/environment';

/** Rutas base de la plantilla. Las features del nuevo producto se agregan aquí. */
export const routes: Routes = [
  {
    path: 'auth/callback',
    loadComponent: () => import('./auth/oauth-callback/oauth-callback.component')
      .then(m => m.OAuthCallbackComponent),
  },
  {
    path: '',
    loadComponent: () => import('./public/welcome/welcome.component')
      .then(m => m.WelcomeComponent),
    pathMatch: 'full',
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent),
    canActivate: [secureAuthGuard],
  },
  {
    path: 'profile/passkeys',
    loadComponent: () => import('./features/profile/passkeys/passkeys.component')
      .then(m => m.PasskeysComponent),
    canActivate: [secureAuthGuard],
  },
  {
    path: 'two-factor',
    loadChildren: () => import('./features/two-factor/two-factor.routes')
      .then(m => m.TwoFactorRoutes),
    canActivate: [secureAuthGuard],
  },
  {
    path: 'coordinacion',
    loadChildren: () => import('./features/inicio-coordinacion/inicio-coordinacion.routes')
      .then(m => m.InicioCoordinacionRoutes),
   // canActivate: [secureAuthGuard],
  },
  // Vista previa sin autenticación, solo en desarrollo (no existe en producción).
  ...(environment.production ? [] : [{
    path: 'preview/coordinacion',
    loadChildren: () => import('./features/inicio-coordinacion/inicio-coordinacion.routes')
      .then(m => m.InicioCoordinacionRoutes),
  }]),
  {
    path: 'unauthorized',
    loadComponent: () => import('./shared/components/unauthorized/unauthorized.component')
      .then(m => m.UnauthorizedComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component')
      .then(m => m.NotFoundComponent),
  },
];

export const unauthorizedRoute = {
  path: 'unauthorized',
  loadComponent: () => import('./shared/components/unauthorized/unauthorized.component')
    .then(m => m.UnauthorizedComponent),
};
