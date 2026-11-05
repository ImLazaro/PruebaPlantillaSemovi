import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputEnhancedComponent } from '../input-enhanced/input-enhanced.component';
import { ButtonConfig } from '../../buttons/institutional-button/institutional-button.component';

/**
 * InputButtonGroupComponent
 * @description Componente que agrupa un input enhanced con un botón institucional al lado.
 * Útil para campos que necesitan una acción asociada (generar ID, buscar, etc.)
 * 
 * @example
 * <app-input-button-group
 *   [control]="deviceIdControl"
 *   label="ID del Dispositivo"
 *   placeholder="device-12345"
 *   iconLeft="key"
 *   helperText="Identificador único"
 *   [buttonConfig]="{ variant: 'ghost', icon: 'autorenew', iconPosition: 'only' }"
 *   buttonTitle="Generar nuevo ID"
 *   (clicked)="generateId()"
 * />
 */
@Component({
  selector: 'app-input-button-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputEnhancedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="input-button-group" [class]="computedGroupClass">
      @if (label) {
        <label class="input-button-group__label">{{ label }}</label>
      }
      <div class="input-button-group__container">
        <div class="input-button-group__input">
          <app-input-enhanced
            [control]="control"
            label=""
            [type]="type"
            [placeholder]="placeholder || ''"
            [iconLeft]="iconLeft"
            [iconRight]="iconRight"
            [helperText]="''"
            [readonly]="readonly"
            [disabled]="disabled"
            [showPasswordToggle]="showPasswordToggle"
            [floating]="false"
            [clear]="clear"
            [size]="size"
            [variant]="variant"
          />
        </div>
        <button
          type="button"
          class="input-button-group__button"
          [class.input-button-group__button--disabled]="buttonDisabled"
          [disabled]="buttonDisabled"
          [title]="buttonTitle || ''"
          (click)="onButtonClick()">
          <span class="material-symbols-outlined">{{ buttonConfig.icon || 'autorenew' }}</span>
        </button>
      </div>
      @if (helperText) {
        <span class="input-button-group__helper">{{ helperText }}</span>
      }
    </div>
  `,
  styles: [`
    .input-button-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .input-button-group__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #4b5563);
      margin-bottom: 0.25rem;
    }

    .input-button-group__container {
      display: flex;
      align-items: stretch;
    }

    .input-button-group__input {
      flex: 1;
      min-width: 0;
    }

    /* Ocultar el wrapper externo del input para alinear correctamente */
    .input-button-group__input ::ng-deep .input-container {
      margin: 0;
    }

    /* Eliminar border-radius derecho del input */
    .input-button-group__input ::ng-deep .input-wrapper,
    .input-button-group__input ::ng-deep input {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      border-right: none !important;
    }

    .input-button-group__button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.75rem;
      min-width: 2.75rem;
      height: 2.625rem; /* Altura del input md (42px) */
      background-color: var(--bg-secondary, #f3f4f6);
      border: 1px solid var(--border-color, #d1d5db);
      border-left: none;
      border-top-right-radius: 0.375rem;
      border-bottom-right-radius: 0.375rem;
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .input-button-group__button:hover:not(:disabled) {
      background-color: var(--institucional-primario, #8b1538);
      color: white;
      border-color: var(--institucional-primario, #8b1538);
    }

    .input-button-group__button:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(139, 21, 56, 0.2);
    }

    .input-button-group__button--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-button-group__button .material-symbols-outlined {
      font-size: 1.25rem;
    }

    .input-button-group__helper {
      font-size: 0.75rem;
      color: var(--text-muted, #9ca3af);
    }

    /* Variante stacked (botón debajo) */
    .input-button-group--stacked .input-button-group__container {
      flex-direction: column;
    }

    .input-button-group--stacked .input-button-group__input ::ng-deep .input-wrapper,
    .input-button-group--stacked .input-button-group__input ::ng-deep input {
      border-radius: 0.375rem !important;
      border-right: 1px solid var(--border-color, #d1d5db) !important;
      border-bottom: none !important;
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    .input-button-group--stacked .input-button-group__button {
      border-radius: 0 0 0.375rem 0.375rem;
      border-left: 1px solid var(--border-color, #d1d5db);
      border-top: none;
      width: 100%;
      padding: 0.5rem;
    }
  `]
})
export class InputButtonGroupComponent {
  // Props del Input
  @Input() control!: FormControl;
  @Input() label?: string;
  @Input() type: string = 'text';
  @Input() placeholder?: string;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() helperText?: string;
  @Input() helperPosition: 'top' | 'bottom' = 'bottom';
  @Input() readonly = false;
  @Input() disabled = false;
  @Input() showPasswordToggle = false;
  @Input() floating = false;
  @Input() clear = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'filled' | 'outlined' = 'outlined';
  @Input() inputFlex: string = '1';

  // Props del Botón
  @Input() buttonConfig: ButtonConfig = { variant: 'ghost', icon: 'autorenew', iconPosition: 'only', shape: 'square' };
  @Input() buttonText?: string;
  @Input() buttonTitle?: string;
  @Input() buttonDisabled = false;

  // Props del Grupo
  @Input() groupClass?: string;
  @Input() layout: 'inline' | 'stacked' = 'inline';

  // Eventos
  @Output() buttonClick = new EventEmitter<void>();

  onButtonClick(): void {
    if (!this.buttonDisabled) {
      this.buttonClick.emit();
    }
  }

  get effectiveButtonConfig(): ButtonConfig {
    return {
      ...this.buttonConfig,
      disabled: this.buttonDisabled,
      shape: this.buttonConfig.shape || 'square' // Forma cuadrada por defecto en el grupo
    };
  }

  get computedGroupClass(): string {
    const classes = ['input-button-group'];
    if (this.layout === 'stacked') {
      classes.push('input-button-group--stacked');
    }
    if (this.groupClass) {
      classes.push(this.groupClass);
    }
    return classes.join(' ');
  }
}
