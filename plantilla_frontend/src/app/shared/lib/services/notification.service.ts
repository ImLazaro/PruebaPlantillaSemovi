import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  constructor(private ngZone: NgZone) {}

  getNotifications() {
    return this.notifications$.asObservable();
  }

  show(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, newNotification]);

    // Auto-dismiss después del tiempo especificado
    if (newNotification.duration && newNotification.duration > 0) {
      // Usar NgZone para asegurar que Angular detecte el cambio
      this.ngZone.runOutsideAngular(() => {
        const timeoutId = setTimeout(() => {
          this.ngZone.run(() => {
            this.dismiss(id);
          });
        }, newNotification.duration);
      });
    }

    return id;
  }

  success(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  // Alias para compatibilidad con componentes que usan showSuccess
  showSuccess(title: string, message: string, duration?: number): string {
    return this.success(title, message, duration);
  }

  error(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: duration ?? 8000 // Errores duran más tiempo
    });
  }

  // Alias para compatibilidad con componentes que usan showError
  showError(title: string, message: string, duration?: number): string {
    return this.error(title, message, duration);
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message: string, duration?: number): string {
    return this.info(title, message, duration);
  }

  showWarning(title: string, message: string, duration?: number): string {
    return this.warning(title, message, duration);
  }

  dismiss(id: string): void {
    const currentNotifications = this.notifications$.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(updatedNotifications);
  }

  /** Actualiza el mensaje de una notificación existente sin descartarla. */
  update(id: string, changes: Partial<Pick<Notification, 'title' | 'message'>>): void {
    const updated = this.notifications$.value.map(n =>
      n.id === id ? { ...n, ...changes } : n
    );
    this.notifications$.next(updated);
  }

  dismissAll(): void {
    this.notifications$.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
