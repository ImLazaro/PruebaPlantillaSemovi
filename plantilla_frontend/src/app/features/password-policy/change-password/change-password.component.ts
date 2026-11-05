import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AccountActionsService } from '@/app/core/auth';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { SimpleHeaderComponent } from '@/app/shared/components/simple-header/simple-header.component';
import { InstitutionalCardComponent } from '@/app/shared/components/institutional-card/institutional-card.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { OidcAuthService } from '@/app/core/auth';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, SimpleHeaderComponent, InstitutionalCardComponent, InstitutionalButtonComponent],
  template: `
    <app-simple-header title="Cambiar Contraseña" subtitle="Actualiza tu contraseña de acceso"></app-simple-header>

    <div class="institutional-content">
      <div *ngIf="successMessage" class="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
        <span class="material-symbols-outlined text-green-600">check_circle</span>
        <span class="text-sm font-medium">{{ successMessage }}</span>
      </div>

      <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
        <div class="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-institucional-primario/10 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-institucional-primario text-3xl">lock_reset</span>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900">Contraseña de acceso</h3>
              <p class="text-sm text-gray-600 mt-1">
                El cambio se realiza de forma segura en el servidor de autenticación.
              </p>
            </div>
          </div>
          <app-institutional-button
            [config]="{ variant: 'primary', icon: 'lock_reset', iconPosition: 'left', size: 'lg', disabled: initiating }"
            (clicked)="changePassword()">
            {{ initiating ? 'Redirigiendo...' : 'Cambiar contraseña' }}
          </app-institutional-button>
        </div>
      </app-institutional-card>
    </div>
  `
})
export class ChangePasswordComponent implements OnInit {
  initiating = false;
  successMessage = '';

  constructor(
    private accountActions: AccountActionsService,
    private notify: NotificationService,
    private route: ActivatedRoute,
    private oidcAuthService: OidcAuthService,
  ) {}

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    const state = this.route.snapshot.queryParamMap.get('state');
    if (status === 'success' && this.oidcAuthService.validateAccountActionState(state)) {
      this.successMessage = 'La contraseña se actualizó correctamente.';
    }
  }

  changePassword(): void {
    this.initiating = true;
    this.accountActions.startChangePasswordFlow('/profile').catch(() => {
      this.initiating = false;
      this.notify.error('Error', 'No se pudo iniciar el cambio de contraseña');
    });
  }
}
