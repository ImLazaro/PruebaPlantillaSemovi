import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../shared/lib/services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'No fue posible completar la operación. Intenta nuevamente.';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = 'Ocurrió un problema de conexión. Verifica tu internet e inténtalo nuevamente.';
      } else {
        const url = req.url.toLowerCase();
        const backendMessage =
          typeof error?.error?.message === 'string'
            ? error.error.message.toLowerCase()
            : '';

        // Server-side error
        switch (error.status) {
          case 401:
            // Los 401 los maneja secureAuthInterceptor (refresco de token)
            return throwError(() => error);
          case 400:
            if (url.includes('/oauth') || url.includes('/login') || url.includes('/authorize')) {
              errorMessage = 'No fue posible validar el inicio de sesión. Verifica la información e inténtalo nuevamente.';
              break;
            }
            if (url.includes('2fa') || url.includes('totp') || url.includes('mfa')) {
              errorMessage = 'El código de verificación no es válido o ya expiró. Ingresa un código nuevo.';
              break;
            }
            if (url.includes('password')) {
              if (backendMessage.includes('requisito')) {
                errorMessage = 'La nueva contraseña no cumple los requisitos de seguridad. Revisa las reglas e inténtalo nuevamente.';
              } else {
                errorMessage = 'No fue posible actualizar la contraseña con los datos ingresados. Verifica la información e inténtalo nuevamente.';
              }
              break;
            }
            errorMessage = 'Los datos enviados no son válidos. Verifica la información e inténtalo nuevamente.';
            break;
          case 403:
            errorMessage = 'No cuentas con permisos para realizar esta acción.';
            break;
          case 404:
            errorMessage = 'La información solicitada no está disponible.';
            break;
          case 409:
            errorMessage = 'No fue posible completar la operación por un conflicto de datos. Actualiza la información e inténtalo nuevamente.';
            break;
          case 422:
            errorMessage = 'La información enviada no cumple las validaciones requeridas.';
            break;
          case 429:
            errorMessage = 'Realizaste demasiados intentos en poco tiempo. Espera unos minutos e inténtalo nuevamente.';
            break;
          case 503:
            errorMessage = 'No fue posible validar tu sesión en este momento. Intenta nuevamente sin cerrar sesión.';
            break;
          case 500:
            errorMessage = 'Ocurrió un problema temporal del servicio. Intenta nuevamente en unos minutos.';
            break;
          default:
            errorMessage = 'No fue posible completar la operación en este momento. Intenta nuevamente.';
        }
      }

      // Show notification for user-facing errors
      if (error.status !== 401) {
        notificationService.error('Error', errorMessage);
      }

      return throwError(() => error);
    })
  );
};
