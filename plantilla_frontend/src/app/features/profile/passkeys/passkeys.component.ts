import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { SimpleHeaderComponent } from '@/app/shared/components/simple-header/simple-header.component';
import { InstitutionalCardComponent } from '@/app/shared/components/institutional-card/institutional-card.component';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '@/app/shared/components/modals/confirmation-modal/confirmation-modal.component';
import { OidcAuthService } from '@/app/core/auth';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { environment } from '../../../../environments/environment';

interface CredentialListItemDto {
  id: string;
  name?: string;
  aaguid?: string;
  credentialType?: string;
  createdAt?: string;
  lastUsedAt?: string;
  transports?: string[];
}

@Component({
  selector: 'app-passkeys',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule,
    SimpleHeaderComponent, InstitutionalCardComponent, InstitutionalButtonComponent,
    ConfirmationModalComponent,
  ],
  template: `
    <app-simple-header
      title="Mis llaves de acceso (Passkeys)"
      subtitle="Administra tus credenciales WebAuthn para inicio de sesión sin contraseña"
      [showBackButton]="true"
      backRoute="/profile"
      backText="Volver a mi perfil">
    </app-simple-header>

    <div class="institutional-content">

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-16">
        <span class="material-symbols-outlined animate-spin text-institucional-primario text-4xl">refresh</span>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="!loading && credentials.length === 0"
        class="flex flex-col items-center justify-center py-20 text-gray-400">
        <span class="material-symbols-outlined text-6xl mb-4">passkey</span>
        <p class="text-lg font-medium">Sin passkeys registradas</p>
        <p class="text-sm mt-1">Cuando configures una llave de acceso aparecerá aquí</p>
      </div>

      <!-- Grid de passkeys -->
      <div *ngIf="!loading && credentials.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <app-institutional-card
          *ngFor="let cred of credentials"
          [config]="{ variant: 'standard', size: 'auto', showHeader: false, showShadow: true }">
          <div class="p-4">
            <div class="flex items-start gap-3 mb-4">
              <div class="p-2 bg-institucional-primario/10 rounded-lg shrink-0">
                <span class="material-symbols-outlined text-institucional-primario text-2xl">passkey</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate">
                  {{ cred.name || 'Passkey sin nombre' }}
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ formatType(cred.credentialType) }}
                </p>
              </div>
            </div>

            <div class="space-y-1.5 text-xs text-gray-500 mb-4">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">schedule</span>
                Creada: {{ cred.createdAt | date:'dd/MM/yyyy' }}
              </div>
              <div class="flex items-center gap-1.5" *ngIf="cred.lastUsedAt">
                <span class="material-symbols-outlined text-sm">login</span>
                Último uso: {{ cred.lastUsedAt | date:'dd/MM/yyyy HH:mm' }}
              </div>
              <div class="flex items-center gap-1.5" *ngIf="cred.transports?.length">
                <span class="material-symbols-outlined text-sm">devices</span>
                {{ cred.transports!.join(', ') }}
              </div>
            </div>

            <div class="border-t pt-3 flex justify-end">
              <app-institutional-button
                variant="danger"
                size="sm"
                icon="delete"
                [disabled]="deletingId === cred.id"
                (click)="confirmDelete(cred)">
                Eliminar
              </app-institutional-button>
            </div>
          </div>
        </app-institutional-card>
      </div>

      <!-- Nota informativa -->
      <div *ngIf="!loading" class="mt-6 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
        <span class="material-symbols-outlined text-blue-500 shrink-0">info</span>
        <div class="text-sm text-blue-700">
          <p class="font-medium mb-1">¿Qué son las passkeys?</p>
          <p>Las llaves de acceso (passkeys) te permiten iniciar sesión usando biometría o PIN del dispositivo, sin necesidad de contraseña.</p>
        </div>
      </div>
    </div>

    <!-- Confirmación eliminación -->
    <app-confirmation-modal
      [isOpen]="confirmModal.isOpen"
      [config]="confirmModal.config"
      [isLoading]="confirmModal.isLoading"
      (confirm)="confirmModal.onConfirm()"
      (cancel)="confirmModal.isOpen = false">
    </app-confirmation-modal>
  `
})
export class PasskeysComponent implements OnInit, OnDestroy {

  credentials: CredentialListItemDto[] = [];
  loading = false;
  deletingId: string | null = null;

  confirmModal = {
    isOpen: false, isLoading: false,
    config: {} as ConfirmationConfig,
    onConfirm: () => {}
  };

  private destroy$ = new Subject<void>();

  constructor(
    private authService: OidcAuthService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCredentials();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCredentials(): void {
    this.loading = true;
    this.authService.requestWithAuth<CredentialListItemDto[]>(
      'GET', `${environment.ssoUrl}/webauthn/credentials`
    ).pipe(
      finalize(() => { this.loading = false; this.cdr.markForCheck(); }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => {
        this.credentials = Array.isArray(data) ? data : [];
        this.cdr.markForCheck();
      },
      error: () => this.notification.error('Error', 'No se pudieron cargar las passkeys')
    });
  }

  confirmDelete(cred: CredentialListItemDto): void {
    this.confirmModal.config = {
      title: 'Eliminar passkey',
      message: `¿Eliminar la passkey "${cred.name || 'sin nombre'}"? No podrás usarla para iniciar sesión.`,
      type: 'danger', confirmText: 'Eliminar', cancelText: 'Cancelar', confirmIcon: 'delete'
    };
    this.confirmModal.onConfirm = () => this.deleteCredential(cred.id);
    this.confirmModal.isOpen = true;
    this.cdr.markForCheck();
  }

  deleteCredential(id: string): void {
    this.deletingId = id;
    this.confirmModal.isLoading = true;

    this.authService.requestWithAuth<void>(
      'DELETE', `${environment.ssoUrl}/webauthn/credentials/${id}`
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.credentials = this.credentials.filter(c => c.id !== id);
          this.notification.success('Éxito', 'Passkey eliminada correctamente');
          this.confirmModal.isOpen = false;
          this.confirmModal.isLoading = false;
          this.deletingId = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Error', 'No se pudo eliminar la passkey');
          this.confirmModal.isOpen = false;
          this.confirmModal.isLoading = false;
          this.deletingId = null;
          this.cdr.markForCheck();
        }
      });
  }

  formatType(type: string | undefined): string {
    if (!type) return 'Credencial WebAuthn';
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
