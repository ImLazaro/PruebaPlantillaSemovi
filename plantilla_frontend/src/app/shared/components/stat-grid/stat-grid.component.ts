import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSize, UiVariant } from '../_ui-types';

export interface StatItem {
  /** Etiqueta de la métrica. */
  label: string;
  /** Valor principal a mostrar. */
  value: string | number;
  /** Ícono (Material Symbols o Bootstrap Icon). Default: ninguno */
  icon?: string;
  /** Porcentaje de cambio respecto a periodo anterior. Positivo = verde, negativo = rojo. */
  trend?: number;
  /** Etiqueta del trend ("vs. semana pasada"). */
  trendLabel?: string;
  /** Variante de color del card / ícono. Default: 'primary' */
  variant?: UiVariant;
  /** Descripción o subtexto bajo el valor. */
  description?: string;
  /** Progreso 0-100 para mostrar barra interna. */
  progress?: number;
  /** Dato adicional arbitrario. */
  data?: unknown;
}

export interface StatGridConfig {
  /** Número de columnas. Default: 4 (auto-responsive) */
  columns?: 2 | 3 | 4;
  /** Variante visual del card. Default: 'default' */
  variant?: 'default' | 'gradient' | 'bordered';
  /** Tamaño. Default: 'md' */
  size?: UiSize;
  /** Hace todos los cards clickeables. Default: false */
  clickable?: boolean;
  /** Clase adicional. */
  customClass?: string;
  /** Muestra skeleton de carga. */
  loading?: boolean;
}

const VARIANT_BG: Record<UiVariant, string> = {
  primary:   'rgba(157,36,73,0.08)',
  secondary: 'rgba(98,17,50,0.08)',
  success:   'rgba(16,185,129,0.08)',
  warning:   'rgba(245,158,11,0.08)',
  danger:    'rgba(239,68,68,0.08)',
  ghost:     'rgba(107,114,128,0.08)',
};
const VARIANT_COLOR: Record<UiVariant, string> = {
  primary:   'var(--institucional-primario)',
  secondary: 'var(--institucional-secundario)',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  ghost:     '#6b7280',
};
const VARIANT_GRADIENT: Record<UiVariant, string> = {
  primary:   'linear-gradient(135deg, var(--institucional-secundario) 0%, var(--institucional-primario) 100%)',
  secondary: 'linear-gradient(135deg, #4a0d27 0%, var(--institucional-secundario) 100%)',
  success:   'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  warning:   'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
  danger:    'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
  ghost:     'linear-gradient(135deg, #374151 0%, #9ca3af 100%)',
};

/**
 * StatGridComponent
 *
 * Grid de tarjetas KPI con ícono, valor, trend y barra de progreso
 * opcional. Reemplaza los grids manuales en security-panel,
 * dashboard y applications.
 *
 * @example Panel de seguridad:
 * ```html
 * <app-stat-grid
 *   [stats]="kpis"
 *   [config]="{ columns: 4, variant: 'default' }"
 *   (statClicked)="navigateTo($event)" />
 * ```
 *
 * @example Gradient institucional:
 * ```html
 * <app-stat-grid
 *   [stats]="[{ label: 'Usuarios activos', value: 1248, icon: 'group', variant: 'primary', trend: 12.5 }]"
 *   [config]="{ variant: 'gradient' }" />
 * ```
 */
@Component({
  selector: 'app-stat-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .sg-root {
      font-family: 'Montserrat', sans-serif;
      display: grid;
      gap: var(--space-16);
    }

    /* Columns */
    .sg-col-2 { grid-template-columns: repeat(2, 1fr); }
    .sg-col-3 { grid-template-columns: repeat(3, 1fr); }
    .sg-col-4 { grid-template-columns: repeat(4, 1fr); }

    /* Responsive auto */
    @media (max-width: 1200px) { .sg-col-4 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px)  { .sg-col-3 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px)  {
      .sg-col-2, .sg-col-3, .sg-col-4 { grid-template-columns: 1fr; }
    }

    /* ── Card ── */
    .sg-card {
      border-radius: var(--radius-xl);
      padding: var(--space-20);
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .sg-sm .sg-card { padding: var(--space-12); }
    .sg-lg .sg-card { padding: var(--space-28); }

    /* Card variants */
    .sg-card.v-default  { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .sg-card.v-bordered { background: #fff; border: 1.5px solid #e5e7eb; }
    .sg-card.v-gradient { color: #fff; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }

    /* Clickable */
    .sg-card.clickable { cursor: pointer; }
    .sg-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
    .sg-card.clickable:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(157,36,73,0.3); }
    .sg-card.v-gradient.clickable:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.22); }

    /* Decorative circle */
    .sg-deco {
      position: absolute;
      right: -1.5rem;
      top: -1.5rem;
      width: 6rem;
      height: 6rem;
      border-radius: 9999px;
      background: rgba(255,255,255,0.1);
      pointer-events: none;
    }
    .sg-deco-2 {
      right: 2rem;
      top: auto;
      bottom: -2.5rem;
      width: 4rem;
      height: 4rem;
    }

    /* ── Header row ── */
    .sg-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-12);
    }
    .sg-icon-wrap {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .sg-sm .sg-icon-wrap { width: 2.25rem; height: 2.25rem; }
    .sg-lg .sg-icon-wrap { width: 3.5rem;  height: 3.5rem; }

    .sg-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 1.5rem;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
    }
    .sg-sm .sg-icon { font-size: 1.125rem; }
    .sg-lg .sg-icon { font-size: 2rem; }

    /* ── Trend badge ── */
    .sg-trend {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: var(--radius-pill);
      padding: 2px var(--space-8);
    }
    .sg-trend.up   { background: #dcfce7; color: #15803d; }
    .sg-trend.down { background: #fee2e2; color: #b91c1c; }
    .sg-trend.neutral { background: #f3f4f6; color: #6b7280; }
    .sg-card.v-gradient .sg-trend { background: rgba(255,255,255,0.2); color: #fff; }

    .sg-trend-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 0.75rem;
      font-variation-settings: 'FILL' 1, 'wght' 700;
    }

    /* ── Value ── */
    .sg-value {
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1;
      margin-bottom: var(--space-4);
      color: #111827;
    }
    .sg-sm .sg-value { font-size: 1.5rem; }
    .sg-lg .sg-value { font-size: 2.75rem; }
    .sg-card.v-gradient .sg-value { color: #fff; }

    .sg-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sg-card.v-gradient .sg-label { color: rgba(255,255,255,0.8); }

    .sg-desc {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      margin-top: var(--space-4);
    }
    .sg-card.v-gradient .sg-desc { color: rgba(255,255,255,0.7); }

    /* Trend label */
    .sg-trend-label {
      font-size: 0.65rem;
      color: #9ca3af;
      margin-top: var(--space-4);
    }
    .sg-card.v-gradient .sg-trend-label { color: rgba(255,255,255,0.65); }

    /* ── Progress bar interna ── */
    .sg-progress-track {
      margin-top: var(--space-14);
      height: 0.375rem;
      border-radius: var(--radius-pill);
      background: rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .sg-card.v-gradient .sg-progress-track { background: rgba(255,255,255,0.2); }
    .sg-progress-fill {
      height: 100%;
      border-radius: var(--radius-pill);
      transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
      background: var(--institucional-primario);
    }
    .sg-card.v-gradient .sg-progress-fill { background: rgba(255,255,255,0.9); }

    /* ── Skeleton ── */
    .sg-skeleton {
      background: #f1f5f9;
      border-radius: var(--radius-xl);
      animation: sg-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes sg-shimmer {
      0%   { background-color: #f1f5f9; }
      50%  { background-color: #e2e8f0; }
      100% { background-color: #f1f5f9; }
    }
    .sg-skeleton-h { height: 7rem; }
    .sg-lg .sg-skeleton-h { height: 9rem; }
  `],
  template: `
    <div class="sg-root"
      [ngClass]="rootClasses">

      <!-- ── Skeleton loading ── -->
      <ng-container *ngIf="cfg.loading">
        <div *ngFor="let _ of skeletonItems" class="sg-skeleton sg-skeleton-h"></div>
      </ng-container>

      <!-- ── Cards ── -->
      <ng-container *ngIf="!cfg.loading">
        <div
          *ngFor="let stat of stats; let i = index"
          class="sg-card"
          [class]="'v-' + resolvedVariant"
          [class.clickable]="cfg.clickable || stat.data !== undefined"
          [style.background]="resolvedVariant === 'gradient' ? getGradient(stat.variant) : null"
          [attr.tabindex]="(cfg.clickable) ? 0 : null"
          [attr.role]="cfg.clickable ? 'button' : null"
          (click)="onCardClick(stat, i)"
          (keydown.enter)="onCardClick(stat, i)">

          <!-- Decoración gradient -->
          <ng-container *ngIf="resolvedVariant === 'gradient'">
            <span class="sg-deco"></span>
            <span class="sg-deco sg-deco-2"></span>
          </ng-container>

          <!-- Header: ícono + trend -->
          <div class="sg-header">
            <!-- Ícono -->
            <div *ngIf="stat.icon" class="sg-icon-wrap"
              [style.background]="resolvedVariant !== 'gradient' ? getIconBg(stat.variant) : 'rgba(255,255,255,0.15)'">
              <span class="sg-icon material-symbols-outlined"
                [style.color]="resolvedVariant !== 'gradient' ? getColor(stat.variant) : '#fff'">
                {{ stat.icon }}
              </span>
            </div>
            <span *ngIf="!stat.icon"></span>

            <!-- Trend -->
            <span *ngIf="stat.trend !== undefined"
              class="sg-trend"
              [class.up]="stat.trend > 0"
              [class.down]="stat.trend < 0"
              [class.neutral]="stat.trend === 0">
              <span class="sg-trend-icon material-symbols-outlined">
                {{ stat.trend > 0 ? 'trending_up' : stat.trend < 0 ? 'trending_down' : 'trending_flat' }}
              </span>
              {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend | number:'1.0-1' }}%
            </span>
          </div>

          <!-- Value -->
          <div class="sg-value">{{ stat.value }}</div>

          <!-- Label -->
          <div class="sg-label">{{ stat.label }}</div>

          <!-- Description -->
          <div *ngIf="stat.description" class="sg-desc">{{ stat.description }}</div>

          <!-- Trend label -->
          <div *ngIf="stat.trendLabel" class="sg-trend-label">{{ stat.trendLabel }}</div>

          <!-- Progress bar -->
          <div *ngIf="stat.progress !== undefined" class="sg-progress-track">
            <div class="sg-progress-fill"
              [style.width.%]="clamp(stat.progress)"
              [style.background]="resolvedVariant !== 'gradient' ? getColor(stat.variant) : null">
            </div>
          </div>

        </div>
      </ng-container>

    </div>
  `
})
export class StatGridComponent {
  /** Array de métricas a mostrar. */
  @Input() stats: StatItem[] = [];
  /** Configuración visual. */
  @Input() config: StatGridConfig = {};

  /** Emite al hacer clic en un card. */
  @Output() statClicked = new EventEmitter<{ stat: StatItem; index: number }>();

  get cfg(): StatGridConfig { return this.config; }
  get resolvedSize(): string { return this.cfg.size ?? 'md'; }
  get resolvedCols(): number { return this.cfg.columns ?? 4; }
  get resolvedVariant(): string { return this.cfg.variant ?? 'default'; }
  get skeletonItems(): number[] { return Array(this.resolvedCols).fill(0); }
  get rootClasses(): string[] {
    const classes = [`sg-${this.resolvedSize}`, `sg-col-${this.resolvedCols}`];
    if (this.cfg.customClass) classes.push(this.cfg.customClass);
    return classes;
  }

  getColor(v?: UiVariant): string { return VARIANT_COLOR[v ?? 'primary']; }
  getIconBg(v?: UiVariant): string { return VARIANT_BG[v ?? 'primary']; }
  getGradient(v?: UiVariant): string { return VARIANT_GRADIENT[v ?? 'primary']; }
  clamp(v: number): number { return Math.min(100, Math.max(0, v)); }

  onCardClick(stat: StatItem, index: number): void {
    if (this.cfg.clickable) this.statClicked.emit({ stat, index });
  }
}
