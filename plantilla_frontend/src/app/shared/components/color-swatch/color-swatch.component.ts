import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, forwardRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { UiSize } from '../_ui-types';

export type ColorSwatchMode = 'display' | 'picker' | 'palette';

export interface ColorSwatchConfig {
  /** Modo de operación. Default: 'display' */
  mode?: ColorSwatchMode;
  /** Tamaño del swatch individual. Default: 'md' */
  size?: UiSize;
  /** Forma. Default: 'circle' */
  shape?: 'circle' | 'rounded' | 'square';
  /** Muestra el código hex bajo/al lado del swatch. Default: false */
  showHex?: boolean;
  /** Paleta de colores predefinida (para mode='palette'). */
  palette?: string[];
  /** Permite color personalizado (input text adicional). Default: false en display, true en picker */
  allowCustom?: boolean;
  /** Etiqueta. */
  label?: string;
  /** Clase adicional. */
  customClass?: string;
}

const DEFAULT_PALETTE: string[] = [
  '#9D2449', '#621132', '#722F37',
  '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#6b7280',
  '#111827', '#ffffff',
];

/**
 * ColorSwatchComponent
 *
 * Muestra y/o permite seleccionar colores para áreas, roles y facilities.
 * Compatible con `ControlValueAccessor` (ngModel / formControl).
 *
 * @example Display (solo visual):
 * ```html
 * <app-color-swatch [value]="area.color" [config]="{ showHex: true }" />
 * ```
 *
 * @example Paleta seleccionable:
 * ```html
 * <app-color-swatch
 *   [(ngModel)]="form.color"
 *   [config]="{ mode: 'palette', shape: 'circle', showHex: true }" />
 * ```
 *
 * @example Picker nativo:
 * ```html
 * <app-color-swatch
 *   [(ngModel)]="form.color"
 *   [config]="{ mode: 'picker', showHex: true, allowCustom: true }" />
 * ```
 */
@Component({
  selector: 'app-color-swatch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ColorSwatchComponent),
    multi: true,
  }],
  styles: [`
    :host { display: inline-block; }

    .cs-root {
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-8);
      font-family: 'Montserrat', sans-serif;
    }

    .cs-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: #374151;
    }

    /* ── Swatch ── */
    .cs-swatch {
      display: inline-flex;
      align-items: center;
      gap: var(--space-8);
      flex-wrap: wrap;
    }

    .cs-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: default;
      border: 2px solid transparent;
      transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
      position: relative;
    }
    /* Sizes */
    .cs-sm .cs-dot { width: 1.25rem; height: 1.25rem; }
    .cs-md .cs-dot { width: 1.75rem; height: 1.75rem; }
    .cs-lg .cs-dot { width: 2.5rem;  height: 2.5rem;  }

    /* Shapes */
    .cs-circle  .cs-dot { border-radius: 9999px; }
    .cs-rounded .cs-dot { border-radius: var(--radius-md); }
    .cs-square  .cs-dot { border-radius: 0; }

    /* Palette dot (clickable) */
    .cs-dot.clickable { cursor: pointer; }
    .cs-dot.clickable:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .cs-dot.clickable:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(157,36,73,0.3); }
    .cs-dot.selected { border-color: var(--institucional-primario); box-shadow: 0 0 0 2px rgba(157,36,73,0.25); }

    /* Check inside selected */
    .cs-check {
      font-family: 'Material Symbols Outlined';
      font-size: 0.75rem;
      font-variation-settings: 'FILL' 1, 'wght' 700;
      color: rgba(255,255,255,0.95);
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
    }

    /* Hex display */
    .cs-hex {
      font-family: 'Consolas', monospace;
      font-size: var(--font-size-xs);
      color: #6b7280;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    /* ── Native picker wrapper ── */
    .cs-picker-wrap {
      display: inline-flex;
      align-items: center;
      gap: var(--space-10);
    }
    .cs-native-input {
      width: 0;
      height: 0;
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .cs-pick-btn {
      position: relative;
      overflow: hidden;
    }
    /* Overlay invisible input over the swatch to trigger native picker */
    .cs-pick-btn input[type="color"] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      border: none;
      padding: 0;
    }

    /* Custom hex input */
    .cs-hex-input {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-8);
      font-family: 'Consolas', monospace;
      font-size: var(--font-size-xs);
      color: #374151;
      width: 7rem;
      transition: border-color 0.15s ease;
    }
    .cs-hex-input:focus { outline: none; border-color: var(--institucional-primario); }
  `],
  template: `
    <div class="cs-root"
      [class]="'cs-' + resolvedSize + ' cs-' + resolvedShape"
      [class]="cfg.customClass ?? ''">

      <!-- Label -->
      <span *ngIf="cfg.label" class="cs-label">{{ cfg.label }}</span>

      <!-- ── DISPLAY ── -->
      <ng-container *ngIf="resolvedMode === 'display'">
        <div class="cs-swatch">
          <span class="cs-dot" [style.background]="value || '#e5e7eb'"></span>
          <span *ngIf="cfg.showHex" class="cs-hex">{{ value || '–' }}</span>
        </div>
      </ng-container>

      <!-- ── PALETTE ── -->
      <ng-container *ngIf="resolvedMode === 'palette'">
        <div class="cs-swatch">
          <button
            *ngFor="let color of resolvedPalette"
            type="button"
            class="cs-dot clickable"
            [class.selected]="value === color"
            [style.background]="color"
            [attr.title]="color"
            (click)="selectColor(color)">
            <span *ngIf="value === color" class="cs-check material-symbols-outlined">check</span>
          </button>
        </div>
        <span *ngIf="cfg.showHex" class="cs-hex">{{ value || '–' }}</span>
      </ng-container>

      <!-- ── PICKER ── -->
      <ng-container *ngIf="resolvedMode === 'picker'">
        <div class="cs-picker-wrap">
          <!-- Swatch que abre el picker nativo -->
          <span class="cs-dot cs-pick-btn" [style.background]="value || '#e5e7eb'">
            <input type="color"
              [value]="value || '#000000'"
              (input)="onNativePick($event)" />
          </span>

          <!-- Input hex manual (si allowCustom) -->
          <input *ngIf="cfg.allowCustom !== false"
            type="text"
            class="cs-hex-input"
            placeholder="#000000"
            [value]="value"
            (blur)="onHexInput($event)"
            (keydown.enter)="onHexInput($event)" />

          <span *ngIf="cfg.showHex && cfg.allowCustom === false" class="cs-hex">{{ value || '–' }}</span>
        </div>
      </ng-container>

    </div>
  `
})
export class ColorSwatchComponent implements ControlValueAccessor {
  /** Color actual (formato hex #RRGGBB). */
  @Input() value = '';
  /** Configuración. */
  @Input() config: ColorSwatchConfig = {};

  /** Emite el nuevo color al cambiar. */
  @Output() colorChange = new EventEmitter<string>();

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): ColorSwatchConfig { return this.config; }
  get resolvedMode(): ColorSwatchMode { return this.cfg.mode ?? 'display'; }
  get resolvedSize(): string { return this.cfg.size ?? 'md'; }
  get resolvedShape(): string { return this.cfg.shape ?? 'circle'; }
  get resolvedPalette(): string[] { return this.cfg.palette ?? DEFAULT_PALETTE; }

  selectColor(color: string): void {
    this.value = color;
    this.onChange(color);
    this.onTouched();
    this.colorChange.emit(color);
    this.cdr.markForCheck();
  }

  onNativePick(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.selectColor(v);
  }

  onHexInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) this.selectColor(v);
  }

  // ControlValueAccessor
  writeValue(v: string): void { this.value = v ?? ''; this.cdr.markForCheck(); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
}
