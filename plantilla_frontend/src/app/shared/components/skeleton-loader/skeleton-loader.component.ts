import {
  Component, Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'title' | 'avatar' | 'thumbnail' | 'button' | 'badge' | 'card' | 'table' | 'custom';
export type SkeletonShape   = 'rounded' | 'circle' | 'square';

export interface SkeletonConfig {
  /** Patrón predefinido. Default: 'text' */
  variant?: SkeletonVariant;
  /** Forma del bloque. Default: 'rounded' */
  shape?: SkeletonShape;
  /** Ancho CSS explícito (ej. '200px', '80%'). */
  width?: string;
  /** Alto CSS explícito. */
  height?: string;
  /** Número de filas (para variant='text'). Default: 1 */
  rows?: number;
  /** Número de filas de tabla (para variant='table'). Default: 5 */
  tableRows?: number;
  /** Desactiva la animación shimmer. Default: false */
  noAnimation?: boolean;
  /** Clase CSS adicional. */
  customClass?: string;
}

/** Fila de tabla esqueleto (columnas de ancho variable). */
const TABLE_COL_WIDTHS = ['30%', '20%', '25%', '15%', '10%'];

/**
 * SkeletonLoaderComponent
 *
 * Reemplaza spinners planos durante la carga con placeholders
 * animados que imitan la forma del contenido real (shimmer effect).
 *
 * @example Texto (1 línea):
 * ```html
 * <app-skeleton-loader />
 * ```
 *
 * @example Avatar + 3 líneas de texto:
 * ```html
 * <div class="flex gap-3 items-center">
 *   <app-skeleton-loader [config]="{ variant: 'avatar' }" />
 *   <div class="flex-1">
 *     <app-skeleton-loader [config]="{ variant: 'title', width: '60%' }" />
 *     <app-skeleton-loader [config]="{ rows: 2, width: '90%' }" />
 *   </div>
 * </div>
 * ```
 *
 * @example Tabla:
 * ```html
 * <app-skeleton-loader [config]="{ variant: 'table', tableRows: 8 }" />
 * ```
 */
@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    /* ── Base shimmer ── */
    @keyframes sk-shimmer {
      0%   { background-position: -700px 0; }
      100% { background-position:  700px 0; }
    }

    .sk-block {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e0e0e0 37%,
        #f0f0f0 63%
      );
      background-size: 700px 100%;
      border-radius: var(--radius-md);
    }
    .sk-block.animated {
      animation: sk-shimmer 1.4s ease-in-out infinite;
    }

    /* Shapes */
    .sk-circle  { border-radius: 9999px; }
    .sk-square  { border-radius: 0; }

    /* ── Text rows ── */
    .sk-text-row { height: 0.875rem; margin-bottom: var(--space-8); }
    .sk-text-row:last-child { margin-bottom: 0; width: 75%; }

    /* ── Title ── */
    .sk-title { height: 1.25rem; }

    /* ── Avatar ── */
    .sk-avatar { width: 2.75rem; height: 2.75rem; border-radius: 9999px; }

    /* ── Thumbnail ── */
    .sk-thumbnail { width: 100%; height: 160px; }

    /* ── Button ── */
    .sk-button { height: 2.25rem; border-radius: var(--radius-pill); }

    /* ── Badge ── */
    .sk-badge { height: 1.5rem; width: 4rem; border-radius: var(--radius-pill); }

    /* ── Card ── */
    .sk-card {
      border-radius: var(--radius-xl);
      padding: var(--space-16);
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .sk-card-header {
      display: flex;
      gap: var(--space-12);
      align-items: center;
      margin-bottom: var(--space-16);
    }

    /* ── Table ── */
    .sk-table { width: 100%; }
    .sk-table-header {
      display: flex;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      border-bottom: 2px solid #f3f4f6;
      margin-bottom: var(--space-4);
    }
    .sk-table-row {
      display: flex;
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      border-bottom: 1px solid #f9fafb;
    }
    .sk-table-cell { height: 0.875rem; }
  `],
  template: `
    <ng-container [ngSwitch]="cfg.variant ?? 'text'">

      <!-- TEXT (N rows) -->
      <ng-container *ngSwitchCase="'text'">
        <div
          *ngFor="let r of textRows; let last = last; let i = index"
          class="sk-block sk-text-row"
          [class.animated]="!cfg.noAnimation"
          [class.sk-circle]="cfg.shape === 'circle'"
          [class.sk-square]="cfg.shape === 'square'"
          [style.width]="last && (cfg.rows ?? 1) > 1 ? '70%' : (cfg.width ?? '100%')"
          [style.marginBottom]="last ? '0' : null">
        </div>
      </ng-container>

      <!-- TITLE -->
      <ng-container *ngSwitchCase="'title'">
        <div class="sk-block sk-title animated"
          [class.animated]="!cfg.noAnimation"
          [style.width]="cfg.width ?? '55%'"
          [style.height]="cfg.height">
        </div>
      </ng-container>

      <!-- AVATAR -->
      <ng-container *ngSwitchCase="'avatar'">
        <div class="sk-block sk-avatar"
          [class.animated]="!cfg.noAnimation"
          [style.width]="cfg.width"
          [style.height]="cfg.height">
        </div>
      </ng-container>

      <!-- THUMBNAIL -->
      <ng-container *ngSwitchCase="'thumbnail'">
        <div class="sk-block sk-thumbnail"
          [class.animated]="!cfg.noAnimation"
          [style.width]="cfg.width ?? '100%'"
          [style.height]="cfg.height ?? '160px'"
          [class.sk-circle]="cfg.shape === 'circle'"
          [class.sk-square]="cfg.shape === 'square'">
        </div>
      </ng-container>

      <!-- BUTTON -->
      <ng-container *ngSwitchCase="'button'">
        <div class="sk-block sk-button"
          [class.animated]="!cfg.noAnimation"
          [style.width]="cfg.width ?? '7rem'">
        </div>
      </ng-container>

      <!-- BADGE -->
      <ng-container *ngSwitchCase="'badge'">
        <div class="sk-block sk-badge"
          [class.animated]="!cfg.noAnimation"
          [style.width]="cfg.width">
        </div>
      </ng-container>

      <!-- CARD -->
      <ng-container *ngSwitchCase="'card'">
        <div class="sk-card">
          <div class="sk-card-header">
            <div class="sk-block sk-avatar" [class.animated]="!cfg.noAnimation"></div>
            <div style="flex:1">
              <div class="sk-block sk-title" [class.animated]="!cfg.noAnimation" style="width:50%;margin-bottom:var(--space-8)"></div>
              <div class="sk-block sk-text-row" [class.animated]="!cfg.noAnimation" style="width:80%;margin-bottom:0"></div>
            </div>
          </div>
          <div class="sk-block sk-text-row" [class.animated]="!cfg.noAnimation" style="width:100%;margin-bottom:var(--space-8)"></div>
          <div class="sk-block sk-text-row" [class.animated]="!cfg.noAnimation" style="width:90%;margin-bottom:var(--space-8)"></div>
          <div class="sk-block sk-text-row" [class.animated]="!cfg.noAnimation" style="width:70%;margin-bottom:0"></div>
        </div>
      </ng-container>

      <!-- TABLE -->
      <ng-container *ngSwitchCase="'table'">
        <div class="sk-table">
          <!-- Header -->
          <div class="sk-table-header">
            <div *ngFor="let w of colWidths"
              class="sk-block sk-table-cell"
              [class.animated]="!cfg.noAnimation"
              [style.width]="w">
            </div>
          </div>
          <!-- Rows -->
          <div *ngFor="let r of tableRowsArr" class="sk-table-row">
            <div *ngFor="let w of colWidths"
              class="sk-block sk-table-cell"
              [class.animated]="!cfg.noAnimation"
              [style.width]="w">
            </div>
          </div>
        </div>
      </ng-container>

      <!-- CUSTOM -->
      <ng-container *ngSwitchCase="'custom'">
        <div class="sk-block"
          [class.animated]="!cfg.noAnimation"
          [class.sk-circle]="cfg.shape === 'circle'"
          [class.sk-square]="cfg.shape === 'square'"
          [style.width]="cfg.width ?? '100%'"
          [style.height]="cfg.height ?? '1rem'"
          [class]="cfg.customClass ?? ''">
        </div>
      </ng-container>

    </ng-container>
  `
})
export class SkeletonLoaderComponent {
  /** Configuración del skeleton. */
  @Input() config: SkeletonConfig = {};

  get cfg(): SkeletonConfig { return this.config; }

  get textRows(): number[] {
    return Array.from({ length: this.cfg.rows ?? 1 }, (_, i) => i);
  }

  get tableRowsArr(): number[] {
    return Array.from({ length: this.cfg.tableRows ?? 5 }, (_, i) => i);
  }

  get colWidths(): string[] {
    return TABLE_COL_WIDTHS;
  }
}
