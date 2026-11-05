import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiVariant } from '../_ui-types';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';
import { ConfirmationModalComponent, ConfirmationConfig } from '../modals/confirmation-modal/confirmation-modal.component';

export interface ConfirmActionButtonConfig {
  label: string;
  icon?: string;
  variant?: UiVariant;
  size?: 'sm' | 'md' | 'lg';
  modal: ConfirmationConfig;
}

@Component({
  selector: 'app-confirm-action-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InstitutionalButtonComponent, ConfirmationModalComponent],
  template: `
    <app-institutional-button
      [config]="{ variant: cfg.variant || 'danger', size: cfg.size || 'sm', icon: cfg.icon || 'warning', iconPosition: 'left', disabled: disabled || loading }"
      (clicked)="openModal()">
      {{ cfg.label }}
    </app-institutional-button>

    <app-confirmation-modal
      [isOpen]="isOpen"
      [isLoading]="loading"
      [config]="cfg.modal"
      (confirm)="confirm.emit()"
      (cancel)="closeModal()"
      (modalClose)="closeModal()">
    </app-confirmation-modal>
  `
})
export class ConfirmActionButtonComponent {
  @Input() config: ConfirmActionButtonConfig = {
    label: 'Confirmar',
    modal: { title: 'Confirmar accion', message: 'Deseas continuar?', type: 'warning' }
  };
  @Input() disabled = false;
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();

  isOpen = false;

  get cfg(): ConfirmActionButtonConfig { return this.config; }

  openModal(): void { this.isOpen = true; }
  closeModal(): void { this.isOpen = false; }
}
