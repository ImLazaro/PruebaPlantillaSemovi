/**
 * OAuth Callback Component
 *
 * Handles the redirect back from Identity after the user logs in.
 * Reads `code` and `state` from query params, exchanges the code for
 * tokens via OidcAuthService, then navigates to the original destination.
 */
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OidcAuthService } from '../../core/auth';
import { UniversalIconComponent } from '../../shared/components/universal-icon/universal-icon.component';
import { InstitutionalButtonComponent } from '../../shared/components/buttons/institutional-button/institutional-button.component';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, UniversalIconComponent, InstitutionalButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-2xl w-full text-center">
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12">

          <!-- Estado: procesando -->
          @if (isProcessing) {
            <div class="flex flex-col items-center gap-6">
              <div class="oauth-callback-spinner"></div>
              <h3 class="text-2xl font-semibold text-institucional-primario">Autenticando</h3>
              <p class="text-gray-600 text-lg">{{ processingMessage }}</p>
              <div class="flex justify-center space-x-2 mt-2">
                <div class="w-3 h-3 bg-institucional-primario rounded-full animate-bounce"></div>
                <div class="w-3 h-3 bg-institucional-primario rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
                <div class="w-3 h-3 bg-institucional-primario rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
              </div>
            </div>
          }

          <!-- Estado: error -->
          @if (error) {
            <!-- Icono de error -->
            <div class="mx-auto h-24 w-24 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform hover:scale-105 transition-all duration-300">
              <app-universal-icon
                [name]="'exclamation-triangle-fill'"
                [type]="'bootstrap'"
                [size]="44"
                class="flex-shrink-0 text-white">
              </app-universal-icon>
            </div>

            <!-- Título -->
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Error de Autenticación
            </h2>

            <!-- Descripción -->
            <p class="text-lg text-gray-600 mb-8 leading-relaxed">
              {{ error }}
            </p>

            <!-- Acciones -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <app-institutional-button
                [config]="{
                  variant: 'primary',
                  icon: 'login',
                  iconPosition: 'left',
                  loading: (authInProgress$ | async) ?? false,
                  customClass: 'w-full sm:w-auto transform hover:scale-[1.02] shadow-lg hover:shadow-xl'
                }"
                (clicked)="goToLogin()">
                Ir al inicio de sesión
              </app-institutional-button>
            </div>
          }

          <!-- Footer -->
          @if (!isProcessing || error) {
            <div class="text-center mt-8 pt-6 border-t border-gray-200 border-opacity-50">
              <div class="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <div class="h-6 w-6 bg-institucional-guinda rounded-lg flex items-center justify-center shadow-sm">
                  <app-universal-icon
                    [name]="'verified_user'"
                    [type]="'material'"
                    [size]="12"
                    class="flex-shrink-0 text-white">
                  </app-universal-icon>
                </div>
                <span class="font-medium">© 2025 Portal de Identidad</span>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Sistema de Soporte Técnico - <span class="font-semibold">Versión 1.0.0</span>
              </p>
            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback-spinner {
      border: 4px solid #e5e7eb;
      border-top: 4px solid var(--institucional-primario, #9D2449);
      border-radius: 50%;
      width: 56px;
      height: 56px;
      animation: oauth-spin 1s linear infinite;
    }

    @keyframes oauth-spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  private static readonly ERROR_TRANSITION_DELAY_MS = 2500;

  isProcessing = true;
  error: string | null = null;
  processingMessage = 'Procesando autenticación...';
  authInProgress$ = this.oidcAuthService.authInProgress$;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly oidcAuthService: OidcAuthService,
  ) {}

  ngOnInit(): void {
    this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    const params = this.route.snapshot.queryParams;
    const errorParam = params['error'] as string | undefined;

    if (errorParam) {
      // login_required viene del silent-auth (prompt=none) cuando la cookie SSO
      // expiró o no existe. Limpiamos el indicador y arrancamos login interactivo.
      if (errorParam === 'login_required') {
        localStorage.removeItem('oidc_si');
        await this.oidcAuthService.initiateLoginRedirect('/dashboard');
        return;
      }
      await this.showErrorWithDelay(this.mapOAuthError(errorParam));
      return;
    }

    const code = params['code'] as string | undefined;
    const state = params['state'] as string | undefined;

    if (!code || !state) {
      await this.showErrorWithDelay(
        'No recibimos una respuesta válida del servidor de autenticación. Intenta iniciar sesión nuevamente.',
      );
      return;
    }

    this.processingMessage = 'Verificando credenciales...';

    const result = await this.oidcAuthService.handleAuthCallback(code, state);

    if (!result.success) {
      if (result.oauthErrorCode === 'invalid_grant') {
        await this.oidcAuthService.clearServerSideSession();
        await this.oidcAuthService.initiateLoginRedirect(
          sessionStorage.getItem('pkce_return_url') ?? '/dashboard',
        );
        return;
      }
      await this.showErrorWithDelay(result.message);
      return;
    }

    this.processingMessage = 'Sesión iniciada correctamente. Redirigiendo...';

    let returnUrl = sessionStorage.getItem('pkce_return_url') ?? '/dashboard';
    sessionStorage.removeItem('pkce_return_url');

    // Prevención de Open Redirect: solo aceptar rutas internas
    try {
      const decoded = decodeURIComponent(returnUrl);
      if (
        !decoded.startsWith('/') ||
        decoded.startsWith('//') ||
        decoded.includes('\\') ||
        new URL(decoded, window.location.origin).origin !== window.location.origin
      ) {
        returnUrl = '/dashboard';
      }
    } catch {
      returnUrl = '/dashboard';
    }

    // Small delay to improve UX when redirecting from auth server
    await new Promise<void>(resolve => setTimeout(resolve, 700));
    await this.router.navigateByUrl(returnUrl);
  }

  private mapOAuthError(errorCode: string): string {
    const fallbackByCode: Record<string, string> = {
      access_denied: 'No se completó el inicio de sesión. Vuelve a intentarlo cuando estés listo.',
      invalid_state: 'La solicitud de inicio de sesión ya no es válida. Inicia sesión nuevamente.',
      invalid_grant: 'La sesión expiró por inactividad. Inicia sesión nuevamente.',
      invalid_request: 'La solicitud de inicio de sesión no es válida. Inténtalo nuevamente desde el portal.',
      temporarily_unavailable: 'El servicio no está disponible temporalmente. Intenta nuevamente en unos minutos.',
      server_error: 'El servicio presentó un problema temporal. Intenta nuevamente en unos minutos.',
    };

    return fallbackByCode[errorCode] ?? 'No fue posible completar la autenticación. Intenta nuevamente.';
  }

  private async showErrorWithDelay(message: string): Promise<void> {
    this.processingMessage = 'Validando respuesta del servidor...';
    await new Promise<void>(resolve => setTimeout(resolve, OAuthCallbackComponent.ERROR_TRANSITION_DELAY_MS));
    this.isProcessing = false;
    this.error = message;
  }

  goToLogin(): void {
    void this.oidcAuthService.initiateLoginRedirect();
  }
}
