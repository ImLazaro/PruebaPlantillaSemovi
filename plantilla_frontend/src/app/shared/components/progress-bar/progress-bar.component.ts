import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSize, UiVariant } from '../_ui-types';

export type ProgressBarVariant = UiVariant;
export type ProgressBarSize    = UiSize;
export type ProgressBarStyle   = 'solid' | 'striped' | 'gradient';

export interface ProgressBarConfig {
  /** Variante de color. Default: 'primary' */
  variant?: ProgressBarVariant;
  /** Tamaño (alto de la barra). Default: 'md' */
  size?: ProgressBarSize;
  /** Estilo de relleno. Default: 'solid' */
  style?: ProgressBarStyle;
  /** Muestra el porcentaje. Default: false */
  showPercent?: boolean;
  /** Posición del label. Default: 'inside' (solo si size='lg') */
  labelPosition?: 'inside' | 'outside' | 'none';
  /** Label personalizado. Default: 'X%' */
  label?: string;
  /** Muestra la barra en estado indeterminado (animación infinita). Default: false */
  indeterminate?: boolean;
  /** Redondeado. Default: true */
  rounded?: boolean;
  /** Color de fondo de la pista. Default: '#e5e7eb' */
  trackColor?: string;
  /** Clase adicional. */
  customClass?: string;
  /** Animación de relleno suave. Default: true */
  animated?: boolean;
}

const VARIANT_COLOR: Record<ProgressBarVariant, string> = {
  primary:   'var(--institucional-primario)',
  secondary: 'var(--institucional-secundario)',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  ghost:     '#9ca3af',
};

const VARIANT_GRADIENT: Record<ProgressBarVariant, string> = {
  primary:   'linear-gradient(90deg, var(--institucional-secundario), var(--institucional-primario))',
  secondary: 'linear-gradient(90deg, var(--institucional-vino), var(--institucional-secundario))',
  success:   'linear-gradient(90deg, #059669, #10b981)',
  warning:   'linear-gradient(90deg, #d97706, #fbbf24)',
  danger:    'linear-gradient(90deg, #dc2626, #f87171)',
  ghost:     'linear-gradient(90deg, #6b7280, #9ca3af)',
};

/**
 * ProgressBarComponent
 *
 * Barra de progreso con soporte para porcentaje, variantes de color,
 * estilo degradado institucional y modo indeterminado.
 *
 * @example Simple:
 * ```html
 * <app-progress-bar [value]="65" [config]="{ showPercent: true }" />
 * ```
 *
 * @example Indeterminado (carga):
 * ```html
 * <app-progress-bar [config]="{ indeterminate: true, variant: 'primary' }" />
 * ```
 *
 * @example Gradient con label:
 * ```html
 * <app-progress-bar
 *   [value]="42"
 *   [config]="{ style: 'gradient', size: 'lg', labelPosition: 'inside', label: '42 / 100 permisos' }" />
 * ```
 */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .pb-root {
      font-family: 'Montserrat', sans-serif;
      width: 100%;
    }

    /* Label outside */
    .pb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-6);
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: #374151;
    }

    /* Track */
    .pb-track {
      position: relative;
      overflow: hidden;
      background: #e5e7eb;
      border-radius: var(--radius-pill);
    }
    .pb-track.no-round { border-radius: 0; }

    /* Sizes */
    .pb-sm .pb-track { height: 0.375rem; }
    .pb-md .pb-track { height: 0.625rem; }
    .pb-lg .pb-track { height: 1.25rem;  }

    /* Fill */
    .pb-fill {
      position: absolute;
      inset: 0;
      left: 0;
      height: 100%;
      border-radius: var(--radius-pill);
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pb-track.no-round .pb-fill { border-radius: 0; }

    /* Striped overlay */
    .pb-striped .pb-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.15),
        rgba(255,255,255,0.15) 6px,
        transparent 6px,
        transparent 12px
      );
    }

    /* Indeterminate */
    @keyframes pb-indeterminate {
      0%   { left: -40%; width: 40%; }
      50%  { left: 20%;  width: 60%; }
      100% { left: 100%; width: 40%; }
    }
    .pb-fill.indeterminate {
      width: 40% !important;
      animation: pb-indeterminate 1.5s ease-in-out infinite;
      border-radius: var(--radius-pill);
    }

    /* Label inside (lg only) */
    .pb-label-inside {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      padding: 0 var(--space-8);
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.95);
      pointer-events: none;
      white-space: nowrap;
      overflow: hidden;
    }
  `],
  template: `
    <div class="pb-root" [class]="'pb-' + resolvedSize" [class]="cfg.customClass ?? ''">

      <!-- Label exterior -->
      <div *ngIf="showOutsideLabel" class="pb-header">
        <span>{{ cfg.label }}</span>
        <span *ngIf="cfg.showPercent">{{ clampedValue }}%</span>
      </div>

      <!-- Track + fill -->
      <div class="pb-track"
        [class.no-round]="cfg.rounded === false"
        [class.pb-striped]="cfg.style === 'striped'"
        [style.background]="cfg.trackColor ?? '#e5e7eb'"
        [attr.role]="'progressbar'"
        [attr.aria-valuenow]="cfg.indeterminate ? null : clampedValue"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="100">

        <div class="pb-fill"
          [class.indeterminate]="cfg.indeterminate"
          [style.width]="cfg.indeterminate ? null : clampedValue + '%'"
          [style.background]="fillBackground">
        </div>

        <!-- Label inside -->
        <span *ngIf="showInsideLabel" class="pb-label-inside">
          {{ cfg.label ?? (clampedValue + '%') }}
        </span>
      </div>

    </div>
  `
})
export class ProgressBarComponent {
  /** Valor de progreso 0-100. */
  @Input() value = 0;
  /** Configuración. */
  @Input() config: ProgressBarConfig = {};

  get cfg(): ProgressBarConfig { return this.config; }

  get resolvedSize(): string { return this.cfg.size ?? 'md'; }

  get clampedValue(): number {
    return Math.min(100, Math.max(0, this.value ?? 0));
  }

  get fillBackground(): string {
    const v = this.cfg.variant ?? 'primary';
    if (this.cfg.style === 'gradient') return VARIANT_GRADIENT[v];
    return VARIANT_COLOR[v];
  }

  get showOutsideLabel(): boolean {
    const pos = this.cfg.labelPosition;
    if (pos === 'none') return false;
    if (pos === 'inside') return false;
    return !!(this.cfg.label || this.cfg.showPercent);
  }

  get showInsideLabel(): boolean {
    const pos = this.cfg.labelPosition;
    if (pos === 'inside') return true;
    if (!pos && this.resolvedSize === 'lg' && (this.cfg.label || this.cfg.showPercent)) return true;
    return false;
  }
}
