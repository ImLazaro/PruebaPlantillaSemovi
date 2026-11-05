import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';
import { InstitutionalBadgeComponent } from '../badge/institutional-badge/institutional-badge.component';
import { UiVariant } from '../_ui-types';

export type TimelineItemStatus = 'default' | 'completed' | 'active' | 'warning' | 'error' | 'info';

export interface TimelineItem {
  /** Identificador único. */
  id?: string;
  /** Texto principal (encabezado del evento). */
  label: string;
  /** Descripción o detalle del evento. */
  description?: string;
  /** Fecha/hora del evento (string ISO o Date). */
  date?: string | Date;
  /** Ícono del nodo (Bootstrap Icons o Material Symbols). */
  icon?: string;
  /** Tipo de ícono. Default: 'material' */
  iconType?: 'bootstrap' | 'material';
  /** Estado visual del nodo. Default: 'default' */
  status?: TimelineItemStatus;
  /** Badge adicional junto al label. */
  badgeText?: string;
  /** Variante del badge. */
  badgeVariant?: UiVariant;
  /** Template personalizado para el contenido (reemplaza label + description). */
  contentTemplate?: TemplateRef<{ $implicit: TimelineItem }>;
  /** Datos extra opcionales para acceder en el template. */
  data?: Record<string, unknown>;
}

export interface TimelineConfig {
  /** Orientación. Default: 'vertical' */
  orientation?: 'vertical' | 'horizontal';
  /** Muestra la fecha en cada ítem. Default: true */
  showDate?: boolean;
  /** Formato de fecha. Default: 'short' (dd/MM/yyyy HH:mm) */
  dateFormat?: 'short' | 'long' | 'time';
  /** Modo compacto (reduce el espaciado). Default: false */
  compact?: boolean;
  /** Mensaje cuando la lista está vacía. */
  emptyMessage?: string;
  /** Línea conectora entre nodos. Default: true */
  showLine?: boolean;
  /** Hace cada ítem clicable. Default: false */
  clickable?: boolean;
}

const STATUS_ICON: Record<TimelineItemStatus, string> = {
  default:   'circle',
  completed: 'check_circle',
  active:    'radio_button_checked',
  warning:   'warning',
  error:     'cancel',
  info:      'info',
};

const STATUS_COLOR: Record<TimelineItemStatus, string> = {
  default:   '#9ca3af',
  completed: '#10b981',
  active:    'var(--institucional-primario)',
  warning:   '#f59e0b',
  error:     '#ef4444',
  info:      '#3b82f6',
};

const STATUS_BG: Record<TimelineItemStatus, string> = {
  default:   '#f3f4f6',
  completed: '#d1fae5',
  active:    'rgba(157,36,73,0.1)',
  warning:   '#fef3c7',
  error:     '#fee2e2',
  info:      '#dbeafe',
};

/**
 * TimelineComponent
 *
 * Renderiza una lista cronológica de eventos con nodos coloreados
 * según su estado, iconos, fechas y soporte para templates personalizados.
 *
 * @example Vertical básico:
 * ```html
 * <app-timeline [items]="securityEvents" />
 * ```
 *
 * @example Compacto con ítem clicable:
 * ```html
 * <app-timeline
 *   [items]="auditLog"
 *   [config]="{ compact: true, clickable: true }"
 *   (itemClicked)="openDetail($event)" />
 * ```
 */
@Component({
  selector: 'app-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent, InstitutionalBadgeComponent],
  styles: [`
    :host { display: block; }

    /* ── Vertical ── */
    .tl-vertical { display: flex; flex-direction: column; }

    .tl-item-v {
      display: flex;
      gap: var(--space-16);
      position: relative;
    }

    /* Columna del nodo */
    .tl-node-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .tl-node {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      z-index: 1;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .tl-node-active {
      box-shadow: 0 0 0 4px rgba(157, 36, 73, 0.15);
    }
    .compact .tl-node {
      width: 1.75rem;
      height: 1.75rem;
    }

    /* Línea */
    .tl-line {
      flex: 1;
      width: 2px;
      background: #e5e7eb;
      margin: var(--space-4) 0;
    }
    .tl-item-v:last-child .tl-line { display: none; }

    /* Contenido */
    .tl-content-v {
      flex: 1;
      padding-bottom: var(--space-24);
    }
    .compact .tl-content-v { padding-bottom: var(--space-16); }
    .tl-item-v:last-child .tl-content-v { padding-bottom: 0; }

    .tl-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-8);
      margin-bottom: var(--space-4);
    }
    .tl-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: #111827;
      font-family: 'Montserrat', sans-serif;
      line-height: 1.4;
    }
    .compact .tl-label { font-size: var(--font-size-xs); }

    .tl-date {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      font-family: 'Montserrat', sans-serif;
      white-space: nowrap;
    }

    .tl-desc {
      font-size: var(--font-size-sm);
      color: #6b7280;
      font-family: 'Montserrat', sans-serif;
      line-height: 1.55;
      margin-top: var(--space-4);
    }
    .compact .tl-desc { font-size: var(--font-size-xs); }

    /* Clickable */
    .tl-item-v.clickable {
      cursor: pointer;
      border-radius: var(--radius-md);
      padding: var(--space-4);
      margin: calc(var(--space-4) * -1);
      transition: background 0.15s ease;
    }
    .tl-item-v.clickable:hover { background: rgba(157,36,73,0.04); }
    .tl-item-v.clickable:hover .tl-node { transform: scale(1.1); }
    .tl-item-v.clickable:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(157, 36, 73, 0.25);
    }

    /* Empty */
    .tl-empty {
      text-align: center;
      padding: var(--space-32);
      color: #9ca3af;
      font-size: var(--font-size-sm);
      font-family: 'Montserrat', sans-serif;
    }
    .tl-empty-icon {
      font-size: 2.5rem;
      margin-bottom: var(--space-8);
      display: block;
    }

    /* ── Horizontal ── */
    .tl-horizontal {
      display: flex;
      align-items: flex-start;
      overflow-x: auto;
      gap: 0;
    }
    .tl-item-h {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      min-width: 7rem;
      position: relative;
    }
    .tl-node-row {
      display: flex;
      align-items: center;
      width: 100%;
    }
    .tl-line-h {
      flex: 1;
      height: 2px;
      background: #e5e7eb;
    }
    .tl-item-h:first-child .tl-line-h-left  { visibility: hidden; }
    .tl-item-h:last-child  .tl-line-h-right { visibility: hidden; }
    .tl-content-h {
      text-align: center;
      margin-top: var(--space-8);
      padding: 0 var(--space-4);
    }
  `],
  template: `
    <!-- EMPTY -->
    <div *ngIf="items.length === 0" class="tl-empty">
      <span class="material-symbols-outlined tl-empty-icon">history</span>
      {{ cfg.emptyMessage || 'Sin eventos registrados' }}
    </div>

    <!-- VERTICAL -->
    <div *ngIf="items.length > 0 && resolvedOrientation === 'vertical'"
      class="tl-vertical" [class.compact]="cfg.compact">

      <div
        *ngFor="let item of items; let last = last"
        class="tl-item-v"
        [class.clickable]="cfg.clickable"
        [attr.tabindex]="cfg.clickable ? 0 : null"
        [attr.role]="cfg.clickable ? 'button' : null"
        [attr.aria-label]="cfg.clickable ? 'Ver detalle: ' + item.label : null"
        (click)="cfg.clickable && itemClicked.emit(item)"
        (keydown.enter)="cfg.clickable && itemClicked.emit(item)">

        <!-- Nodo + línea -->
        <div class="tl-node-col">
          <div class="tl-node"
            [class.tl-node-active]="(item.status || 'default') === 'active'"
            [style.background]="getNodeBg(item)"
            [attr.aria-hidden]="true">
            <app-universal-icon
              [name]="item.icon || getStatusIcon(item)"
              [type]="item.iconType ?? 'material'"
              [size]="cfg.compact ? 14 : 16"
              [customClass]="''"
              [style.color]="getNodeColor(item)">
            </app-universal-icon>
          </div>
          <div *ngIf="cfg.showLine !== false && !last" class="tl-line"></div>
        </div>

        <!-- Contenido -->
        <div class="tl-content-v">
          <!-- Template personalizado -->
          <ng-container *ngIf="item.contentTemplate">
            <ng-container *ngTemplateOutlet="item.contentTemplate; context: { $implicit: item }">
            </ng-container>
          </ng-container>

          <!-- Contenido estándar -->
          <ng-container *ngIf="!item.contentTemplate">
            <div class="tl-header">
              <span class="tl-label">{{ item.label }}</span>

              <app-institutional-badge
                *ngIf="item.badgeText"
                [config]="{ variant: item.badgeVariant || 'secondary', size: 'sm' }">
                {{ item.badgeText }}
              </app-institutional-badge>

              <span *ngIf="item.date && cfg.showDate !== false" class="tl-date">
                {{ formatDate(item.date) }}
              </span>
            </div>

            <p *ngIf="item.description" class="tl-desc">{{ item.description }}</p>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- HORIZONTAL -->
    <div *ngIf="items.length > 0 && resolvedOrientation === 'horizontal'"
      class="tl-horizontal" [class.compact]="cfg.compact">

      <div
        *ngFor="let item of items; let first = first; let last = last"
        class="tl-item-h"
        [class.clickable]="cfg.clickable"
        [attr.tabindex]="cfg.clickable ? 0 : null"
        (click)="cfg.clickable && itemClicked.emit(item)"
        (keydown.enter)="cfg.clickable && itemClicked.emit(item)">

        <div class="tl-node-row">
          <div class="tl-line-h tl-line-h-left"></div>
          <div class="tl-node"
            [style.background]="getNodeBg(item)"
            [class.tl-node-active]="(item.status || 'default') === 'active'"
            style="flex-shrink:0">
            <app-universal-icon
              [name]="item.icon || getStatusIcon(item)"
              [type]="item.iconType ?? 'material'"
              [size]="14"
              [style.color]="getNodeColor(item)">
            </app-universal-icon>
          </div>
          <div class="tl-line-h tl-line-h-right"></div>
        </div>

        <div class="tl-content-h">
          <div class="tl-label">{{ item.label }}</div>
          <div *ngIf="item.date && cfg.showDate !== false" class="tl-date">
            {{ formatDate(item.date) }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class TimelineComponent {
  /** Lista de eventos a mostrar. */
  @Input() items: TimelineItem[] = [];
  /** Configuración de la línea de tiempo. */
  @Input() config: TimelineConfig = {};

  /** Emite cuando se hace clic en un ítem (config.clickable = true). */
  @Output() itemClicked = new EventEmitter<TimelineItem>();

  get cfg(): TimelineConfig {
    return this.config;
  }

  get resolvedOrientation(): 'vertical' | 'horizontal' {
    return this.cfg.orientation ?? 'vertical';
  }

  getStatusIcon(item: TimelineItem): string {
    return STATUS_ICON[item.status ?? 'default'];
  }

  getNodeColor(item: TimelineItem): string {
    return STATUS_COLOR[item.status ?? 'default'];
  }

  getNodeBg(item: TimelineItem): string {
    if (item.icon && !item.status) return '#f3f4f6';
    return STATUS_BG[item.status ?? 'default'];
  }

  formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    switch (this.cfg.dateFormat) {
      case 'long':
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      case 'time':
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      default:
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
}
