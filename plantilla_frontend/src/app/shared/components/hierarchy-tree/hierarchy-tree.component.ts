import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstitutionalBadgeComponent } from '../badge/institutional-badge/institutional-badge.component';

export interface TreeNode {
  /** Identificador único. */
  id: string;
  /** Etiqueta del nodo. */
  label: string;
  /** Descripción adicional (subtexto). */
  description?: string;
  /** Ícono Material Symbols opcional. */
  icon?: string;
  /** Badge (ej. conteo de hijos). */
  badge?: string | number;
  /** Variante del badge. */
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  /** Nodos hijos. */
  children?: TreeNode[];
  /** Datos personalizados asociados al nodo. */
  data?: unknown;
  /** Si está deshabilitado. */
  disabled?: boolean;
  /** Si inicia expandido. */
  expanded?: boolean;
}

export interface HierarchyTreeConfig {
  /** Muestra líneas de guía vertical. Default: true */
  showLines?: boolean;
  /** Permite seleccionar nodos. Default: false */
  selectable?: boolean;
  /** Permite selección múltiple. Default: false */
  multiSelect?: boolean;
  /** IDs inicialmente seleccionados. */
  selectedIds?: string[];
  /** IDs inicialmente expandidos (además de node.expanded). */
  expandedIds?: string[];
  /** Indentación por nivel en px. Default: 20 */
  indent?: number;
  /** Muestra el conteo de hijos como badge automático. Default: false */
  autoChildCount?: boolean;
  /** Clase adicional. */
  customClass?: string;
}

/**
 * HierarchyTreeComponent
 *
 * Árbol jerárquico genérico con expand/colapsar, selección y
 * líneas de guía. Reemplaza el código ad-hoc de `area-tree.component.ts`.
 *
 * @example Árbol de áreas organizacionales:
 * ```html
 * <app-hierarchy-tree
 *   [nodes]="areaTree"
 *   [config]="{ selectable: true, showLines: true }"
 *   (nodeSelected)="onAreaSelected($event)"
 *   (nodeExpanded)="onExpand($event)" />
 * ```
 *
 * @example Árbol de permisos:
 * ```html
 * <app-hierarchy-tree
 *   [nodes]="permissionTree"
 *   [config]="{ multiSelect: true, autoChildCount: true }"
 *   (selectionChange)="onPermissionsChange($event)" />
 * ```
 */
@Component({
  selector: 'app-hierarchy-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InstitutionalBadgeComponent],
  styles: [`
    :host { display: block; }

    .ht-root {
      font-family: 'Montserrat', sans-serif;
      font-size: var(--font-size-sm);
    }

    /* ── Node ── */
    .ht-node { position: relative; }

    .ht-row {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-6) var(--space-8);
      border-radius: var(--radius-md);
      cursor: default;
      transition: background 0.12s ease;
      user-select: none;
      min-height: 2.25rem;
    }
    .ht-row.clickable { cursor: pointer; }
    .ht-row.clickable:hover { background: rgba(157,36,73,0.06); }
    .ht-row.selected  { background: rgba(157,36,73,0.1); }
    .ht-row.selected .ht-label { color: var(--institucional-primario); font-weight: 700; }
    .ht-row.disabled  { opacity: 0.4; pointer-events: none; }
    .ht-row:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(157,36,73,0.3) inset; }

    /* Toggle chevron */
    .ht-toggle {
      flex-shrink: 0;
      width: 1.25rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      border-radius: var(--radius-sm);
      transition: transform 0.2s ease, color 0.15s ease;
    }
    .ht-toggle.open { transform: rotate(90deg); color: var(--institucional-primario); }
    .ht-toggle-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 1rem;
      font-variation-settings: 'FILL' 0, 'wght' 400;
    }
    .ht-toggle-spacer { width: 1.25rem; flex-shrink: 0; }

    /* Node icon */
    .ht-icon {
      flex-shrink: 0;
      font-family: 'Material Symbols Outlined';
      font-size: 1.1rem;
      font-variation-settings: 'FILL' 0, 'wght' 300;
      color: #9ca3af;
    }
    .ht-row.selected .ht-icon { color: var(--institucional-primario); }

    /* Labels */
    .ht-label {
      flex: 1;
      min-width: 0;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.15s ease;
    }
    .ht-desc {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ht-label-col { flex: 1; min-width: 0; }

    /* Guide lines */
    .ht-children {
      position: relative;
    }
    .ht-children.with-lines::before {
      content: '';
      position: absolute;
      left: 0.9rem;
      top: 0;
      bottom: 0.5rem;
      width: 1.5px;
      background: #e5e7eb;
      pointer-events: none;
    }

    /* Indented children */
    .ht-child-wrap { padding-left: 1.25rem; }

    /* Expand animation */
    .ht-children-body {
      overflow: hidden;
      animation: ht-expand 0.2s ease;
    }
    @keyframes ht-expand {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <div class="ht-root" [class]="cfg.customClass ?? ''">
      <ng-container *ngFor="let node of nodes">
        <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: node, depth: 0 }"></ng-container>
      </ng-container>
    </div>

    <!-- ── Node template (recursivo) ── -->
    <ng-template #nodeTemplate let-node let-depth="depth">
      <div class="ht-node">
        <!-- Row -->
        <div class="ht-row"
          [class.clickable]="cfg.selectable && !node.disabled"
          [class.selected]="isSelected(node)"
          [class.disabled]="node.disabled"
          [attr.tabindex]="cfg.selectable && !node.disabled ? 0 : null"
          [attr.role]="cfg.selectable ? 'treeitem' : null"
          [attr.aria-selected]="cfg.selectable ? isSelected(node) : null"
          [attr.aria-expanded]="hasChildren(node) ? isExpanded(node) : null"
          (click)="onRowClick(node, $event)"
          (keydown.enter)="onRowClick(node, $event)"
          (keydown.space)="onRowClick(node, $event)">

          <!-- Toggle -->
          <span *ngIf="hasChildren(node)"
            class="ht-toggle"
            [class.open]="isExpanded(node)"
            (click)="toggleExpand(node, $event)">
            <span class="ht-toggle-icon material-symbols-outlined">chevron_right</span>
          </span>
          <span *ngIf="!hasChildren(node)" class="ht-toggle-spacer"></span>

          <!-- Ícono del nodo -->
          <span *ngIf="node.icon" class="ht-icon material-symbols-outlined">{{ node.icon }}</span>

          <!-- Labels -->
          <div class="ht-label-col">
            <div class="ht-label">{{ node.label }}</div>
            <div *ngIf="node.description" class="ht-desc">{{ node.description }}</div>
          </div>

          <!-- Badge -->
          <app-institutional-badge
            *ngIf="node.badge !== undefined || (cfg.autoChildCount && hasChildren(node))"
            [config]="{ variant: node.badgeVariant ?? 'ghost', size: 'sm' }">
            {{ node.badge ?? (node.children?.length ?? 0) }}
          </app-institutional-badge>
        </div>

        <!-- Children (recursivo) -->
        <div *ngIf="hasChildren(node) && isExpanded(node)"
          class="ht-children"
          [class.with-lines]="cfg.showLines !== false">
          <div class="ht-child-wrap ht-children-body">
            <ng-container *ngFor="let child of node.children">
              <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: child, depth: depth + 1 }"></ng-container>
            </ng-container>
          </div>
        </div>
      </div>
    </ng-template>
  `
})
export class HierarchyTreeComponent {
  /** Nodos raíz del árbol. */
  @Input() nodes: TreeNode[] = [];
  /** Configuración. */
  @Input() config: HierarchyTreeConfig = {};

  /** Emite el nodo clicado/seleccionado. */
  @Output() nodeSelected = new EventEmitter<TreeNode>();
  /** Emite cuando un nodo se expande o colapsa. */
  @Output() nodeExpanded = new EventEmitter<{ node: TreeNode; expanded: boolean }>();
  /** Emite el conjunto completo de IDs seleccionados (multiSelect). */
  @Output() selectionChange = new EventEmitter<string[]>();

  private expandedSet = new Set<string>();
  private selectedSet = new Set<string>();

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): HierarchyTreeConfig { return this.config; }

  ngOnInit(): void {
    // Inicializar expandedIds desde config
    (this.cfg.expandedIds ?? []).forEach(id => this.expandedSet.add(id));
    (this.cfg.selectedIds ?? []).forEach(id => this.selectedSet.add(id));
    // Expandir nodos con node.expanded = true
    this.initExpanded(this.nodes);
  }

  private initExpanded(nodes: TreeNode[]): void {
    for (const n of nodes) {
      if (n.expanded) this.expandedSet.add(n.id);
      if (n.children) this.initExpanded(n.children);
    }
  }

  hasChildren(node: TreeNode): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  isExpanded(node: TreeNode): boolean {
    return this.expandedSet.has(node.id);
  }

  isSelected(node: TreeNode): boolean {
    return this.selectedSet.has(node.id);
  }

  toggleExpand(node: TreeNode, event: Event): void {
    event.stopPropagation();
    const expanded = !this.isExpanded(node);
    if (expanded) this.expandedSet.add(node.id);
    else          this.expandedSet.delete(node.id);
    this.nodeExpanded.emit({ node, expanded });
    this.cdr.markForCheck();
  }

  onRowClick(node: TreeNode, event: Event): void {
    if (node.disabled) return;
    // Expand/collapse si tiene hijos
    if (this.hasChildren(node)) {
      this.toggleExpand(node, event);
    }
    // Selección
    if (this.cfg.selectable) {
      if (this.cfg.multiSelect) {
        if (this.selectedSet.has(node.id)) this.selectedSet.delete(node.id);
        else this.selectedSet.add(node.id);
        this.selectionChange.emit([...this.selectedSet]);
      } else {
        this.selectedSet.clear();
        this.selectedSet.add(node.id);
        this.selectionChange.emit([node.id]);
      }
      this.nodeSelected.emit(node);
      this.cdr.markForCheck();
    }
  }
}
