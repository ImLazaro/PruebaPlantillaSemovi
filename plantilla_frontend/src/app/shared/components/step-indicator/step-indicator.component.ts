import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';
import { UiSize } from '../_ui-types';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error' | 'skipped';
export type StepIndicatorVariant = 'circles' | 'numbers' | 'icons' | 'dots';

export interface StepItem {
  /** Identificador del paso. */
  id: string;
  /** Etiqueta del paso. */
  label: string;
  /** Descripción opcional bajo la etiqueta. */
  description?: string;
  /** Estado del paso. Default: 'pending' */
  status?: StepStatus;
  /** Ícono cuando el variant es 'icons' (Bootstrap o Material). */
  icon?: string;
  /** Tipo de ícono. Default: 'material' */
  iconType?: 'bootstrap' | 'material';
}

export interface StepIndicatorConfig {
  /** Estilo de los nodos. Default: 'circles' */
  variant?: StepIndicatorVariant;
  /** Orientación. Default: 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** Tamaño. Default: 'md' */
  size?: UiSize;
  /** Permite navegar clicando en pasos completados/activos. Default: false */
  clickable?: boolean;
  /** Muestra las etiquetas de cada paso. Default: true */
  showLabels?: boolean;
  /** Muestra la descripción. Default: true */
  showDescription?: boolean;
  /** Línea entre pasos (solo aplica en horizontal). Default: true */
  showConnector?: boolean;
}

/* ── Colores de estado ── */
const STATUS_BG: Record<StepStatus, string> = {
  pending:   '#e5e7eb',
  active:    'var(--institucional-primario)',
  completed: '#10b981',
  error:     '#ef4444',
  skipped:   '#d1d5db',
};

const STATUS_TEXT: Record<StepStatus, string> = {
  pending:   '#6b7280',
  active:    '#fff',
  completed: '#fff',
  error:     '#fff',
  skipped:   '#9ca3af',
};

const STATUS_ICON: Record<StepStatus, string> = {
  pending:   'circle',
  active:    'radio_button_checked',
  completed: 'check',
  error:     'close',
  skipped:   'remove',
};

const STATUS_CONNECTOR: Record<StepStatus, string> = {
  pending:   '#e5e7eb',
  active:    'var(--institucional-primario)',
  completed: '#10b981',
  error:     '#ef4444',
  skipped:   '#d1d5db',
};

/**
 * StepIndicatorComponent
 *
 * Indicador visual de progreso por pasos, independiente del StepperForm.
 * Úsalo para mostrar el estado de un flujo en cualquier contexto
 * (modales, drawers, paneles de vista).
 *
 * @example Horizontal (por defecto), números:
 * ```html
 * <app-step-indicator
 *   [steps]="[
 *     { id: '1', label: 'Datos personales', status: 'completed' },
 *     { id: '2', label: 'Documentos',       status: 'active' },
 *     { id: '3', label: 'Confirmación',     status: 'pending' },
 *   ]"
 *   [config]="{ variant: 'numbers' }" />
 * ```
 *
 * @example Vertical clicable con íconos:
 * ```html
 * <app-step-indicator
 *   [steps]="steps"
 *   [config]="{ orientation: 'vertical', variant: 'icons', clickable: true }"
 *   (stepClicked)="goToStep($event)" />
 * ```
 */
@Component({
  selector: 'app-step-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent],
  styles: [`
    :host { display: block; }

    /* ───────── HORIZONTAL ───────── */
    .si-horizontal {
      display: flex;
      align-items: flex-start;
    }

    .si-step-h {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
    }

    /* Connector (línea entre nodos) */
    .si-connector-h {
      flex: 1;
      height: 2px;
      margin-top: 0;
      transition: background 0.3s ease;
      align-self: flex-start;
      margin-top: 0;
    }
    /* La línea se alinea con el centro del nodo */
    .si-node-row {
      display: flex;
      align-items: center;
      width: 100%;
    }
    .si-node-spacer { flex: 1; }

    /* ───────── VERTICAL ───────── */
    .si-vertical {
      display: flex;
      flex-direction: column;
    }

    .si-step-v {
      display: flex;
      align-items: flex-start;
      gap: var(--space-16);
      position: relative;
    }

    .si-v-node-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .si-connector-v {
      width: 2px;
      flex: 1;
      min-height: var(--space-24);
      transition: background 0.3s ease;
      margin: var(--space-4) 0;
    }
    .si-step-v:last-child .si-connector-v { display: none; }

    .si-v-content {
      flex: 1;
      padding-bottom: var(--space-24);
    }
    .si-step-v:last-child .si-v-content { padding-bottom: 0; }

    /* ───────── NODO ───────── */
    .si-node {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      font-weight: 700;
      font-family: 'Montserrat', sans-serif;
      flex-shrink: 0;
      transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
      position: relative;
      z-index: 1;
    }

    /* Sizes */
    .si-sm  .si-node { width: 1.75rem; height: 1.75rem; font-size: 0.65rem; }
    .si-md  .si-node { width: 2.25rem; height: 2.25rem; font-size: 0.75rem; }
    .si-lg  .si-node { width: 3rem;    height: 3rem;    font-size: 0.9rem;  }

    /* Dots variant (very small) */
    .si-variant-dots .si-node {
      width: 0.75rem !important;
      height: 0.75rem !important;
    }

    /* Active glow */
    .si-node.si-active {
      box-shadow: 0 0 0 4px rgba(157, 36, 73, 0.15);
    }

    /* Clickable steps */
    .si-step-h.si-clickable,
    .si-step-v.si-clickable { cursor: pointer; }
    .si-step-h.si-clickable:hover .si-node,
    .si-step-v.si-clickable:hover .si-node { transform: scale(1.1); }
    .si-step-h.si-clickable:focus-visible,
    .si-step-v.si-clickable:focus-visible {
      outline: none;
    }
    .si-step-h.si-clickable:focus-visible .si-node,
    .si-step-v.si-clickable:focus-visible .si-node {
      box-shadow: 0 0 0 4px rgba(157, 36, 73, 0.35);
    }

    /* ───────── LABELS ───────── */
    .si-label-h {
      text-align: center;
      margin-top: var(--space-8);
      padding: 0 var(--space-4);
    }
    .si-label-v {
      line-height: 1.3;
    }
    .si-label-title {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .si-sm .si-label-title  { font-size: var(--font-size-xs); }
    .si-md .si-label-title  { font-size: var(--font-size-sm); }
    .si-lg .si-label-title  { font-size: var(--font-size-md); }

    .si-label-desc {
      font-family: 'Montserrat', sans-serif;
      font-size: var(--font-size-xs);
      color: #9ca3af;
      margin-top: 2px;
      line-height: 1.4;
    }

    .si-status-active    .si-label-title { color: var(--institucional-primario); }
    .si-status-completed .si-label-title { color: #10b981; }
    .si-status-error     .si-label-title { color: #ef4444; }
    .si-status-pending   .si-label-title { color: #9ca3af; }
    .si-status-skipped   .si-label-title { color: #d1d5db; }
  `],
  template: `
    <!-- ═══════════════ HORIZONTAL ═══════════════ -->
    <div *ngIf="resolvedOrientation === 'horizontal'"
      class="si-horizontal"
      [class]="'si-' + resolvedSize + ' si-variant-' + resolvedVariant">

      <ng-container *ngFor="let step of steps; let i = index; let last = last">
        <!-- Paso -->
        <div
          class="si-step-h"
          [class]="'si-status-' + resolvedStatus(step)"
          [class.si-clickable]="isClickable(step)"
          [attr.tabindex]="isClickable(step) ? 0 : null"
          [attr.role]="isClickable(step) ? 'button' : null"
          [attr.aria-label]="'Paso ' + (i+1) + ': ' + step.label"
          [attr.aria-current]="resolvedStatus(step) === 'active' ? 'step' : null"
          (click)="onStepClick(step, i)"
          (keydown.enter)="onStepClick(step, i)">

          <!-- Nodo -->
          <div class="si-node-row">
            <!-- Conector izquierdo -->
            <div *ngIf="!isFirst(i) && cfg.showConnector !== false"
              class="si-connector-h"
              [style.background]="getConnectorColor(i)">
            </div>
            <div class="si-node-spacer" *ngIf="isFirst(i)"></div>

            <div class="si-node"
              [class.si-active]="resolvedStatus(step) === 'active'"
              [style.background]="getNodeBg(step)"
              [style.color]="getNodeText(step)">
              <!-- Dots: sin contenido interior -->
              <ng-container *ngIf="resolvedVariant !== 'dots'">
                <!-- Ícono de estado (circles / icons) -->
                <ng-container *ngIf="resolvedVariant === 'circles'">
                  <span class="material-symbols-outlined"
                    style="font-size:0.85em; font-variation-settings:'FILL' 0,'wght' 600">
                    {{ getStatusIcon(step) }}
                  </span>
                </ng-container>
                <!-- Número -->
                <ng-container *ngIf="resolvedVariant === 'numbers'">
                  <span *ngIf="resolvedStatus(step) !== 'completed' && resolvedStatus(step) !== 'error'">
                    {{ i + 1 }}
                  </span>
                  <span *ngIf="resolvedStatus(step) === 'completed'" class="material-symbols-outlined"
                    style="font-size:0.9em">check</span>
                  <span *ngIf="resolvedStatus(step) === 'error'" class="material-symbols-outlined"
                    style="font-size:0.9em">close</span>
                </ng-container>
                <!-- Ícono personalizado -->
                <ng-container *ngIf="resolvedVariant === 'icons'">
                  <app-universal-icon
                    *ngIf="step.icon"
                    [name]="step.icon"
                    [type]="step.iconType ?? 'material'"
                    [size]="resolvedSize === 'sm' ? 12 : resolvedSize === 'lg' ? 18 : 14">
                  </app-universal-icon>
                  <span *ngIf="!step.icon" class="material-symbols-outlined" style="font-size:0.9em">
                    {{ getStatusIcon(step) }}
                  </span>
                </ng-container>
              </ng-container>
            </div>

            <!-- Conector derecho -->
            <div *ngIf="!last && cfg.showConnector !== false"
              class="si-connector-h"
              [style.background]="getConnectorColor(i + 1)">
            </div>
            <div class="si-node-spacer" *ngIf="last"></div>
          </div>

          <!-- Label -->
          <div *ngIf="cfg.showLabels !== false" class="si-label-h">
            <div class="si-label-title">{{ step.label }}</div>
            <div *ngIf="step.description && cfg.showDescription !== false" class="si-label-desc">
              {{ step.description }}
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- ═══════════════ VERTICAL ═══════════════ -->
    <div *ngIf="resolvedOrientation === 'vertical'"
      class="si-vertical"
      [class]="'si-' + resolvedSize + ' si-variant-' + resolvedVariant">

      <div
        *ngFor="let step of steps; let i = index; let last = last"
        class="si-step-v"
        [class]="'si-status-' + resolvedStatus(step)"
        [class.si-clickable]="isClickable(step)"
        [attr.tabindex]="isClickable(step) ? 0 : null"
        [attr.role]="isClickable(step) ? 'button' : null"
        [attr.aria-label]="'Paso ' + (i+1) + ': ' + step.label"
        [attr.aria-current]="resolvedStatus(step) === 'active' ? 'step' : null"
        (click)="onStepClick(step, i)"
        (keydown.enter)="onStepClick(step, i)">

        <!-- Columna nodo + conector -->
        <div class="si-v-node-col">
          <div class="si-node"
            [class.si-active]="resolvedStatus(step) === 'active'"
            [style.background]="getNodeBg(step)"
            [style.color]="getNodeText(step)">
            <ng-container *ngIf="resolvedVariant !== 'dots'">
              <ng-container *ngIf="resolvedVariant === 'circles'">
                <span class="material-symbols-outlined" style="font-size:0.85em">
                  {{ getStatusIcon(step) }}
                </span>
              </ng-container>
              <ng-container *ngIf="resolvedVariant === 'numbers'">
                <span *ngIf="resolvedStatus(step) !== 'completed' && resolvedStatus(step) !== 'error'">{{ i + 1 }}</span>
                <span *ngIf="resolvedStatus(step) === 'completed'" class="material-symbols-outlined" style="font-size:0.9em">check</span>
                <span *ngIf="resolvedStatus(step) === 'error'"     class="material-symbols-outlined" style="font-size:0.9em">close</span>
              </ng-container>
              <ng-container *ngIf="resolvedVariant === 'icons'">
                <app-universal-icon
                  *ngIf="step.icon"
                  [name]="step.icon"
                  [type]="step.iconType ?? 'material'"
                  [size]="resolvedSize === 'sm' ? 12 : resolvedSize === 'lg' ? 18 : 14">
                </app-universal-icon>
                <span *ngIf="!step.icon" class="material-symbols-outlined" style="font-size:0.9em">
                  {{ getStatusIcon(step) }}
                </span>
              </ng-container>
            </ng-container>
          </div>

          <!-- Conector vertical -->
          <div *ngIf="!last"
            class="si-connector-v"
            [style.background]="getConnectorColor(i + 1)">
          </div>
        </div>

        <!-- Contenido del paso -->
        <div *ngIf="cfg.showLabels !== false" class="si-v-content si-label-v">
          <div class="si-label-title">{{ step.label }}</div>
          <div *ngIf="step.description && cfg.showDescription !== false" class="si-label-desc">
            {{ step.description }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class StepIndicatorComponent {
  /** Pasos del indicador. */
  @Input() steps: StepItem[] = [];
  /** Configuración visual. */
  @Input() config: StepIndicatorConfig = {};

  /** Emite el índice del paso clicado (config.clickable = true). */
  @Output() stepClicked = new EventEmitter<{ step: StepItem; index: number }>();

  get cfg(): StepIndicatorConfig {
    return this.config;
  }

  get resolvedOrientation(): 'horizontal' | 'vertical' {
    return this.cfg.orientation ?? 'horizontal';
  }

  get resolvedVariant(): StepIndicatorVariant {
    return this.cfg.variant ?? 'circles';
  }

  get resolvedSize(): string {
    return this.cfg.size ?? 'md';
  }

  resolvedStatus(step: StepItem): StepStatus {
    return step.status ?? 'pending';
  }

  isFirst(index: number): boolean {
    return index === 0;
  }

  isClickable(step: StepItem): boolean {
    if (!this.cfg.clickable) return false;
    const s = this.resolvedStatus(step);
    return s === 'completed' || s === 'active';
  }

  onStepClick(step: StepItem, index: number): void {
    if (!this.isClickable(step)) return;
    this.stepClicked.emit({ step, index });
  }

  getNodeBg(step: StepItem): string {
    return STATUS_BG[this.resolvedStatus(step)];
  }

  getNodeText(step: StepItem): string {
    return STATUS_TEXT[this.resolvedStatus(step)];
  }

  getStatusIcon(step: StepItem): string {
    return STATUS_ICON[this.resolvedStatus(step)];
  }

  /** Color del conector que LLEGA al paso con índice `index`. */
  getConnectorColor(index: number): string {
    if (index <= 0 || index > this.steps.length) return '#e5e7eb';
    const prevStatus = this.resolvedStatus(this.steps[index - 1]);
    return STATUS_CONNECTOR[prevStatus];
  }
}
