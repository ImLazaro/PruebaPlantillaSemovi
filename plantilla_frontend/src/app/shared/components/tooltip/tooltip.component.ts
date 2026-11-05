import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';
import { IconType } from '../sidebar/sidebar-menu.config';

export interface TooltipItem {
  label: string;
  icon?: string;
  iconType?: IconType;
  route?: string;
  children?: TooltipItem[];
}

export interface TooltipPosition {
  x: number;
  y: number;
}

/**
 * TooltipComponent - Tooltip reutilizable y genérico
 *
 * Proporciona tooltips reutilizables con dos modos:
 * - simple: Muestra solo el texto del elemento
 * - menu: Muestra un menú navegable con los elementos hijos
 */
@Component({
  selector: 'app-tooltip',
  imports: [CommonModule, RouterModule, UniversalIconComponent],
  template: `
    <!-- Tooltip simple para items sin hijos -->
  <div *ngIf="!item?.children"
     #panel
     class="tooltip-panel tooltip-simple fixed z-[60] bg-white rounded-lg shadow-lg min-w-[160px] max-w-xs pointer-events-auto"
     [class.tooltip-visible]="visible"
     [style.left.px]="computedLeft"
     [style.top.px]="computedTop"
     role="tooltip"
     [attr.aria-hidden]="!visible"
     (mouseenter)="onMouseEnter()"
     (mouseleave)="onMouseLeave()">

      <div class="px-3 py-2 flex items-center gap-2">
        <div *ngIf="item?.icon" class="tooltip-icon-wrap icon-wrap flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center">
          <app-universal-icon
            [name]="getItemIcon()"
            [type]="getItemIconType()"
            [size]="14"
            class="text-white">
          </app-universal-icon>
        </div>
        <div class="truncate text-sm font-semibold text-gray-900">{{ item?.label }}</div>
      </div>

      <!-- Flecha indicadora para tooltip simple -->
      <div class="tooltip-arrow"></div>
    </div>

    <!-- Tooltip con submenu para items con hijos -->
  <div *ngIf="item?.children"
     #panel
     class="tooltip-panel tooltip-menu fixed z-[60] bg-white rounded-lg shadow-lg min-w-[220px] pointer-events-auto overflow-hidden"
     [class.tooltip-visible]="visible"
     [style.left.px]="computedLeft"
     [style.top.px]="computedTop"
     role="menu"
     [attr.aria-hidden]="!visible"
     (mouseenter)="onMouseEnter()"
     (mouseleave)="onMouseLeave()">

      <!-- Título del submenu con fondo degradado -->
      <div class="tooltip-menu-header px-3 py-2.5 text-white flex items-center gap-2 border-b">
        <app-universal-icon
          *ngIf="item?.icon"
          [name]="getItemIcon()"
          [type]="getItemIconType()"
          [size]="16"
          class="mr-1 flex-shrink-0">
        </app-universal-icon>
        <span class="text-sm font-semibold truncate">{{ item?.label }}</span>
      </div>

      <!-- Items del submenu -->
      <div>
        <a *ngFor="let child of item?.children"
           [routerLink]="child.route"
           routerLinkActive="tooltip-menu-link-active"
           class="tooltip-menu-link flex items-center px-3 py-2 text-sm transition-colors duration-150 cursor-pointer"
           (click)="onItemClick(child)">
          <app-universal-icon
            *ngIf="child.icon"
            [name]="child.icon"
            [type]="child.iconType || 'bootstrap'"
            [size]="16"
            class="tooltip-menu-icon mr-2.5 flex-shrink-0">
          </app-universal-icon>
          <span class="truncate">{{ child.label }}</span>
        </a>
      </div>

      <div class="tooltip-arrow tooltip-arrow-menu"></div>
    </div>
  `,
  styles: [
    `:host { position: relative; }
     .tooltip-panel { opacity: 0; transform: translateY(-8px) scale(.96); transition: opacity .2s cubic-bezier(0.34, 1.56, 0.64, 1), transform .2s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 12px 32px rgba(98, 17, 50, 0.15), 0 4px 8px rgba(98, 17, 50, 0.1); border: 1px solid rgba(157, 36, 73, 0.18); }
     .tooltip-panel.tooltip-visible { opacity: 1; transform: translateY(0) scale(1); }
     .tooltip-panel .icon-wrap { flex-shrink: 0; }
     .tooltip-panel .truncate { max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
     .tooltip-icon-wrap { background: linear-gradient(135deg, var(--institucional-primario) 0%, var(--institucional-secundario) 100%); }
     .tooltip-menu-header { background: linear-gradient(90deg, var(--institucional-primario) 0%, var(--institucional-secundario) 100%); border-bottom-color: rgba(98, 17, 50, 0.16); }
     .tooltip-menu-link { color: var(--gray-700); }
     .tooltip-menu-link:hover { color: var(--institucional-primario); background: linear-gradient(90deg, rgba(157, 36, 73, 0.08) 0%, rgba(98, 17, 50, 0.08) 100%); }
     .tooltip-menu-icon { color: rgba(157, 36, 73, 0.82); }
     .tooltip-menu-link:hover .tooltip-menu-icon { color: var(--institucional-secundario); }
     .tooltip-menu-link-active { background: rgba(157, 36, 73, 0.12) !important; color: var(--institucional-primario) !important; font-weight: 700; border-left: 3px solid var(--institucional-secundario); padding-left: calc(0.75rem - 3px); }
     .tooltip-menu-link-active .tooltip-menu-icon { color: var(--institucional-secundario) !important; }
     .tooltip-menu-link-active:hover { background: rgba(157, 36, 73, 0.18) !important; color: var(--institucional-primario) !important; }
     .tooltip-arrow { position: absolute; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid white; filter: drop-shadow(0 2px 3px rgba(98, 17, 50, 0.08)); }
     .tooltip-simple .tooltip-arrow { left: 12px; top: 50%; transform: translateY(-50%) translateX(-100%); border-top-color: transparent; border-bottom: none; border-right-color: white; border-right-width: 9px; border-top-width: 7px; border-bottom-width: 7px; border-left: none; }
     .tooltip-menu .tooltip-arrow-menu { top: 14px; left: -9px; border-right-color: white; border-top-color: transparent; border-bottom-color: transparent; border-left: none; }
     @media (prefers-reduced-motion: reduce) { .tooltip-panel { transition: none; } }
    `
  ]
})
export class TooltipComponent {
  @Input() visible = false;
  @Input() item: TooltipItem | null = null;
  @Input() position: TooltipPosition = { x: 0, y: 0 };
  @ViewChild('panel') panelRef!: ElementRef<HTMLElement>;

  // posición ajustada para evitar que el tooltip se salga de la ventana
  computedLeft = 0;
  computedTop = 0;
  
  @Output() mouseEnter = new EventEmitter<void>();
  @Output() mouseLeave = new EventEmitter<void>();
  @Output() itemClick = new EventEmitter<TooltipItem>();

  onMouseEnter(): void {
    this.mouseEnter.emit();
  }

  onMouseLeave(): void {
    this.mouseLeave.emit();
  }

  onItemClick(item: TooltipItem): void {
    this.itemClick.emit(item);
  }

  getItemIcon(): string {
    return this.item?.icon || '';
  }

  getItemIconType(): IconType {
    return (this.item?.iconType || 'bootstrap') as IconType;
  }

  ngAfterViewInit(): void {
    // inicializar posición si es visible desde el inicio
    setTimeout(() => this.updatePosition(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] || changes['position'] || changes['item']) {
      // esperar que el DOM se actualice para medir
      setTimeout(() => this.updatePosition(), 0);
    }
  }

  private updatePosition(): void {
    try {
      const panel = this.panelRef?.nativeElement;
      if (!panel) {
        // sin referencia, usar posición original
        this.computedLeft = this.position.x;
        this.computedTop = this.position.y;
        return;
      }

      const panelRect = panel.getBoundingClientRect();
      const padding = 8; // separación mínima del borde de la ventana
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      // comenzar con la posición solicitada
      let left = this.position.x;
      let top = this.position.y;

      // si el tooltip se saldría por la derecha, ajustamos para que quepa
      if (left + panelRect.width + padding > viewportW) {
        left = Math.max(padding, viewportW - panelRect.width - padding);
      }

      // si se sale por la izquierda
      if (left < padding) {
        left = padding;
      }

      // si se sale por abajo
      if (top + panelRect.height + padding > viewportH) {
        top = Math.max(padding, viewportH - panelRect.height - padding);
      }

      if (top < padding) {
        top = padding;
      }

      this.computedLeft = Math.round(left);
      this.computedTop = Math.round(top);
    } catch (e) {
      // en caso de error, usar la posición original
      this.computedLeft = this.position.x;
      this.computedTop = this.position.y;
    }
  }
}

// Mantener export con el nombre anterior para compatibilidad de importaciones existentes
export { TooltipComponent as SidebarTooltipComponent };
