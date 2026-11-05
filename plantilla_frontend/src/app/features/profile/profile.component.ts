import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SimpleHeaderComponent } from '@/app/shared/components/simple-header/simple-header.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalCardComponent } from '@/app/shared/components/institutional-card/institutional-card.component';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { BadgeGroupComponent, BadgeItem } from '@/app/shared/components/badge';
import { AccountActionsService, OidcAuthService, TwoFactorService } from '../../core/auth';
import { OidcUserDto } from '../../core/identity';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, SimpleHeaderComponent, InstitutionalButtonComponent, InstitutionalCardComponent, BadgeGroupComponent],
  template: `
    <app-simple-header
      [title]="'Mi Perfil'"
      [subtitle]="'Información de tu cuenta y opciones de seguridad'"
      [showBackButton]="false">
    </app-simple-header>

    <div class="institutional-content space-y-6">

      <!-- === HERO CARD === -->
      <div class="bg-white rounded-xl shadow-institucional overflow-hidden">
        <div class="bg-gradient-institucional px-6 py-8">
          <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <!-- Avatar -->
            <div class="bg-white/15 rounded-full p-4 border-2 border-white/30 flex-shrink-0">
              <span class="material-symbols-outlined text-5xl text-white">account_circle</span>
            </div>
            <!-- Info principal -->
            <div class="text-white text-center sm:text-left min-w-0">
              <h2 class="text-2xl font-bold tracking-tight">
                {{ fullName }}
              </h2>
              <p class="text-white/75 mt-1 text-sm">{{ currentUser?.email || 'Sin correo' }}</p>
              <app-badge-group
                class="mt-3"
                [badges]="heroBadges"
                [config]="{ orientation: 'horizontal', spacing: 'normal', wrap: true }">
              </app-badge-group>
            </div>
          </div>
        </div>
      </div>

      <!-- === GRID: info + seguridad === -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">

        <!-- Información personal -->
        <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }">
          <div slot="header" class="card-institucional-header flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">person</span>
            <span>Información personal</span>
          </div>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-institucional-guinda mt-0.5">badge</span>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Nombre completo</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ fullName }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-institucional-guinda mt-0.5">email</span>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Correo electrónico</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ currentUser?.email || '' }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3" *ngIf="currentUser?.employee?.puesto?.name">
              <span class="material-symbols-outlined text-institucional-guinda mt-0.5">work</span>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Puesto</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ currentUser?.employee?.puesto?.name }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3" *ngIf="currentUser?.employee?.area?.name">
              <span class="material-symbols-outlined text-institucional-guinda mt-0.5">corporate_fare</span>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Área</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">{{ currentUser?.employee?.area?.name }}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-institucional-guinda mt-0.5">admin_panel_settings</span>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Rol</p>
                <p class="text-sm font-semibold text-gray-900 mt-0.5">
                  {{ currentUser?.role?.name || 'Sin rol asignado' }}
                </p>
              </div>
            </div>
          </div>
        </app-institutional-card>

        <!-- Estado de seguridad -->
        <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }">
          <div slot="header" class="card-institucional-header flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">security</span>
            <span>Estado de seguridad</span>
          </div>
          <div class="space-y-4">
            <!-- Verificación -->
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="material-symbols-outlined text-base">verified</span>
                Cuenta verificada
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                [ngClass]="currentUser?.isVerified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'">
                {{ currentUser?.isVerified ? 'Verificada' : 'Sin verificar' }}
              </span>
            </div>
            <div *ngIf="currentUser?.isVerified === false" class="flex items-start gap-2 py-2 border-b border-gray-50">
              <span class="material-symbols-outlined text-amber-500 text-base mt-0.5">mail</span>
              <p class="text-xs text-amber-700">
                Verifica tu correo para confirmar la propiedad de tu cuenta. Te enviaremos un enlace seguro de un solo uso.
              </p>
            </div>
            <!-- TOTP -->
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="material-symbols-outlined text-base">phonelink_lock</span>
                Autenticación de dos factores
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                [ngClass]="is2faEnabled
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'">
                {{ twoFaStatusLabel }}
              </span>
            </div>
            <!-- Método TOTP -->
            <div *ngIf="is2faEnabled && currentUser?.twoFactorMethod"
              class="flex items-center justify-between py-2 border-b border-gray-50">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="material-symbols-outlined text-base">devices</span>
                Método TOTP
              </div>
              <span class="text-xs font-medium text-gray-700 capitalize">{{ currentUser?.twoFactorMethod }}</span>
            </div>
            <!-- Recomendación TOTP -->
            <div *ngIf="!is2faEnabled" class="flex items-start gap-2 py-2 border-b border-gray-50">
              <span class="material-symbols-outlined text-amber-500 text-base mt-0.5">tips_and_updates</span>
              <p class="text-xs text-amber-700">
                <strong>Recomendado:</strong> Configura una app autenticadora (TOTP) para mayor seguridad. El OTP por email es el m&eacute;todo predeterminado, pero TOTP es m&aacute;s seguro.
              </p>
            </div>
            <!-- Último login -->
            <div class="flex items-center justify-between py-2 border-b border-gray-50">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="material-symbols-outlined text-base">login</span>
                Último acceso
              </div>
              <span class="text-xs font-medium text-gray-700">{{ lastLoginLabel }}</span>
            </div>
            <!-- Cambio de contraseña -->
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="material-symbols-outlined text-base">lock_reset</span>
                Último cambio de contraseña
              </div>
              <span class="text-xs font-medium text-gray-700">{{ lastPasswordChangeLabel }}</span>
            </div>
          </div>
        </app-institutional-card>
      </div>

      <!-- === ACCIONES DEL SERVIDOR DE AUTENTICACIÓN === -->
      <div>
        <div *ngIf="isAuthenticated && currentUser; else noSessionBlock"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <!-- Cambiar contraseña -->
            <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }"
              [class.opacity-60]="actionLoading === 'change-password'">
              <div slot="header" class="card-institucional-header flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">lock_reset</span>
                <span>Cambiar contraseña</span>
              </div>
              <div class="flex flex-col items-center text-center pb-2">
                <p class="text-sm text-gray-500 leading-relaxed">Actualiza tu contraseña de acceso de forma segura</p>
              </div>
              <div slot="footer" class="w-full">
                <app-institutional-button
                  [config]="{ variant: 'primary', size: 'md', icon: actionLoading === 'change-password' ? 'hourglass_top' : 'key', iconPosition: 'right', fullWidth: true, disabled: !!actionLoading }"
                  (clicked)="!actionLoading && triggerSensitiveAction('change-password')">
                  {{ actionLoading === 'change-password' ? 'Redirigiendo...' : 'Actualizar' }}
                </app-institutional-button>
              </div>
            </app-institutional-card>

            <!-- Configurar / Reconfigurar TOTP -->
            <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }"
              [class.opacity-60]="actionLoading === '2fa-setup'">
              <div slot="header" class="card-institucional-header flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">phonelink_lock</span>
                <span>{{ is2faEnabled ? 'Reconfigurar TOTP' : 'Activar TOTP' }}</span>
                <span *ngIf="!is2faEnabled" class="ml-auto text-xs font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full">Recomendado</span>
              </div>
              <div class="flex flex-col items-center text-center pb-2">
                <p class="text-sm text-gray-500 leading-relaxed">
                  {{ is2faEnabled
                     ? 'Cambia tu app o dispositivo autenticador'
                     : 'Usa Google Authenticator o Authy para mayor seguridad' }}
                </p>
              </div>
              <div slot="footer" class="w-full">
                <app-institutional-button
                  [config]="{ variant: 'secondary', size: 'md', icon: actionLoading === '2fa-setup' ? 'hourglass_top' : 'qr_code_scanner', iconPosition: 'right', fullWidth: true, disabled: !!actionLoading }"
                  (clicked)="!actionLoading && triggerSensitiveAction('2fa-setup')">
                  {{ actionLoading === '2fa-setup' ? 'Redirigiendo...' : (is2faEnabled ? 'Reconfigurar' : 'Configurar') }}
                </app-institutional-button>
              </div>
            </app-institutional-card>

            <!-- Desactivar TOTP (solo si está activo) -->
            <app-institutional-card *ngIf="is2faEnabled"
              [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }"
              [class.opacity-60]="actionLoading === '2fa-disable'">
              <div slot="header" class="card-institucional-header flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">no_encryption</span>
                <span>Desactivar TOTP</span>
              </div>
              <div class="flex flex-col items-center text-center pb-2">
                <p class="text-sm text-gray-500 leading-relaxed">Elimina la verificación en dos pasos de tu cuenta</p>
              </div>
              <div slot="footer" class="w-full">
                <app-institutional-button
                  [config]="{ variant: 'danger', size: 'md', icon: actionLoading === '2fa-disable' ? 'hourglass_top' : 'block', iconPosition: 'left', fullWidth: true, disabled: !!actionLoading }"
                  (clicked)="!actionLoading && triggerSensitiveAction('2fa-disable')">
                  {{ actionLoading === '2fa-disable' ? 'Redirigiendo...' : 'Deshabilitar' }}
                </app-institutional-button>
              </div>
            </app-institutional-card>

            <app-institutional-card *ngIf="currentUser?.isVerified === false"
              [config]="{ variant: 'standard', size: 'auto', showShadow: true, showBorder: false }"
              [class.opacity-60]="actionLoading === 'verify-email'">
              <div slot="header" class="card-institucional-header flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">mark_email_unread</span>
                <span>Verificar correo</span>
              </div>
              <div class="flex flex-col items-center text-center pb-2">
                <p class="text-sm text-gray-500 leading-relaxed">
                  Envía un enlace seguro a tu correo para confirmar la dirección asociada a tu cuenta.
                </p>
              </div>
              <div slot="footer" class="w-full">
                <app-institutional-button
                  [config]="{ variant: 'secondary', size: 'md', icon: actionLoading === 'verify-email' ? 'hourglass_top' : 'send', iconPosition: 'right', fullWidth: true, disabled: !!actionLoading }"
                  (clicked)="!actionLoading && sendVerificationEmail()">
                  {{ actionLoading === 'verify-email' ? 'Enviando...' : 'Enviar enlace' }}
                </app-institutional-button>
              </div>
            </app-institutional-card>

        </div>

        <ng-template #noSessionBlock>
          <div class="flex items-center gap-4 p-5 rounded-xl bg-amber-50 border border-amber-200">
            <span class="material-symbols-outlined text-3xl text-amber-500">info</span>
            <div>
              <p class="text-sm font-semibold text-amber-800">Sesión requerida</p>
              <p class="text-xs text-amber-700 mt-0.5">
                Debes tener una sesión activa para administrar las opciones de seguridad de tu cuenta.
              </p>
            </div>
          </div>
        </ng-template>
      </div>

    </div>
  `,
  styles: []
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(OidcAuthService);
  private readonly twoFactorService = inject(TwoFactorService);
  private readonly accountActionsService = inject(AccountActionsService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  currentUser: OidcUserDto | null = null;
  isAuthenticated = false;
  is2faEnabled = false;
  twoFaStatusLabel = 'No disponible';
  actionLoading: 'change-password' | '2fa-setup' | '2fa-disable' | 'verify-email' | null = null;

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        this.currentUser = user;
        this.is2faEnabled = user?.is2faEnabled ?? false;
      });

    this.authService.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isAuth => {
        this.isAuthenticated = isAuth;
        if (!isAuth) {
          void this.router.navigateByUrl('/profile', { replaceUrl: true });
        }
      });

    this.twoFactorService.getStatus()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.twoFaStatusLabel = 'No disponible';
          return of(null);
        })
      )
      .subscribe(status => {
        if (!status) return;
        this.is2faEnabled = !!status.is2faEnabled;
        this.twoFaStatusLabel = this.is2faEnabled ? 'TOTP (app autenticadora)' : 'OTP email (predeterminado)';
      });
  }

  get fullName(): string {
    const p = this.currentUser?.employee;
    if (!p) return this.currentUser?.email?.split('@')[0] ?? 'Usuario';
    return [p.firstName, p.lastName, p.secondLastName].filter(Boolean).join(' ');
  }

  get lastLoginLabel(): string {
    return this.currentUser?.lastLogin
      ? this.formatDate(this.currentUser.lastLogin)
      : 'No disponible';
  }

  get lastPasswordChangeLabel(): string {
    return this.currentUser?.lastPasswordChange
      ? this.formatDate(this.currentUser.lastPasswordChange)
      : 'No disponible';
  }

  get heroBadges(): BadgeItem[] {
    const badges: BadgeItem[] = [];

    if (this.hasRole()) {
      badges.push({
        id: 'role',
        content: this.currentUser?.role?.name || 'Sin rol',
        variant: 'secondary',
        size: 'sm',
        icon: 'shield'
      });
    }

    badges.push({
      id: 'session',
      content: this.isAuthenticated ? 'Sesión activa' : 'Sin sesión',
      variant: this.isAuthenticated ? 'success' : 'danger',
      size: 'sm',
      icon: this.isAuthenticated ? 'check_circle' : 'cancel'
    });

    badges.push({
      id: 'twofa',
      content: this.is2faEnabled ? 'TOTP activo' : 'Solo OTP email',
      variant: this.is2faEnabled ? 'primary' : 'warning',
      size: 'sm',
      icon: this.is2faEnabled ? 'verified_user' : 'mark_email_read'
    });

    return badges;
  }

  /** @deprecated usar lastLoginLabel */
  get lastVerificationLabel(): string {
    return this.lastLoginLabel;
  }

  hasRole(): boolean {
    return !!this.currentUser?.role;
  }

  async triggerSensitiveAction(action: 'change-password' | '2fa-setup' | '2fa-disable'): Promise<void> {
    if (this.actionLoading) return;
    this.actionLoading = action;
    try {
      await this.authService.initiateAccountAction(action, '/profile');
    } catch {
      this.actionLoading = null;
      this.notificationService.error(
        'No fue posible iniciar el flujo seguro',
        'Verifica tu conexión e inténtalo de nuevo. Si el problema persiste, contacta al administrador.'
      );
    }
  }

  async sendVerificationEmail(): Promise<void> {
    if (this.actionLoading) return;
    this.actionLoading = 'verify-email';
    try {
      await this.accountActionsService.sendVerificationEmail('/profile');
      this.notificationService.success(
        'Correo enviado',
        'Si tu cuenta aún no está verificada, te enviamos un enlace seguro a tu correo electrónico.'
      );
    } catch {
      this.notificationService.error(
        'No fue posible enviar el correo de verificación',
        'Verifica tu conexión e inténtalo de nuevo. Si el problema persiste, contacta al administrador.'
      );
    } finally {
      this.actionLoading = null;
    }
  }

  private formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'No disponible';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
