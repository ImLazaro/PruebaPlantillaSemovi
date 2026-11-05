import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';

export type BannerType = 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export type BannerVariant = 'filled' | 'soft' | 'outline';
export type BannerSize = 'sm' | 'md' | 'lg';

export interface InfoBannerConfig {
  /** Tipo semántico del banner. Default: 'info' */
  type?: BannerType;
  /** Estilo visual. Default: 'soft' */
  variant?: BannerVariant;
  /** Tamaño. Default: 'md' */
  size?: BannerSize;
  /** Título opcional en negrita. */
  title?: string;
  /** Muestra botón de cerrar. Default: false */
  closable?: boolean;
  /** Texto del botón de acción. */
  actionText?: string;
  /** Ícono personalizado (Bootstrap Icons o Material). */
  icon?: string;
  /** Tipo de ícono. Default: auto según `type` */
  iconType?: 'bootstrap' | 'material';
  /** Ocultar ícono. Default: false */
  hideIcon?: boolean;
  /** Clase CSS adicional. */
  customClass?: string;
  /** El banner desaparece automáticamente después de N ms. 0 = nunca. Default: 0 */
  autoDismiss?: number;
}

const TYPE_ICON: Record<BannerType, string> = {
  info:    'info',
  success: 'check_circle',
  warning: 'warning',
  danger:  'error',
  neutral: 'notifications',
};

const TYPE_COLORS: Record<BannerType, {
  soft_bg: string; soft_border: string; soft_text: string; soft_icon: string;
  filled_bg: string; filled_text: string;
  outline_border: string; outline_text: string; outline_icon: string;
}> = {
  info: {
    soft_bg: '#eff6ff', soft_border: '#bfdbfe', soft_text: '#1e40af', soft_icon: '#3b82f6',
    filled_bg: '#3b82f6', filled_text: '#fff',
    outline_border: '#3b82f6', outline_text: '#1e40af', outline_icon: '#3b82f6',
  },
  success: {
    soft_bg: '#f0fdf4', soft_border: '#bbf7d0', soft_text: '#166534', soft_icon: '#10b981',
    filled_bg: '#10b981', filled_text: '#fff',
    outline_border: '#10b981', outline_text: '#166534', outline_icon: '#10b981',
  },
  warning: {
    soft_bg: '#fffbeb', soft_border: '#fde68a', soft_text: '#92400e', soft_icon: '#f59e0b',
    filled_bg: '#f59e0b', filled_text: '#fff',
    outline_border: '#f59e0b', outline_text: '#92400e', outline_icon: '#f59e0b',
  },
  danger: {
    soft_bg: '#fef2f2', soft_border: '#fecaca', soft_text: '#991b1b', soft_icon: '#ef4444',
    filled_bg: '#ef4444', filled_text: '#fff',
    outline_border: '#ef4444', outline_text: '#991b1b', outline_icon: '#ef4444',
  },
  neutral: {
    soft_bg: '#f9fafb', soft_border: '#e5e7eb', soft_text: '#374151', soft_icon: '#6b7280',
    filled_bg: '#6b7280', filled_text: '#fff',
    outline_border: '#d1d5db', outline_text: '#374151', outline_icon: '#6b7280',
  },
};

/**
 * InfoBannerComponent
 *
 * Banner de notificación plano para contexto informativo dentro de
 * una página (alertas de sistema, avisos de formulario, etc.).
 * Diferente del AlertCard (métrico con gradiente) — este es para
 * mensajes textuales en el flujo del contenido.
 *
 * @example Soft (por defecto):
 * ```html
 * <app-info-banner
 *   message="La sesión expirará en 5 minutos."
 *   [config]="{ type: 'warning', title: 'Atención', closable: true }" />
 * ```
 *
 * @example Filled con acción:
 * ```html
 * <app-info-banner
 *   message="Tu perfil está incompleto."
 *   [config]="{ type: 'info', variant: 'filled', actionText: 'Completar ahora' }"
 *   (actionClick)="goToProfile()" />
 * ```
 */
@Component({
  selector: 'app-info-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent],
  styles: [`
    :host { display: block; }

    .banner-root {
      display: flex;
      align-items: flex-start;
      gap: var(--space-12);
      border-radius: var(--radius-lg);
      font-family: 'Montserrat', sans-serif;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .banner-root.dismissing {
      opacity: 0;
      transform: translateY(-4px);
    }

    /* Sizes */
    .banner-sm { padding: var(--space-8) var(--space-12); }
    .banner-md { padding: var(--space-12) var(--space-16); }
    .banner-lg { padding: var(--space-16) var(--space-20); }

    /* ── Icon ── */
    .banner-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── Body ── */
    .banner-body { flex: 1; min-width: 0; }
    .banner-title {
      font-size: var(--font-size-sm);
      font-weight: 700;
      margin-bottom: var(--space-4);
      line-height: 1.3;
    }
    .banner-sm .banner-title { font-size: var(--font-size-xs); }
    .banner-lg .banner-title { font-size: var(--font-size-md); }

    .banner-message {
      font-size: var(--font-size-sm);
      line-height: 1.55;
    }
    .banner-sm .banner-message { font-size: var(--font-size-xs); }
    .banner-lg .banner-message { font-size: var(--font-size-md); }

    /* ── Action + Close ── */
    .banner-actions {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .banner-action-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: var(--font-size-xs);
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      text-decoration: underline;
      text-underline-offset: 2px;
      transition: opacity 0.15s ease;
    }
    .banner-action-btn:hover { opacity: 0.8; }
    .banner-action-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px currentColor;
    }

    .banner-close-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s ease, background 0.15s ease;
    }
    .banner-close-btn:hover { opacity: 1; background: rgba(0,0,0,0.08); }
    .banner-close-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px currentColor;
    }
  `],
  template: `
    <div *ngIf="visible"
      class="banner-root"
      [class]="getRootClasses()"
      [style.background]="getBg()"
      [style.border]="getBorder()"
      [style.color]="getTextColor()"
      role="alert"
      [attr.aria-live]="cfg.type === 'danger' ? 'assertive' : 'polite'">

      <!-- Ícono -->
      <app-universal-icon
        *ngIf="!cfg.hideIcon"
        [name]="resolvedIcon"
        [type]="cfg.iconType ?? 'material'"
        [size]="iconSize"
        class="banner-icon"
        [customClass]="''"
        [style.color]="getIconColor()">
      </app-universal-icon>

      <!-- Texto -->
      <div class="banner-body">
        <div *ngIf="cfg.title" class="banner-title">{{ cfg.title }}</div>
        <div class="banner-message">
          <!-- Contenido externo (ng-content) o @Input message -->
          <ng-content></ng-content>
          <ng-container *ngIf="!hasProjectedContent">{{ message }}</ng-container>
        </div>
      </div>

      <!-- Acción + Cerrar -->
      <div class="banner-actions">
        <button
          *ngIf="cfg.actionText"
          type="button"
          class="banner-action-btn"
          [style.color]="getIconColor()"
          (click)="actionClick.emit()">
          {{ cfg.actionText }}
        </button>

        <button
          *ngIf="cfg.closable"
          type="button"
          class="banner-close-btn"
          aria-label="Cerrar aviso"
          (click)="dismiss()">
          <span class="material-symbols-outlined" style="font-size:1rem">close</span>
        </button>
      </div>
    </div>
  `
})
export class InfoBannerComponent implements OnInit {
  /** Mensaje principal. También acepta ng-content. */
  @Input() message = '';
  /** Configuración visual. */
  @Input() config: InfoBannerConfig = {};

  /** Emite al cerrar el banner. */
  @Output() dismissed = new EventEmitter<void>();
  /** Emite al hacer clic en el botón de acción. */
  @Output() actionClick = new EventEmitter<void>();

  visible = true;
  hasProjectedContent = false;

  private dismissTimer?: ReturnType<typeof setTimeout>;

  get cfg(): InfoBannerConfig {
    return this.config;
  }

  get resolvedIcon(): string {
    return this.cfg.icon ?? TYPE_ICON[this.cfg.type ?? 'info'];
  }

  get iconSize(): number {
    return this.cfg.size === 'sm' ? 16 : this.cfg.size === 'lg' ? 24 : 20;
  }

  ngOnInit(): void {
    if (this.cfg.autoDismiss && this.cfg.autoDismiss > 0) {
      this.dismissTimer = setTimeout(() => this.dismiss(), this.cfg.autoDismiss);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.dismissTimer);
  }

  dismiss(): void {
    this.visible = false;
    this.dismissed.emit();
  }

  getRootClasses(): string {
    const size   = `banner-${this.cfg.size ?? 'md'}`;
    const custom = this.cfg.customClass ?? '';
    return [size, custom].filter(Boolean).join(' ');
  }

  private colors() {
    return TYPE_COLORS[this.cfg.type ?? 'info'];
  }

  getBg(): string {
    const v = this.cfg.variant ?? 'soft';
    if (v === 'filled')  return this.colors().filled_bg;
    if (v === 'outline') return 'transparent';
    return this.colors().soft_bg;
  }

  getBorder(): string {
    const v = this.cfg.variant ?? 'soft';
    if (v === 'filled')  return 'none';
    if (v === 'outline') return `1.5px solid ${this.colors().outline_border}`;
    return `1px solid ${this.colors().soft_border}`;
  }

  getTextColor(): string {
    const v = this.cfg.variant ?? 'soft';
    if (v === 'filled')  return this.colors().filled_text;
    if (v === 'outline') return this.colors().outline_text;
    return this.colors().soft_text;
  }

  getIconColor(): string {
    const v = this.cfg.variant ?? 'soft';
    if (v === 'filled')  return 'rgba(255,255,255,0.9)';
    if (v === 'outline') return this.colors().outline_icon;
    return this.colors().soft_icon;
  }
}
