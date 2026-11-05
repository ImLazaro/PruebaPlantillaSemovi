import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';
import { UiSize, UiVariant } from '../_ui-types';

export interface EmptyStateAction {
  /** Texto del botón. */
  label: string;
  /** Ícono Material (opcional). */
  icon?: string;
  /** Variante del botón. Default: 'primary' */
  variant?: UiVariant;
  /** Ruta de navegación (usa routerLink). */
  route?: string;
}

export interface EmptyStateConfig {
  /** Tamaño general del bloque. Default: 'md' */
  size?: UiSize;
  /** Añade un borde tipo card. Default: false */
  card?: boolean;
  /** Padding vertical del bloque. Default: 'normal' */
  padding?: 'compact' | 'normal' | 'spacious';
}

/**
 * EmptyStateComponent
 *
 * Bloque visual estándar para cuando una lista o sección no tiene datos.
 * Reemplaza los ~15 patrones inline repetidos en las features.
 *
 * @example Lista vacía:
 * ```html
 * <app-empty-state
 *   icon="person_off"
 *   title="Sin usuarios"
 *   subtitle="No hay usuarios que coincidan con tu búsqueda." />
 * ```
 *
 * @example Con acción:
 * ```html
 * <app-empty-state
 *   icon="add_circle"
 *   title="Aún no hay aplicaciones"
 *   subtitle="Crea tu primera aplicación OAuth para empezar."
 *   [action]="{ label: 'Nueva aplicación', icon: 'add', route: '/applications/new' }" />
 * ```
 *
 * @example Error:
 * ```html
 * <app-empty-state
 *   icon="error"
 *   title="No se pudieron cargar los datos"
 *   subtitle="Intenta de nuevo en unos momentos."
 *   [action]="{ label: 'Reintentar', icon: 'refresh', variant: 'ghost' }"
 *   (actionClick)="reload()" />
 * ```
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, InstitutionalButtonComponent],
  styles: [`
    :host { display: block; }

    .es-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
    }

    /* Padding */
    .es-pad-compact   { padding: var(--space-24) var(--space-16); }
    .es-pad-normal    { padding: var(--space-48) var(--space-24); }
    .es-pad-spacious  { padding: var(--space-64) var(--space-32); }

    /* Card wrapper */
    .es-card {
      border-radius: var(--radius-xl);
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05);
      border: 1px solid #f3f4f6;
      width: 100%;
    }

    /* Icon */
    .es-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: #f3f4f6;
      margin-bottom: var(--space-16);
      flex-shrink: 0;
    }
    .es-sm  .es-icon-wrap { width: 3rem;   height: 3rem; }
    .es-md  .es-icon-wrap { width: 4rem;   height: 4rem; }
    .es-lg  .es-icon-wrap { width: 5.5rem; height: 5.5rem; }

    .es-icon {
      font-family: 'Material Symbols Outlined';
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;
      color: #d1d5db;
      line-height: 1;
    }
    .es-sm .es-icon { font-size: 1.75rem; }
    .es-md .es-icon { font-size: 2.5rem;  }
    .es-lg .es-icon { font-size: 3.5rem;  }

    /* Text */
    .es-title {
      font-weight: 700;
      color: #374151;
      margin-bottom: var(--space-8);
      line-height: 1.3;
    }
    .es-sm .es-title { font-size: var(--font-size-sm); }
    .es-md .es-title { font-size: var(--font-size-md); }
    .es-lg .es-title { font-size: var(--font-size-lg); }

    .es-subtitle {
      font-size: var(--font-size-sm);
      color: #9ca3af;
      max-width: 28rem;
      line-height: 1.55;
      margin-bottom: 0;
    }
    .es-lg .es-subtitle { font-size: var(--font-size-md); }

    /* Action */
    .es-action { margin-top: var(--space-24); }
  `],
  template: `
    <div class="es-root"
      [class]="'es-' + resolvedSize"
      [class.es-card]="cfg.card"
      [class]="'es-pad-' + resolvedPadding">

      <!-- Ícono -->
      <div *ngIf="icon" class="es-icon-wrap">
        <span class="es-icon material-symbols-outlined">{{ icon }}</span>
      </div>

      <!-- ng-content para ícono personalizado -->
      <ng-content select="[slot=icon]"></ng-content>

      <!-- Título -->
      <h3 *ngIf="title" class="es-title">{{ title }}</h3>

      <!-- Subtítulo -->
      <p *ngIf="subtitle" class="es-subtitle">{{ subtitle }}</p>

      <!-- ng-content para contenido personalizado -->
      <ng-content></ng-content>

      <!-- Acción -->
      <div *ngIf="action" class="es-action">
        <app-institutional-button
          *ngIf="!action.route"
          [config]="{ variant: action.variant ?? 'primary', icon: action.icon, iconPosition: 'left' }"
          (clicked)="actionClick.emit()">
          {{ action.label }}
        </app-institutional-button>
        <app-institutional-button
          *ngIf="action.route"
          [config]="{ variant: action.variant ?? 'primary', icon: action.icon, iconPosition: 'left' }"
          [routerLink]="action.route">
          {{ action.label }}
        </app-institutional-button>
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  /** Ícono Material Symbols a mostrar (ej. 'person_off', 'folder_off'). */
  @Input() icon?: string;
  /** Título principal. */
  @Input() title?: string;
  /** Texto descriptivo bajo el título. */
  @Input() subtitle?: string;
  /** Botón de acción opcional. */
  @Input() action?: EmptyStateAction;
  /** Configuración visual. */
  @Input() config: EmptyStateConfig = {};

  /** Emite al hacer clic en el botón de acción (cuando no hay `route`). */
  @Output() actionClick = new EventEmitter<void>();

  get cfg(): EmptyStateConfig { return this.config; }

  get resolvedSize(): string { return this.cfg.size ?? 'md'; }

  get resolvedPadding(): string { return this.cfg.padding ?? 'normal'; }
}
