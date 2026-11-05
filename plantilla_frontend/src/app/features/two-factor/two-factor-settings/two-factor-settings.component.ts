import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SimpleHeaderComponent } from '@/app/shared/components/simple-header/simple-header.component';
import { InstitutionalCardComponent } from '@/app/shared/components/institutional-card/institutional-card.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalBadgeComponent, BadgeConfig } from '@/app/shared/components/badge';
import { SkeletonLoaderComponent } from '@/app/shared/components/skeleton-loader/skeleton-loader.component';
import { AccountActionsService, TwoFactorService } from '@/app/core/auth';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { OidcAuthService } from '@/app/core/auth';

@Component({
  selector: 'app-two-factor-settings',
  standalone: true,
  imports: [
    CommonModule,
    SimpleHeaderComponent,
    InstitutionalCardComponent,
    InstitutionalButtonComponent,
    InstitutionalBadgeComponent,
    SkeletonLoaderComponent,
  ],
  template: `
    <app-simple-header [title]="pageTitle" [subtitle]="pageSubtitle"></app-simple-header>

    <div class="institutional-content">

      <!-- Banner informativo: OTP email siempre activo -->
      <div class="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl">
        <span class="material-symbols-outlined text-blue-500 mt-0.5">mark_email_read</span>
        <div class="text-sm">
          <p class="font-semibold">OTP por email — activo para todos los usuarios</p>
          <p class="mt-0.5 text-blue-700">Al iniciar sesión siempre recibirás un código de verificación en tu correo. Este es el método predeterminado del sistema.</p>
        </div>
      </div>

      <!-- Recomendación TOTP (solo cuando no está configurado) -->
      <div *ngIf="!is2faEnabled" class="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl">
        <span class="material-symbols-outlined text-amber-500 mt-0.5">tips_and_updates</span>
        <div class="text-sm">
          <p class="font-semibold">Recomendación: configura una app autenticadora (TOTP)</p>
          <p class="mt-0.5 text-amber-700">TOTP genera códigos en tu dispositivo sin depender del correo. Es más rápido, más seguro y no requiere conexión a internet para generar el código.</p>
        </div>
      </div>
      <div *ngIf="successMessage" class="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
        <span class="material-symbols-outlined text-green-600">check_circle</span>
        <span class="text-sm font-medium">{{ successMessage }}</span>
      </div>

      <!-- Estado actual de 2FA -->
      <div class="mb-6">
        <app-institutional-card
          [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-2">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full flex items-center justify-center"
                   [class.bg-green-100]="is2faEnabled"
                   [class.bg-gray-100]="!is2faEnabled">
                <span class="material-symbols-outlined text-3xl"
                      [class.text-green-600]="is2faEnabled"
                      [class.text-gray-400]="!is2faEnabled">
                  {{ is2faEnabled ? 'verified_user' : 'shield' }}
                </span>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Autenticador TOTP</h3>
                <p class="text-sm text-gray-600 mt-1">
                  {{ is2faEnabled
                     ? 'Tu cuenta usa TOTP como segundo factor (recomendado)'
                     : 'Configura una app autenticadora para usar TOTP en lugar del OTP por email' }}
                </p>
                <div class="mt-2">
                  <app-institutional-badge [config]="getStatusBadgeConfig()">
                    {{ is2faEnabled ? 'TOTP activo — Recomendado' : 'Solo OTP email (predeterminado)' }}
                  </app-institutional-badge>
                </div>
              </div>
            </div>
            <div>
              <app-institutional-button
                *ngIf="!is2faEnabled"
                [config]="{ variant: 'primary', icon: 'security', iconPosition: 'left', size: 'lg', disabled: loading || initiating }"
                (clicked)="setup2fa()">
                {{ initiating ? 'Redirigiendo...' : 'Configurar TOTP (Recomendado)' }}
              </app-institutional-button>
              <app-institutional-button
                *ngIf="is2faEnabled"
                [config]="{ variant: 'danger', icon: 'lock_open', iconPosition: 'left', size: 'lg', disabled: loading || initiating }"
                (clicked)="disable2fa()">
                {{ initiating ? 'Redirigiendo...' : 'Desactivar' }}
              </app-institutional-button>
            </div>
          </div>
        </app-institutional-card>
      </div>

      <!-- Información sobre 2FA -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <app-institutional-card
          [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
          <div class="p-2 text-center">
            <div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="material-symbols-outlined text-amber-600 text-2xl">smartphone</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-1">
              App autenticadora
              <span class="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Recomendado</span>
            </h4>
            <p class="text-sm text-gray-600">Usa Google Authenticator, Authy u otra app compatible con TOTP para obtener códigos sin depender del correo.</p>
          </div>
        </app-institutional-card>

        <app-institutional-card
          [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
          <div class="p-2 text-center">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="material-symbols-outlined text-blue-600 text-2xl">mark_email_read</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-1">OTP por email</h4>
            <p class="text-sm text-gray-600">Activo por defecto para todos los usuarios. Recibes un código en tu correo cada vez que inicias sesión.</p>
          </div>
        </app-institutional-card>

        <app-institutional-card
          [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
          <div class="p-2 text-center">
            <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="material-symbols-outlined text-yellow-600 text-2xl">key</span>
            </div>
            <h4 class="font-semibold text-gray-900 mb-1">Códigos de respaldo</h4>
            <p class="text-sm text-gray-600">Al activar TOTP obtendrás códigos de respaldo. Guárdalos en un lugar seguro.</p>
          </div>
        </app-institutional-card>
      </div>

      <!-- Loading skeleton (mientras se carga el estado 2FA) -->
      <app-skeleton-loader
        *ngIf="loading"
        [config]="{ variant: 'card', rows: 3 }">
      </app-skeleton-loader>
    </div>
  `
})
export class TwoFactorSettingsComponent implements OnInit, OnDestroy {
  pageTitle = 'Autenticación 2FA';
  pageSubtitle = 'OTP por email está activo por defecto. Configura TOTP para mayor seguridad (recomendado).';

  is2faEnabled = false;
  loading = false;
  initiating = false;
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private twoFactorService: TwoFactorService,
    private accountActions: AccountActionsService,
    private notification: NotificationService,
    private route: ActivatedRoute,
    private oidcAuthService: OidcAuthService,
  ) {}

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    const state = this.route.snapshot.queryParamMap.get('state');
    if (status === 'success' && this.oidcAuthService.validateAccountActionState(state)) {
      this.successMessage = 'La configuración de 2FA se actualizó correctamente.';
    }
    this.loadStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStatus(): void {
    this.loading = true;
    this.twoFactorService.getStatus()
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: unknown) => {
          const resp = response as { is2faEnabled?: boolean; enabled?: boolean };
          this.is2faEnabled = resp.is2faEnabled || resp.enabled || false;
        },
        error: () => { /* silenciar si el endpoint no responde */ },
      });
  }

  getStatusBadgeConfig(): BadgeConfig {
    return {
      variant: this.is2faEnabled ? 'success' : 'secondary',
      size: 'md',
      icon: this.is2faEnabled ? 'check_circle' : 'cancel',
    };
  }

  setup2fa(): void {
    this.initiating = true;
    this.accountActions.startTwoFactorSetupFlow('/profile').catch(() => {
      this.initiating = false;
      this.notification.error('Error', 'No se pudo iniciar la configuración de 2FA');
    });
  }

  disable2fa(): void {
    this.initiating = true;
    this.accountActions.startTwoFactorDisableFlow('/profile').catch(() => {
      this.initiating = false;
      this.notification.error('Error', 'No se pudo iniciar la desactivación de 2FA');
    });
  }
}
