import { Routes } from '@angular/router';
import { provideInicioCoordinacion } from './services/inicio-coordinacion.providers';
import { InicioCoordinacionStore } from './services/inicio-coordinacion.store';

/**
 * Cambiar `useMock` a `false` cuando el backend exponga los endpoints
 * documentados en `README.md` de esta feature.
 */
export const InicioCoordinacionRoutes: Routes = [
  {
    path: '',
    providers: [...provideInicioCoordinacion({ useMock: true }), InicioCoordinacionStore],
    loadComponent: () => import('./inicio-coordinacion.component')
      .then(m => m.InicioCoordinacionComponent),
  },
];
