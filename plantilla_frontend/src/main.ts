/**
 * =====================================================================
 * APLICACIÓN IAM - Bootstrap Configuration
 * =====================================================================
 * 
 * Configuración principal de la aplicación Angular.
 * 
 * SEGURIDAD: Usa el interceptor secureAuthInterceptor para enviar
 * Authorization: Bearer al gateway ERP y delegar refresh OAuth estándar.
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { routes, unauthorizedRoute } from './app/app.routes';
import { secureAuthInterceptor } from './app/core/auth';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([...routes, unauthorizedRoute]),
    provideHttpClient(
      withInterceptors([
        secureAuthInterceptor, // Interceptor seguro con Bearer token
        errorInterceptor
      ])
    ),
    provideAnimations(),
  // Material Design providers: habilitar MatIconModule para <mat-icon>
  importProvidersFrom(MatIconModule),
  ]
}).catch(err => console.error(err));
