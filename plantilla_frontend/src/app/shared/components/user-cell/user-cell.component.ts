import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';
import { InstitutionalBadgeComponent } from '../badge/institutional-badge/institutional-badge.component';
import { RelativeTimeComponent } from '../relative-time/relative-time.component';
import { UiSize } from '../_ui-types';

/** Datos mínimos del usuario para mostrar en la celda. */
export interface UserCellUser {
  /** ID o UUID del usuario. */
  id?: string;
  /** Nombre completo. */
  name?: string;
  /** Nombre de usuario / email. */
  username?: string;
  /** URL de foto de perfil. */
  photoUrl?: string;
  /** Si está activo. */
  isActive?: boolean;
  /** Si el email está verificado. */
  isVerified?: boolean;
  /** Si la cuenta está bloqueada. */
  isLocked?: boolean;
  /** Cargo o puesto. */
  position?: string;
  /** Área organizacional. */
  area?: string;
  /** RFC. */
  rfc?: string;
  /** Fecha del último acceso. */
  lastLoginAt?: Date | string | null;
  /** Cualquier metadato extra string. */
  metadata?: Record<string, string>;
}

export interface UserCellConfig {
  /** Tamaño del avatar. Default: 'sm' */
  avatarSize?: 'xs' | UiSize | 'xl';
  /** Muestra el avatar. Default: true */
  showAvatar?: boolean;
  /** Muestra el ID abreviado bajo el nombre. Default: false */
  showId?: boolean;
  /** Muestra estado (activo/bloqueado/inactivo). Default: true */
  showStatus?: boolean;
  /** Muestra el email/username. Default: true */
  showUsername?: boolean;
  /** Muestra última conexión. Default: false */
  showLastLogin?: boolean;
  /** Campos extra de metadata a mostrar (keys de UserCellUser.metadata). */
  extraFields?: string[];
  /** Hace la celda clicable. Default: false */
  clickable?: boolean;
  /** Layout. Default: 'horizontal' */
  layout?: 'horizontal' | 'compact' | 'stacked';
}

/**
 * UserCellComponent
 *
 * Celda reutilizable para mostrar un usuario en tablas, listas,
 * logs de seguridad y auditoría. Combina avatar + nombre + estado
 * con la lógica de display encapsulada.
 *
 * @example En tabla:
 * ```html
 * <app-user-cell [user]="row" [config]="{ showStatus: true, showUsername: true }" />
 * ```
 *
 * @example En log de seguridad:
 * ```html
 * <app-user-cell
 *   [user]="event.actor"
 *   [config]="{ showLastLogin: false, showId: true, avatarSize: 'xs' }" />
 * ```
 */
@Component({
  selector: 'app-user-cell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvatarComponent, InstitutionalBadgeComponent, RelativeTimeComponent],
  styles: [`
    :host { display: block; }

    .uc-root {
      display: inline-flex;
      align-items: center;
      gap: var(--space-10);
      font-family: 'Montserrat', sans-serif;
      min-width: 0;
    }
    .uc-root.clickable { cursor: pointer; }
    .uc-root.clickable:hover .uc-name { color: var(--institucional-primario); }
    .uc-root.clickable:focus-visible {
      outline: none;
      border-radius: var(--radius-md);
      box-shadow: 0 0 0 3px rgba(157,36,73,0.2);
    }

    /* Stacked */
    .uc-stacked { flex-direction: column; align-items: flex-start; }

    /* Info column */
    .uc-info { flex: 1; min-width: 0; }

    /* Name */
    .uc-name {
      font-weight: 700;
      font-size: var(--font-size-sm);
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s ease;
    }
    .uc-name-row {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      margin-bottom: 2px;
    }

    /* Username / ID */
    .uc-sub {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-wrap: wrap;
    }
    .uc-id-chip {
      font-family: 'Consolas', monospace;
      font-size: 0.65rem;
      background: #f3f4f6;
      border-radius: var(--radius-sm);
      padding: 1px 4px;
      color: #6b7280;
      white-space: nowrap;
    }

    /* Badges */
    .uc-badges { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }

    /* Compact */
    .uc-compact .uc-name { font-size: var(--font-size-xs); }
    .uc-compact .uc-sub  { font-size: 0.65rem; }
  `],
  template: `
    <div class="uc-root"
      [class.clickable]="cfg.clickable"
      [class.uc-stacked]="cfg.layout === 'stacked'"
      [class.uc-compact]="cfg.layout === 'compact'"
      [attr.tabindex]="cfg.clickable ? 0 : null"
      [attr.role]="cfg.clickable ? 'button' : null"
      (click)="cfg.clickable && clicked.emit(user)"
      (keydown.enter)="cfg.clickable && clicked.emit(user)">

      <!-- Avatar -->
      <app-avatar
        *ngIf="cfg.showAvatar !== false"
        [name]="user?.name ?? user?.username ?? '?'"
        [src]="user?.photoUrl"
        [config]="{ size: cfg.avatarSize ?? 'sm', status: user?.isLocked ? undefined : undefined }">
      </app-avatar>

      <!-- Info -->
      <div class="uc-info">
        <!-- Nombre + status badges -->
        <div class="uc-name-row">
          <span class="uc-name">{{ user?.name ?? user?.username ?? 'Sin nombre' }}</span>
        </div>

        <!-- Badges de estado -->
        <div *ngIf="cfg.showStatus !== false" class="uc-badges" style="margin-bottom:2px">
          <app-institutional-badge
            *ngIf="user?.isLocked"
            [config]="{ variant: 'danger', size: 'sm', icon: 'lock' }">
            Bloqueado
          </app-institutional-badge>
          <app-institutional-badge
            *ngIf="!user?.isLocked && user?.isActive === false"
            [config]="{ variant: 'ghost', size: 'sm' }">
            Inactivo
          </app-institutional-badge>
          <app-institutional-badge
            *ngIf="!user?.isLocked && user?.isActive !== false"
            [config]="{ variant: 'success', size: 'sm' }">
            Activo
          </app-institutional-badge>
          <app-institutional-badge
            *ngIf="user?.isVerified === false"
            [config]="{ variant: 'warning', size: 'sm', icon: 'mail' }">
            Sin verificar
          </app-institutional-badge>
        </div>

        <!-- Subtexto: username / RFC / área -->
        <div class="uc-sub">
          <span *ngIf="cfg.showUsername !== false && user?.username">
            {{ user!.username }}
          </span>
          <span *ngIf="user?.rfc" class="uc-id-chip">{{ user!.rfc }}</span>
          <span *ngIf="cfg.showId && user?.id" class="uc-id-chip">
            {{ (user!.id ?? '').slice(0, 8) }}…
          </span>
          <span *ngIf="user?.area">{{ user!.area }}</span>
        </div>

        <!-- Última conexión -->
        <div *ngIf="cfg.showLastLogin && user?.lastLoginAt" class="uc-sub" style="margin-top:2px">
          <span class="material-symbols-outlined" style="font-size:0.75rem">schedule</span>
          <app-relative-time [date]="user!.lastLoginAt!" />
        </div>
      </div>
    </div>
  `
})
export class UserCellComponent {
  /** Datos del usuario. */
  @Input() user?: UserCellUser | null;
  /** Configuración. */
  @Input() config: UserCellConfig = {};

  /** Emite al hacer clic (config.clickable = true). */
  @Output() clicked = new EventEmitter<UserCellUser | undefined | null>();

  get cfg(): UserCellConfig { return this.config; }
}
