import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';

export interface AccordionItem {
  /** Identificador único del panel. */
  id: string;
  /** Título del panel (encabezado). */
  title: string;
  /** Subtítulo opcional bajo el título. */
  subtitle?: string;
  /** Ícono del encabezado (Bootstrap Icons o Material Symbols). */
  icon?: string;
  /** Tipo de ícono. Default: 'material' */
  iconType?: 'bootstrap' | 'material';
  /** Deshabilitar este panel. Default: false */
  disabled?: boolean;
  /** Badge de texto (p.ej. conteo de ítems). */
  badgeText?: string;
  /** Template para el contenido del panel. */
  contentTemplate?: TemplateRef<{ $implicit: AccordionItem }>;
}

export interface AccordionConfig {
  /** Permite abrir varios paneles simultáneamente. Default: false */
  multiple?: boolean;
  /** Estilo visual. Default: 'default' */
  variant?: 'default' | 'bordered' | 'flush';
  /** Panel(es) abiertos por defecto (ids). */
  openIds?: string[];
}

/**
 * AccordionComponent
 *
 * Grupos de paneles colapsables con encabezado institucional.
 * Soporta un solo panel abierto (modo acordeón) o múltiple.
 *
 * @example Básico:
 * ```html
 * <app-accordion
 *   [items]="panels"
 *   [config]="{ openIds: ['info'] }">
 *   <ng-template let-item>
 *     <p>Contenido de {{ item.title }}</p>
 *   </ng-template>
 * </app-accordion>
 * ```
 *
 * @example Con templates individuales por panel:
 * Asigna `item.contentTemplate` con una `@ViewChild` de tipo `TemplateRef`.
 */
@Component({
  selector: 'app-accordion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent],
  styles: [`
    :host { display: block; }

    .accordion-root { display: flex; flex-direction: column; }

    /* ── Variant: default ── */
    .acc-default { gap: var(--space-8); }

    .acc-default .accordion-panel {
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ── Variant: bordered ── */
    .acc-bordered {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .acc-bordered .accordion-panel + .accordion-panel {
      border-top: 1px solid #e5e7eb;
    }

    /* ── Variant: flush ── */
    .acc-flush .accordion-panel {
      border-bottom: 1px solid #e5e7eb;
    }
    .acc-flush .accordion-panel:last-child { border-bottom: none; }

    /* ── Header ── */
    .accordion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-12);
      width: 100%;
      padding: var(--space-16) var(--space-20);
      background: #fff;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: 'Montserrat', sans-serif;
      transition: background 0.15s ease;
      min-height: var(--interactive-size-md, 3rem);
    }
    .accordion-header:hover:not(:disabled) { background: #fafafa; }
    .accordion-header:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--institucional-primario);
    }
    .accordion-header:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .accordion-header.is-open {
      background: linear-gradient(135deg, var(--institucional-primario) 0%, var(--institucional-secundario) 100%);
      color: #fff;
    }

    /* Flush variant keeps white when open */
    .acc-flush .accordion-header.is-open {
      background: #fff;
      color: inherit;
    }
    .acc-flush .accordion-header.is-open .acc-title { color: var(--institucional-primario); }
    .acc-flush .accordion-header.is-open .acc-chevron { color: var(--institucional-primario); }

    .acc-left {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      flex: 1;
      min-width: 0;
    }

    .acc-icon-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-md);
      background: rgba(255,255,255,0.2);
    }
    .accordion-header:not(.is-open) .acc-icon-wrap {
      background: rgba(157,36,73,0.08);
      color: var(--institucional-primario);
    }
    .accordion-header.is-open .acc-icon-wrap {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }
    /* Flush: icon stays guinda when open */
    .acc-flush .accordion-header.is-open .acc-icon-wrap {
      background: rgba(157,36,73,0.08);
      color: var(--institucional-primario);
    }

    .acc-text { flex: 1; min-width: 0; }
    .acc-title {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .accordion-header:not(.is-open) .acc-title { color: #111827; }

    .acc-subtitle {
      font-size: var(--font-size-xs);
      opacity: 0.8;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .accordion-header:not(.is-open) .acc-subtitle { color: #6b7280; }

    /* Badge */
    .acc-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.25);
      color: #fff;
      flex-shrink: 0;
    }
    .accordion-header:not(.is-open) .acc-badge {
      background: rgba(157,36,73,0.1);
      color: var(--institucional-primario);
    }

    /* Chevron */
    .acc-chevron {
      flex-shrink: 0;
      transition: transform 0.25s ease;
      color: inherit;
      opacity: 0.85;
    }
    .accordion-header:not(.is-open) .acc-chevron { color: #9ca3af; }
    .acc-chevron.rotated { transform: rotate(180deg); }

    /* ── Body ── */
    .accordion-body {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.25s ease;
      opacity: 0;
      background: #fff;
    }
    .accordion-body.is-open {
      max-height: 2000px;
      opacity: 1;
    }

    .accordion-body-inner {
      padding: var(--space-20);
      font-size: var(--font-size-sm);
      color: #374151;
      font-family: 'Montserrat', sans-serif;
      line-height: 1.6;
    }
  `],
  template: `
    <div class="accordion-root" [class]="getRootClass()">
      <div
        *ngFor="let item of items"
        class="accordion-panel">

        <!-- Header / trigger -->
        <button
          type="button"
          class="accordion-header"
          [class.is-open]="isOpen(item.id)"
          [disabled]="item.disabled"
          [attr.aria-expanded]="isOpen(item.id)"
          [attr.aria-controls]="'acc-body-' + item.id"
          [attr.id]="'acc-header-' + item.id"
          (click)="toggle(item.id)">

          <div class="acc-left">
            <!-- Ícono -->
            <div *ngIf="item.icon" class="acc-icon-wrap">
              <app-universal-icon
                [name]="item.icon"
                [type]="item.iconType ?? 'material'"
                [size]="18">
              </app-universal-icon>
            </div>

            <!-- Texto -->
            <div class="acc-text">
              <div class="acc-title">{{ item.title }}</div>
              <div *ngIf="item.subtitle" class="acc-subtitle">{{ item.subtitle }}</div>
            </div>
          </div>

          <!-- Badge + chevron -->
          <span *ngIf="item.badgeText" class="acc-badge">{{ item.badgeText }}</span>

          <app-universal-icon
            name="expand_more"
            type="material"
            [size]="20"
            customClass="acc-chevron"
            [class.rotated]="isOpen(item.id)">
          </app-universal-icon>
        </button>

        <!-- Body -->
        <div
          class="accordion-body"
          [class.is-open]="isOpen(item.id)"
          [id]="'acc-body-' + item.id"
          role="region"
          [attr.aria-labelledby]="'acc-header-' + item.id">
          <div class="accordion-body-inner">
            <!-- Template personalizado -->
            <ng-container *ngIf="item.contentTemplate">
              <ng-container *ngTemplateOutlet="item.contentTemplate; context: { $implicit: item }">
              </ng-container>
            </ng-container>
            <!-- ng-content global (aplica a todos los paneles cuando no hay template por ítem) -->
            <ng-container *ngIf="!item.contentTemplate">
              <ng-content></ng-content>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccordionComponent {
  /** Lista de paneles. */
  @Input() items: AccordionItem[] = [];
  /** Configuración del acordeón. */
  @Input() config: AccordionConfig = {};

  /** Emite el id del panel al abrirse. */
  @Output() opened = new EventEmitter<string>();
  /** Emite el id del panel al cerrarse. */
  @Output() closed = new EventEmitter<string>();

  private openSet = new Set<string>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    for (const id of (this.config.openIds ?? [])) {
      this.openSet.add(id);
    }
  }

  get cfg(): AccordionConfig {
    return this.config;
  }

  isOpen(id: string): boolean {
    return this.openSet.has(id);
  }

  toggle(id: string): void {
    if (this.openSet.has(id)) {
      this.openSet.delete(id);
      this.closed.emit(id);
    } else {
      if (!this.cfg.multiple) this.openSet.clear();
      this.openSet.add(id);
      this.opened.emit(id);
    }
    this.cdr.markForCheck();
  }

  getRootClass(): string {
    const variant = this.cfg.variant ?? 'default';
    return `acc-${variant}`;
  }
}
