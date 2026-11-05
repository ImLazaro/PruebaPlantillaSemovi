import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniversalIconComponent } from '../universal-icon/universal-icon.component';
import { UiSize, UiVariant } from '../_ui-types';

export type CopyVariant = 'inline' | 'block' | 'field';

export interface CopyToClipboardConfig {
  /** Variante visual del componente. Default: 'inline' */
  variant?: CopyVariant;
  /** Tamaño del botón de copia. Default: 'md' */
  size?: UiSize;
  /** Ocultar el texto del valor y mostrar solo el botón. Default: false */
  iconOnly?: boolean;
  /** Texto del tooltip al pasar el cursor. Default: 'Copiar' */
  tooltipCopy?: string;
  /** Texto del tooltip tras copiar. Default: 'Copiado' */
  tooltipCopied?: string;
  /** Duración en ms del estado "copiado". Default: 2000 */
  feedbackDuration?: number;
  /** Ocultar parcialmente el valor (ej. secrets). Default: false */
  masked?: boolean;
  /** Color del botón de copia. */
  buttonVariant?: UiVariant;
}

/**
 * CopyToClipboardComponent
 *
 * Muestra un valor de texto con un botón para copiarlo al portapapeles.
 *
 * @example Inline (dentro de una celda de tabla):
 * ```html
 * <app-copy-to-clipboard value="abc-123" />
 * ```
 *
 * @example Block (campo de tipo input, con máscara):
 * ```html
 * <app-copy-to-clipboard
 *   label="Client Secret"
 *   value="sk_live_XXXX"
 *   [config]="{ variant: 'field', masked: true }"
 * />
 * ```
 */
@Component({
  selector: 'app-copy-to-clipboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UniversalIconComponent],
  styles: [`
    :host { display: inline-block; }

    /* ── Field variant ── */
    .ctc-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      width: 100%;
    }
    .ctc-field-label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ctc-field-row {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-lg);
      padding: var(--space-8) var(--space-12);
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-sm);
      color: #374151;
      flex: 1;
    }
    .ctc-field-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Block variant ── */
    .ctc-block {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      width: 100%;
    }
    .ctc-block-value {
      flex: 1;
      font-size: var(--font-size-sm);
      color: #374151;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Inline variant ── */
    .ctc-inline {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
    }
    .ctc-inline-value {
      font-size: var(--font-size-sm);
      color: #374151;
      font-family: 'Courier New', monospace;
    }

    /* ── Copy button ── */
    .ctc-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: var(--radius-md);
      transition: background 0.15s ease, transform 0.1s ease, color 0.15s ease;
      color: #9ca3af;
      padding: var(--space-4);
    }
    .ctc-btn:hover:not(:disabled) {
      background: rgba(157, 36, 73, 0.08);
      color: var(--institucional-primario);
    }
    .ctc-btn:active:not(:disabled) {
      transform: scale(0.92);
    }
    .ctc-btn:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring-shadow-primary, 0 0 0 3px rgba(157, 36, 73, 0.25));
    }
    .ctc-btn.copied {
      color: #10b981;
      animation: ctc-pop 0.25s ease;
    }
    @keyframes ctc-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    /* ── Masked ── */
    .ctc-masked { letter-spacing: 0.2em; }

    /* ── Size variants ── */
    .ctc-btn-sm { padding: var(--space-4); }
    .ctc-btn-md { padding: var(--space-4) var(--space-8); }
    .ctc-btn-lg { padding: var(--space-8); }
  `],
  template: `
    <!-- FIELD variant (etiqueta + valor en caja + botón) -->
    <div *ngIf="resolvedVariant === 'field'" class="ctc-field">
      <span *ngIf="label" class="ctc-field-label">{{ label }}</span>
      <div class="ctc-field-row">
        <span class="ctc-field-value" [class.ctc-masked]="isMasked()">
          {{ displayValue }}
        </span>
        <ng-container *ngTemplateOutlet="copyBtn" />
      </div>
    </div>

    <!-- BLOCK variant (valor a toda la anchura + botón a la derecha) -->
    <div *ngIf="resolvedVariant === 'block'" class="ctc-block">
      <span *ngIf="label" class="ctc-field-label" style="flex-shrink:0">{{ label }}</span>
      <span class="ctc-block-value" [class.ctc-masked]="isMasked()">
        {{ displayValue }}
      </span>
      <ng-container *ngTemplateOutlet="copyBtn" />
    </div>

    <!-- INLINE variant (texto + ícono compacto) -->
    <span *ngIf="resolvedVariant === 'inline'" class="ctc-inline">
      <span *ngIf="!cfg.iconOnly" class="ctc-inline-value" [class.ctc-masked]="isMasked()">
        {{ displayValue }}
      </span>
      <ng-container *ngTemplateOutlet="copyBtn" />
    </span>

    <!-- ── Botón de copia reutilizable ── -->
    <ng-template #copyBtn>
      <button
        type="button"
        class="ctc-btn"
        [class.ctc-btn-sm]="cfg.size === 'sm'"
        [class.ctc-btn-md]="!cfg.size || cfg.size === 'md'"
        [class.ctc-btn-lg]="cfg.size === 'lg'"
        [class.copied]="copied"
        [attr.title]="copied ? (cfg.tooltipCopied || 'Copiado') : (cfg.tooltipCopy || 'Copiar')"
        [attr.aria-label]="copied ? 'Copiado al portapapeles' : 'Copiar al portapapeles'"
        (click)="copy()">
        <app-universal-icon
          [name]="copied ? 'check2' : 'copy'"
          type="bootstrap"
          [size]="iconSize">
        </app-universal-icon>
      </button>
    </ng-template>
  `
})
export class CopyToClipboardComponent implements OnDestroy {
  /** Valor que se copiará al portapapeles. */
  @Input() value: string = '';
  /** Etiqueta opcional (visible en variante 'field' y 'block'). */
  @Input() label?: string;
  /** Configuración visual del componente. */
  @Input() config: CopyToClipboardConfig = {};

  /** Emite cuando el valor fue copiado exitosamente. */
  @Output() copied$ = new EventEmitter<void>();
  /** Emite cuando ocurre un error al copiar. */
  @Output() error$ = new EventEmitter<Error>();

  copied = false;

  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): CopyToClipboardConfig {
    return this.config;
  }

  get resolvedVariant(): CopyVariant {
    return this.cfg.variant ?? 'inline';
  }

  get iconSize(): number {
    return this.cfg.size === 'sm' ? 14 : this.cfg.size === 'lg' ? 20 : 16;
  }

  get displayValue(): string {
    if (!this.cfg.masked) return this.value;
    if (this.value.length <= 8) return '••••••••';
    return this.value.slice(0, 4) + '••••' + this.value.slice(-4);
  }

  isMasked(): boolean {
    return !!this.cfg.masked;
  }

  async copy(): Promise<void> {
    if (this.copied) return;
    try {
      await navigator.clipboard.writeText(this.value);
      this.copied = true;
      this.cdr.markForCheck();
      this.copied$.emit();

      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, this.cfg.feedbackDuration ?? 2000);
    } catch (err) {
      this.error$.emit(err as Error);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.feedbackTimer);
  }
}
