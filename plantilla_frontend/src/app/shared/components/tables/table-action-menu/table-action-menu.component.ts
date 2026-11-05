import {
  Component, Input, Output, EventEmitter,
  ViewEncapsulation, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiVariant } from '../../_ui-types';
import { InstitutionalButtonComponent } from '../../buttons/institutional-button/institutional-button.component';

export interface TableActionItem {
  id: string;
  label: string;
  icon: string;
  variant?: UiVariant;
  disabled?: boolean;
  hidden?: boolean;
  divider?: boolean;
  ariaLabel?: string;
}

@Component({
  selector: 'app-table-action-menu',
  standalone: true,
  imports: [CommonModule, InstitutionalButtonComponent],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    app-table-action-menu {
      position: relative;
      display: inline-block;
    }

    .table-action-menu-dropdown {
      position: fixed;
      background: #fff;
      border-radius: var(--radius-md, 8px);
      box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.12));
      border: 1px solid var(--gray-200, #e2e8f0);
      min-width: 180px;
      overflow: hidden;
      z-index: var(--z-popover, 9999);
    }

    .table-action-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 14px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: var(--font-size-sm, 0.875rem);
      font-family: inherit;
      color: var(--gray-700, #374151);
      text-align: left;
      transition: background 0.15s ease;
      white-space: nowrap;
    }

    .table-action-item:hover:not(.table-action-item--disabled) {
      background: var(--gray-50, #f8fafc);
    }

    .table-action-item--disabled {
      opacity: 0.45;
      pointer-events: none;
      cursor: default;
    }

    .table-action-item--divider {
      border-top: 1px solid var(--gray-100, #f1f5f9);
      margin-top: 4px;
      padding-top: 10px;
    }

    .table-action-item-icon {
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    .table-action-item--danger,
    .table-action-item--danger .table-action-item-icon {
      color: var(--error, #ef4444);
    }

    .table-action-item--warning,
    .table-action-item--warning .table-action-item-icon {
      color: var(--warning, #f59e0b);
    }

    .table-action-item--success,
    .table-action-item--success .table-action-item-icon {
      color: var(--success, #10b981);
    }

    .table-action-item--primary,
    .table-action-item--primary .table-action-item-icon {
      color: var(--institucional-primario, #621132);
    }
  `],
  template: `
    <ng-container *ngIf="visibleItems.length > 0">
      <app-institutional-button
        [config]="{ variant: 'ghost', icon: 'more_vert', iconPosition: 'only', size: 'sm', ariaLabel: triggerAriaLabel, disabled: disabled }"
        (clicked)="toggle($event)">
      </app-institutional-button>

      <div *ngIf="isOpen" class="table-action-menu-dropdown" role="menu" [ngStyle]="dropdownStyle">
        <ng-container *ngFor="let item of visibleItems">
          <button
            type="button"
            role="menuitem"
            class="table-action-item"
            [class.table-action-item--disabled]="item.disabled"
            [class.table-action-item--divider]="item.divider"
            [class.table-action-item--danger]="item.variant === 'danger'"
            [class.table-action-item--warning]="item.variant === 'warning'"
            [class.table-action-item--success]="item.variant === 'success'"
            [class.table-action-item--primary]="item.variant === 'primary'"
            [disabled]="item.disabled || false"
            [attr.aria-label]="item.ariaLabel ?? item.label"
            (mousedown)="onItemClick(item, $event)">
            <span class="material-symbols-outlined table-action-item-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </ng-container>
      </div>
    </ng-container>
  `
})
export class TableActionMenuComponent implements OnDestroy {
  /** Notifica a todas las instancias activas cuál menú acaba de abrirse */
  private static readonly instances = new Set<TableActionMenuComponent>();
  private static readonly documentClickHandler = (event: Event): void => {
    for (const instance of TableActionMenuComponent.instances) instance.handleDocumentClick(event);
  };
  private static readonly documentEscapeHandler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    for (const instance of TableActionMenuComponent.instances) instance.closeMenu();
  };

  @Input() items: TableActionItem[] = [];
  @Input() triggerAriaLabel = 'Acciones';
  @Input() disabled = false;
  @Output() action = new EventEmitter<{ id: string; event: Event }>();

  isOpen = false;
  dropdownStyle: Record<string, string> = {};

  constructor(private el: ElementRef) {
    if (TableActionMenuComponent.instances.size === 0) {
      document.addEventListener('click', TableActionMenuComponent.documentClickHandler, true);
      document.addEventListener('keydown', TableActionMenuComponent.documentEscapeHandler, true);
    }
    TableActionMenuComponent.instances.add(this);
  }

  ngOnDestroy(): void {
    this.closeMenu();
    TableActionMenuComponent.instances.delete(this);
    if (TableActionMenuComponent.instances.size === 0) {
      document.removeEventListener('click', TableActionMenuComponent.documentClickHandler, true);
      document.removeEventListener('keydown', TableActionMenuComponent.documentEscapeHandler, true);
    }
  }

  private handleDocumentClick(event: Event): void {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  private closeMenu(): void {
    this.setParentTdZIndex('');
    this.isOpen = false;
  }

  get visibleItems(): TableActionItem[] {
    return this.items.filter(item => !item.hidden);
  }

  /**
   * position:sticky always creates a stacking context (even without explicit z-index).
   * Sibling sticky <td> elements from subsequent rows paint above the dropdown if their
   * stacking context has equal or higher z-index (DOM order wins when equal).
   * Fix: temporarily raise the parent <td> z-index while the dropdown is open so its
   * stacking context is above all other <td> stacking contexts.
   */
  private setParentTdZIndex(value: string): void {
    const td = (this.el.nativeElement as HTMLElement).closest('td') as HTMLElement | null;
    if (td) td.style.zIndex = value;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;

    if (!this.isOpen) {
      const rect: DOMRect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
      const dropdownHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      if (openUpward) {
        this.dropdownStyle = {
          bottom: `${window.innerHeight - rect.top + 4}px`,
          right: `${window.innerWidth - rect.right}px`
        };
      } else {
        this.dropdownStyle = {
          top: `${rect.bottom + 4}px`,
          right: `${window.innerWidth - rect.right}px`
        };
      }

      this.setParentTdZIndex('10000');
      for (const instance of TableActionMenuComponent.instances) {
        if (instance !== this) instance.closeMenu();
      }
    }

    this.isOpen = !this.isOpen;
  }

  onItemClick(item: TableActionItem, event: Event): void {
    // preventDefault en mousedown evita que el browser genere el evento click subsiguiente,
    // eliminando cualquier conflicto con document:click o (click) del <tr>
    event.preventDefault();
    event.stopPropagation();
    if (item.disabled) return;
    this.setParentTdZIndex('');
    this.isOpen = false;
    this.action.emit({ id: item.id, event });
  }
}
