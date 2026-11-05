import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSize, UiVariant } from '../_ui-types';

export type AvatarShape = 'circle' | 'rounded' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

export interface AvatarConfig {
  /** Forma del avatar. Default: 'circle' */
  shape?: AvatarShape;
  /** Tamaño. Default: 'md' */
  size?: UiSize | 'xs' | 'xl';
  /** Color de fondo de las iniciales cuando no hay imagen. Default: ciclo institucional */
  variant?: UiVariant;
  /** Muestra un indicador de estado. */
  status?: AvatarStatus;
  /** Hace el avatar clicable (agrega cursor pointer y foco). Default: false */
  clickable?: boolean;
  /** Clase adicional para el host. */
  customClass?: string;
}

const PALETTE_CYCLE: string[] = [
  'var(--institucional-primario)',
  'var(--institucional-secundario)',
  'var(--institucional-vino)',
  '#5276ba',
  '#00afa5',
  '#9f3f8e',
];

const VARIANT_MAP: Record<string, string> = {
  primary:   'var(--institucional-primario)',
  secondary: 'var(--institucional-secundario)',
  success:   '#10b981',
  warning:   '#d97706',
  danger:    '#ef4444',
  ghost:     '#6b7280',
};

/**
 * AvatarComponent
 *
 * Muestra una imagen de perfil, o iniciales del nombre como fallback,
 * o un ícono genérico si no hay nombre. Compatible con el sistema
 * de diseño institucional.
 *
 * @example Imagen:
 * ```html
 * <app-avatar name="Juan Pérez" src="/assets/profile.jpg" />
 * ```
 *
 * @example Solo iniciales con estado:
 * ```html
 * <app-avatar name="Ana López" [config]="{ status: 'online', size: 'lg' }" />
 * ```
 *
 * @example Grupo de avatares (badge de conteo):
 * ```html
 * <app-avatar name="+3" [config]="{ variant: 'ghost', size: 'sm' }" />
 * ```
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: inline-block; flex-shrink: 0; }

    .avatar-root {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      color: #fff;
      user-select: none;
      transition: box-shadow 0.2s ease, opacity 0.2s ease;
    }
    .avatar-root.clickable { cursor: pointer; }
    .avatar-root.clickable:hover { opacity: 0.9; }
    .avatar-root.clickable:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(157, 36, 73, 0.35);
    }
    .avatar-root.clickable:active { opacity: 0.8; }

    /* Shapes */
    .avatar-circle  { border-radius: 9999px; }
    .avatar-rounded { border-radius: var(--radius-lg); }
    .avatar-square  { border-radius: var(--radius-md); }

    /* Sizes */
    .avatar-xs { width: 1.5rem;  height: 1.5rem;  font-size: 0.5rem; }
    .avatar-sm { width: 2rem;    height: 2rem;    font-size: 0.65rem; }
    .avatar-md { width: 2.5rem;  height: 2.5rem;  font-size: 0.8rem; }
    .avatar-lg { width: 3.5rem;  height: 3.5rem;  font-size: 1.1rem; }
    .avatar-xl { width: 5rem;    height: 5rem;    font-size: 1.5rem; }

    /* Image */
    .avatar-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Fallback icon (when no name and no image) */
    .avatar-icon {
      color: rgba(255,255,255,0.9);
    }
    .avatar-icon-xs  { font-size: 0.875rem; }
    .avatar-icon-sm  { font-size: 1rem; }
    .avatar-icon-md  { font-size: 1.25rem; }
    .avatar-icon-lg  { font-size: 1.75rem; }
    .avatar-icon-xl  { font-size: 2.5rem; }

    /* Status dot */
    .avatar-status {
      position: absolute;
      bottom: 0;
      right: 0;
      border-radius: 9999px;
      border: 2px solid #fff;
    }
    .status-xs { width: 0.4rem;  height: 0.4rem; }
    .status-sm { width: 0.5rem;  height: 0.5rem; }
    .status-md { width: 0.65rem; height: 0.65rem; }
    .status-lg { width: 0.875rem; height: 0.875rem; }
    .status-xl { width: 1.1rem;  height: 1.1rem; }

    .status-online  { background: #10b981; }
    .status-offline { background: #9ca3af; }
    .status-away    { background: #f59e0b; }
    .status-busy    { background: #ef4444; }
  `],
  template: `
    <div
      class="avatar-root"
      [class]="getRootClasses()"
      [style.background]="resolvedBg"
      [attr.tabindex]="cfg.clickable ? 0 : null"
      [attr.role]="cfg.clickable ? 'button' : null"
      [attr.aria-label]="name ? 'Avatar de ' + name : 'Avatar'"
      (click)="cfg.clickable && clicked.emit()"
      (keydown.enter)="cfg.clickable && clicked.emit()"
      (keydown.space)="cfg.clickable && clicked.emit()">

      <!-- Imagen -->
      <img
        *ngIf="src && !imgError"
        [src]="src"
        [alt]="name || 'Avatar'"
        class="avatar-img"
        (error)="onImgError()">

      <!-- Iniciales -->
      <span *ngIf="!src || imgError" [class.sr-only]="!initials">
        {{ initials }}
      </span>

      <!-- Ícono fallback (sin nombre y sin imagen) -->
      <span
        *ngIf="(!src || imgError) && !initials"
        class="material-symbols-outlined avatar-icon"
        [class]="'avatar-icon-' + resolvedSize"
        aria-hidden="true">
        person
      </span>

      <!-- Status indicator -->
      <span
        *ngIf="cfg.status"
        class="avatar-status"
        [class]="'status-' + resolvedSize + ' status-' + cfg.status"
        [attr.aria-label]="'Estado: ' + cfg.status">
      </span>
    </div>
  `
})
export class AvatarComponent implements OnChanges {
  /** Nombre completo del usuario. Se usa para generar las iniciales. */
  @Input() name?: string;
  /** URL de la imagen de perfil. */
  @Input() src?: string;
  /** Configuración visual. */
  @Input() config: AvatarConfig = {};

  /** Emite cuando el avatar es clickeado (config.clickable = true). */
  @Output() clicked = new EventEmitter<void>();

  initials = '';
  imgError = false;
  resolvedBg = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['name']) {
      this.initials = this.buildInitials(this.name);
    }
    if (changes['name'] || changes['config']) {
      this.resolvedBg = this.buildBg();
    }
    if (changes['src']) {
      this.imgError = false;
    }
  }

  get cfg(): AvatarConfig {
    return this.config;
  }

  get resolvedSize(): string {
    return this.cfg.size ?? 'md';
  }

  onImgError(): void {
    this.imgError = true;
  }

  getRootClasses(): string {
    const shape = `avatar-${this.cfg.shape ?? 'circle'}`;
    const size  = `avatar-${this.resolvedSize}`;
    const click = this.cfg.clickable ? 'clickable' : '';
    const custom = this.cfg.customClass ?? '';
    return [shape, size, click, custom].filter(Boolean).join(' ');
  }

  private buildInitials(name?: string): string {
    if (!name?.trim()) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private buildBg(): string {
    if (this.cfg.variant && VARIANT_MAP[this.cfg.variant]) {
      return VARIANT_MAP[this.cfg.variant];
    }
    if (!this.name) return PALETTE_CYCLE[0];
    // Ciclo de color determinístico basado en el nombre
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE_CYCLE[Math.abs(hash) % PALETTE_CYCLE.length];
  }
}
