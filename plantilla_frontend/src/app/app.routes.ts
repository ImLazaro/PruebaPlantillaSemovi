import { Routes } from '@angular/router';
import { secureAuthGuard } from './core/auth';
import { environment } from '../environments/environment';
import { provideInicioCoordinacion } from './features/services/coordination.service';
import { provideActualizacionExtemporanea } from './features/services/actualizacion-extemporanea-cifras.service';
import { provideReportesEstadisticas } from './features/services/reportes-estadisticas-consolidadas.service';

const loadInicioCoordinacion = () => import('./features/inicio-coordinacion/inicio-coordinacion.component')
  .then(m => m.InicioCoordinacionComponent);
const loadActualizacionExtemporanea = () =>
  import('./features/actualizacion-extemporanea-cifras/actualizacion-extemporanea-cifras.component')
    .then(m => m.ActualizacionExtemporaneaCifrasComponent);
const loadInicio = () => import('./features/inicio/inicio.component')
  .then(m => m.InicioComponent);
const loadCapturaSemanal = () => import('./features/captura-semanal/capture-week.component')
  .then(m => m.CapturaSemanalComponent);
const loadReportesEstadisticas = () =>
  import('./features/reportes-estadisticas-consolidadas/reportes-estadisticas-consolidadas.component')
    .then(m => m.ReportesEstadisticasConsolidadasComponent);

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
    loadComponent: loadInicioCoordinacion,
    // Cambiar useMock a false cuando el backend exponga los endpoints de features/models/coordination.model.ts
    providers: provideInicioCoordinacion({ useMock: true }),
    canActivate: [secureAuthGuard],
  },
  {
    path: 'actualizacion-extemporanea',
    loadComponent: loadActualizacionExtemporanea,
    // Cambiar useMock a false cuando el backend exponga los endpoints de features/models/actualizacion-extemporanea-cifras.model.ts
    providers: provideActualizacionExtemporanea({ useMock: true }),
    canActivate: [secureAuthGuard],
  },
  {
    path: 'inicio',
    loadComponent: loadInicio,
    canActivate: [secureAuthGuard],
  },
  {
    path: 'captura-semanal',
    loadComponent: loadCapturaSemanal,
    canActivate: [secureAuthGuard],
  },
  {
    path: 'reportes',
    loadComponent: loadReportesEstadisticas,
    // Cambiar useMock a false cuando el backend exponga los endpoints de features/models/reportes-estadisticas-consolidadas.model.ts
    providers: provideReportesEstadisticas({ useMock: true }),
    canActivate: [secureAuthGuard],
  },
  // Vistas previas sin autenticación, solo en desarrollo (no existen en producción).
  ...(environment.production ? [] : [
    {
      path: 'preview/coordinacion',
      loadComponent: loadInicioCoordinacion,
      providers: provideInicioCoordinacion({ useMock: true }),
    },
    {
      path: 'preview/actualizacion-extemporanea',
      loadComponent: loadActualizacionExtemporanea,
      providers: provideActualizacionExtemporanea({ useMock: true }),
    },
    {
      path: 'preview/inicio',
      loadComponent: loadInicio,
    },
    {
      path: 'preview/captura-semanal',
      loadComponent: loadCapturaSemanal,
    },
    {
      path: 'preview/reportes',
      loadComponent: loadReportesEstadisticas,
      providers: provideReportesEstadisticas({ useMock: true }),
    },
  ]),
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
