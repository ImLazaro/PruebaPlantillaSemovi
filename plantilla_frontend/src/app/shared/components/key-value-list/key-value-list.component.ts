import {
  Component, Input, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';
import { InstitutionalBadgeComponent, BadgeConfig } from '../badge/institutional-badge/institutional-badge.component';
import { CopyToClipboardComponent } from '../copy-to-clipboard/copy-to-clipboard.component';
import { UiSize, UiVariant } from '../_ui-types';

export type KvItemType = 'text' | 'badge' | 'date' | 'boolean' | 'email' | 'code' | 'custom';

export interface KeyValueItem {
  /** Etiqueta de la fila. */
  label: string;
  /** Valor a mostrar. */
  value?: string | number | boolean | null;
  /** Ícono opcional (Bootstrap Icons o Material) junto a la etiqueta. */
  icon?: string;
  /** Tipo de ícono. Default: 'material' */
  iconType?: 'bootstrap' | 'material';
  /** Tipo de renderizado del valor. Default: 'text' */
  type?: KvItemType;
  /** Permite copiar el valor al portapapeles. Default: false */
  copyable?: boolean;
  /** Configuración del badge (solo aplica si type = 'badge'). */
  badge?: BadgeConfig;
  /** Ocultar fila si el valor es null/undefined/vacío. Default: false */
  hideEmpty?: boolean;
  /** Clase adicional para el valor. */
  valueClass?: string;
  /** Indica que el valor ocupa toda la fila (span completo). Default: false */
  fullWidth?: boolean;
}

export interface KeyValueListConfig {
  /** Número de columnas. Default: 1 */
  columns?: 1 | 2;
  /** Estilo de la lista. Default: 'default' */
  variant?: 'default' | 'bordered' | 'striped' | 'compact';
  /** Tamaño de fuente. Default: 'md' */
  size?: UiSize;
  /** Texto cuando no hay ítems o todos están vacíos. */
  emptyMessage?: string;
}

/**
 * KeyValueListComponent
 *
 * Renderiza pares clave-valor con soporte para iconos, badges,
 * fechas, código, booleanos y copia al portapapeles.
 *
 * @example Una columna:
 * ```html
 * <app-key-value-list [items]="[
 *   { label: 'Email', value: 'ana@example.test', icon: 'email', copyable: true },
 *   { label: 'Activo', value: true, type: 'boolean' },
 * ]" />
 * ```
 *
 * @example Dos columnas con variante bordeada:
 * ```html
 * <app-key-value-list
 *   [items]="items"
 *   [config]="{ columns: 2, variant: 'bordered' }" />
 * ```
 */
@Component({
  selector: 'app-key-value-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent, InstitutionalBadgeComponent, CopyToClipboardComponent],
  styles: [`
    :host { display: block; }

    /* ── Base grid ── */
    .kv-grid {
      display: grid;
      gap: 0;
    }
    .kv-grid-1 { grid-template-columns: 1fr; }
    .kv-grid-2 { grid-template-columns: 1fr 1fr; }

    /* ── Row ── */
    .kv-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-12);
      padding: var(--space-12) var(--space-16);
      transition: background 0.12s ease;
    }
    .kv-row.full-width {
      grid-column: 1 / -1;
      flex-direction: column;
      gap: var(--space-4);
    }

    /* Variant: default */
    .kv-variant-default .kv-row {
      border-bottom: 1px solid #f3f4f6;
    }
    .kv-variant-default .kv-row:last-child { border-bottom: none; }

    /* Variant: bordered */
    .kv-variant-bordered {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .kv-variant-bordered .kv-row {
      border-bottom: 1px solid #e5e7eb;
    }
    .kv-variant-bordered .kv-row:last-child { border-bottom: none; }

    /* Variant: striped */
    .kv-variant-striped .kv-row:nth-child(even) { background: #f9fafb; }

    /* Variant: compact */
    .kv-variant-compact .kv-row {
      padding: var(--space-8) var(--space-12);
    }

    /* ── Label ── */
    .kv-label-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
      min-width: 8rem;
      max-width: 11rem;
    }
    .kv-label-wrap.full { min-width: auto; max-width: none; }
    .kv-label-icon { color: var(--institucional-primario); flex-shrink: 0; }
    .kv-label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: #6b7280;
      line-height: 1.4;
      font-family: 'Montserrat', sans-serif;
    }
    .kv-size-sm .kv-label { font-size: var(--font-size-xs); }
    .kv-size-lg .kv-label { font-size: var(--font-size-md); }

    /* ── Value ── */
    .kv-value-wrap {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }
    .kv-value {
      font-size: var(--font-size-sm);
      color: #111827;
      word-break: break-word;
      font-family: 'Montserrat', sans-serif;
      line-height: 1.5;
    }
    .kv-size-sm .kv-value { font-size: var(--font-size-xs); }
    .kv-size-lg .kv-value { font-size: var(--font-size-md); }

    .kv-value-empty {
      font-size: var(--font-size-sm);
      color: #9ca3af;
      font-style: italic;
    }
    .kv-value-code {
      font-family: 'Courier New', monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.8em;
      color: var(--institucional-secundario);
    }

    /* boolean */
    .kv-bool {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
    }
    .kv-bool-true  { color: #10b981; }
    .kv-bool-false { color: #ef4444; }

    /* empty state */
    .kv-empty {
      padding: var(--space-32);
      text-align: center;
      color: #9ca3af;
      font-size: var(--font-size-sm);
      font-family: 'Montserrat', sans-serif;
    }
  `],
  template: `
    <div [class]="getRootClasses()">

      <ng-container *ngIf="visibleItems.length > 0; else emptyTpl">
        <div
          *ngFor="let item of visibleItems"
          class="kv-row"
          [class.full-width]="item.fullWidth">

          <!-- Etiqueta -->
          <div class="kv-label-wrap" [class.full]="item.fullWidth">
            <app-universal-icon
              *ngIf="item.icon"
              [name]="item.icon"
              [type]="item.iconType ?? 'material'"
              [size]="14"
              class="kv-label-icon">
            </app-universal-icon>
            <span class="kv-label">{{ item.label }}</span>
          </div>

          <!-- Valor -->
          <div class="kv-value-wrap">

            <!-- Badge -->
            <ng-container *ngIf="item.type === 'badge' && item.badge">
              <app-institutional-badge [config]="item.badge">
                {{ formatValue(item) }}
              </app-institutional-badge>
            </ng-container>

            <!-- Boolean -->
            <span *ngIf="item.type === 'boolean'" class="kv-bool"
              [class.kv-bool-true]="!!item.value"
              [class.kv-bool-false]="!item.value">
              <span class="material-symbols-outlined" style="font-size:1rem">
                {{ item.value ? 'check_circle' : 'cancel' }}
              </span>
              {{ item.value ? 'Sí' : 'No' }}
            </span>

            <!-- Code -->
            <code *ngIf="item.type === 'code'" class="kv-value kv-value-code" [class]="item.valueClass">
              {{ item.value }}
            </code>

            <!-- Date -->
            <span *ngIf="item.type === 'date'" class="kv-value" [class]="item.valueClass">
              {{ item.value | date:'dd/MMM/yyyy HH:mm' : '' : 'es-MX' }}
            </span>

            <!-- Email -->
            <a *ngIf="item.type === 'email'" [href]="'mailto:' + item.value"
               class="kv-value text-primary-700 hover:underline" [class]="item.valueClass">
              {{ item.value }}
            </a>

            <!-- Text / Default / Custom -->
            <ng-container *ngIf="!item.type || item.type === 'text' || item.type === 'custom'">
              <span
                *ngIf="hasValue(item); else emptyVal"
                class="kv-value"
                [class]="item.valueClass">
                {{ formatValue(item) }}
              </span>
              <ng-template #emptyVal>
                <span class="kv-value-empty">—</span>
              </ng-template>
            </ng-container>

            <!-- Copy button -->
            <app-copy-to-clipboard
              *ngIf="item.copyable && hasValue(item)"
              [value]="String(item.value)"
              [config]="{ variant: 'inline', size: 'sm' }">
            </app-copy-to-clipboard>

          </div>
        </div>
      </ng-container>

      <!-- Empty state -->
      <ng-template #emptyTpl>
        <div class="kv-empty">
          {{ cfg.emptyMessage || 'Sin información disponible' }}
        </div>
      </ng-template>
    </div>
  `
})
export class KeyValueListComponent {
  /** Lista de ítems a mostrar. */
  @Input() items: KeyValueItem[] = [];
  /** Configuración del listado. */
  @Input() config: KeyValueListConfig = {};

  // Exponer String() al template
  readonly String = String;

  get cfg(): KeyValueListConfig {
    return this.config;
  }

  get visibleItems(): KeyValueItem[] {
    return this.items.filter(item => {
      if (!item.hideEmpty) return true;
      return this.hasValue(item);
    });
  }

  getRootClasses(): string {
    const variant = this.cfg.variant ?? 'default';
    const cols    = this.cfg.columns === 2 ? 'kv-grid-2' : 'kv-grid-1';
    const size    = `kv-size-${this.cfg.size ?? 'md'}`;
    return `kv-grid kv-variant-${variant} ${cols} ${size}`;
  }

  hasValue(item: KeyValueItem): boolean {
    return item.value !== null && item.value !== undefined && item.value !== '';
  }

  formatValue(item: KeyValueItem): string {
    if (item.value === null || item.value === undefined) return '';
    return String(item.value);
  }
}
