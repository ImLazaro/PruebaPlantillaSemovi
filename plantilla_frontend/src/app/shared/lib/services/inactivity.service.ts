import { inject, Injectable, Injector, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import type { OidcAuthService } from '../../../core/auth';

export type InactivityState = 'active' | 'idle' | 'expired';

/**
 * InactivityService — Detecta inactividad global del usuario.
 *
 * - active  → el usuario ha interactuado recientemente
 * - idle    → sin actividad durante `idleMs` (default: 50 min)
 * - expired → sin actividad durante `sessionMs` (default: 60 min) → cierra sesión
 *
 * Uso:
 *   Inyectar en el AppComponent y llamar a `start()` / `stop()`.
 *   Suscribirse a `state$` para reaccionar en el header u otros componentes.
 */
@Injectable({ providedIn: 'root' })
export class InactivityService implements OnDestroy {
  // Tiempos por defecto
  private idleMs = 50 * 60 * 1000;    // 50 minutos → idle (naranja)
  private sessionMs = 60 * 60 * 1000; // 60 minutos (1 hora) → logout

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private countdownNotificationId: string | null = null;

  private readonly _state$ = new BehaviorSubject<InactivityState>('active');
  /** Estado observable: 'active' | 'idle' | 'expired' */
  readonly state$: Observable<InactivityState> = this._state$.asObservable();

  /** Eventos del navegador que se consideran "actividad" */
  private readonly EVENTS = [
    'mousemove', 'mousedown', 'keydown',
    'touchstart', 'touchmove', 'wheel', 'scroll', 'click',
  ] as const;

  private boundHandler: () => void;
  private running = false;
  private readonly injector = inject(Injector);

  constructor(private zone: NgZone, private notificationService: NotificationService) {
    this.boundHandler = () => this.onActivity();
  }

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  /**
   * Inicia la detección de inactividad.
   * @param idleMs    ms sin actividad para pasar a 'idle'   (default: 10 min)
   * @param sessionMs ms sin actividad para cerrar sesión    (default: 15 min)
   */
  start(idleMs = this.idleMs, sessionMs = this.sessionMs): void {
    if (this.running) return;
    this.running = true;
    this.idleMs = idleMs;
    this.sessionMs = sessionMs;

    // Escuchar eventos FUERA de Zone para no saturar el change-detection
    this.zone.runOutsideAngular(() => {
      this.EVENTS.forEach(ev =>
        window.addEventListener(ev, this.boundHandler, { passive: true })
      );
    });

    this.scheduleTimers();
  }

  /** Detiene la detección (útil al cerrar sesión o en páginas sin auth). */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.clearTimers();
    this.dismissCountdownNotification();

    this.EVENTS.forEach(ev =>
      window.removeEventListener(ev, this.boundHandler)
    );

    this.zone.run(() => this._state$.next('active'));
  }

  ngOnDestroy(): void {
    this.stop();
  }

  // ── Helpers privados ─────────────────────────────────────────────────────

  private onActivity(): void {
    if (!this.running) return;
    this.clearTimers();
    this.dismissCountdownNotification();

    // Volver a 'active' dentro de Zone para que Angular detecte el cambio
    if (this._state$.value !== 'active') {
      this.zone.run(() => this._state$.next('active'));
    }

    this.scheduleTimers();
  }

  private scheduleTimers(): void {
    // Timer de inactividad (idle)
    this.idleTimer = setTimeout(() => {
      this.zone.run(() => {
        this._state$.next('idle');
        this.startCountdownNotification();
      });
    }, this.idleMs);

    // Timer de expiración de sesión
    this.sessionTimer = setTimeout(() => {
      this.zone.run(async () => {
        this._state$.next('expired');
        this.dismissCountdownNotification();
        this.stop();
        // Revocar tokens en servidor + limpiar sesión local + redirigir al login
        const { OidcAuthService: OidcCls } = await import('../../../core/auth');
        const oidc = this.injector.get<OidcAuthService>(OidcCls);
        await oidc.logoutAndReauthenticate('/dashboard');
      });
    }, this.sessionMs);
  }

  private clearTimers(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.sessionTimer !== null) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /** Lanza la notificación persistente con cuenta regresiva. */
  private startCountdownNotification(): void {
    const remainingMs = this.sessionMs - this.idleMs;
    let remainingSec = Math.round(remainingMs / 1000);

    const formatTime = (secs: number): string => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s} seg`;
    };

    // Notificación persistente (duration 0 = no auto-dismiss)
    this.countdownNotificationId = this.notificationService.show({
      type: 'warning',
      title: 'Sesión por expirar',
      message: `Tu sesión cerrará en ${formatTime(remainingSec)}. Mueve el ratón para continuar.`,
      duration: 0,
    });

    // Actualizar el mensaje cada segundo
    this.countdownInterval = setInterval(() => {
      remainingSec--;
      if (remainingSec <= 0) {
        this.dismissCountdownNotification();
        return;
      }
      if (this.countdownNotificationId) {
        this.notificationService.update(this.countdownNotificationId, {
          message: `Tu sesión cerrará en ${formatTime(remainingSec)}. Mueve el ratón para continuar.`,
        });
      }
    }, 1000);
  }

  /** Descarta la notificación y limpia el intervalo. */
  private dismissCountdownNotification(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.countdownNotificationId) {
      this.notificationService.dismiss(this.countdownNotificationId);
      this.countdownNotificationId = null;
    }
  }

  /** Estado actual (snapshot síncrono). */
  get currentState(): InactivityState {
    return this._state$.value;
  }
}
