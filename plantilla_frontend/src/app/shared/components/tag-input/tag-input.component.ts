import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, forwardRef, ChangeDetectorRef,
  ViewChild, ElementRef, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiSize, UiVariant } from '../_ui-types';

export interface TagItem {
  /** Valor del tag (lo que se incluye en el array de salida). */
  value: string;
  /** Etiqueta de display (si es diferente a value). */
  label?: string;
}

export interface TagInputConfig {
  /** Placeholder cuando no hay tags. Default: 'Agregar...' */
  placeholder?: string;
  /** Teclas que confirman un tag. Default: ['Enter', ',', ' '] */
  separators?: string[];
  /** Variante de color de los tags. Default: 'primary' */
  variant?: UiVariant;
  /** Tamaño. Default: 'md' */
  size?: UiSize;
  /** Número máximo de tags. 0 = sin límite. Default: 0 */
  maxTags?: number;
  /** Máximo de caracteres por tag. Default: 100 */
  maxLength?: number;
  /** Validar como URL. */
  validateUrl?: boolean;
  /** Validar como email. */
  validateEmail?: boolean;
  /** Expresión regular de validación personalizada. */
  pattern?: RegExp;
  /** Mensaje de error cuando el valor no cumple la validación. */
  validationError?: string;
  /** Permite duplicados. Default: false */
  allowDuplicates?: boolean;
  /** Transforma el valor antes de agregar (ej. toLowerCase). */
  transform?: 'lowercase' | 'uppercase' | 'trim';
  /** Clase adicional. */
  customClass?: string;
  /** Deshabilitar. Default: false */
  disabled?: boolean;
}

const VARIANT_COLORS: Record<UiVariant, { bg: string; text: string; border: string; dot: string }> = {
  primary:   { bg: 'rgba(157,36,73,0.10)', text: 'var(--institucional-primario)', border: 'rgba(157,36,73,0.3)', dot: 'var(--institucional-primario)' },
  secondary: { bg: 'rgba(98,17,50,0.10)',  text: 'var(--institucional-secundario)', border: 'rgba(98,17,50,0.3)', dot: 'var(--institucional-secundario)' },
  success:   { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', dot: '#10b981' },
  warning:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  danger:    { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  ghost:     { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#9ca3af' },
};

/**
 * TagInputComponent
 *
 * Input de chips/tags editable para redirect URIs, scopes OAuth,
 * allowed origins, emails múltiples, etc.
 * Compatible con `ControlValueAccessor`.
 *
 * @example Redirect URIs (con validación URL):
 * ```html
 * <app-tag-input
 *   [(ngModel)]="form.redirectUris"
 *   [config]="{
 *     placeholder: 'https://tu-app.com/callback',
 *     validateUrl: true,
 *     validationError: 'Debe ser una URL válida'
 *   }" />
 * ```
 *
 * @example Scopes OAuth:
 * ```html
 * <app-tag-input
 *   [(ngModel)]="form.scopes"
 *   [config]="{
 *     placeholder: 'openid, profile, email...',
 *     separators: ['Enter', ',', ' '],
 *     transform: 'lowercase',
 *     variant: 'secondary'
 *   }" />
 * ```
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
  styles: [`
    :host { display: block; }

    .ti-root {
      font-family: 'Montserrat', sans-serif;
      width: 100%;
    }

    /* ── Field wrapper ── */
    .ti-field {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-6) var(--space-10);
      border: 1.5px solid #e5e7eb;
      border-radius: var(--radius-lg);
      background: #fff;
      cursor: text;
      min-height: 2.5rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .ti-field.focused {
      border-color: var(--institucional-primario);
      box-shadow: 0 0 0 3px rgba(157,36,73,0.12);
    }
    .ti-field.has-error { border-color: #ef4444; }
    .ti-field.disabled  { background: #f9fafb; opacity: 0.6; cursor: not-allowed; }

    /* Sizes */
    .ti-sm .ti-field { padding: var(--space-4) var(--space-8); min-height: 2rem; }
    .ti-lg .ti-field { padding: var(--space-10) var(--space-14); min-height: 3rem; }

    /* ── Tag chip ── */
    .ti-tag {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-xs);
      font-weight: 600;
      padding: 2px var(--space-8);
      border: 1px solid;
      white-space: nowrap;
      max-width: 260px;
      animation: ti-pop 0.15s ease;
    }
    @keyframes ti-pop {
      from { transform: scale(0.8); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }

    .ti-tag-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }

    .ti-tag-remove {
      display: inline-flex;
      align-items: center;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      border-radius: 9999px;
      opacity: 0.6;
      transition: opacity 0.12s ease;
      flex-shrink: 0;
    }
    .ti-tag-remove:hover { opacity: 1; }
    .ti-tag-remove:focus-visible { outline: none; opacity: 1; }
    .ti-remove-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 0.875rem;
      font-variation-settings: 'FILL' 0, 'wght' 500;
    }

    /* ── Input ── */
    .ti-input {
      border: none;
      outline: none;
      background: transparent;
      font-family: 'Montserrat', sans-serif;
      font-size: var(--font-size-sm);
      color: #374151;
      flex: 1;
      min-width: 120px;
    }
    .ti-input::placeholder { color: #9ca3af; }
    .ti-input:disabled { cursor: not-allowed; }
    .ti-sm .ti-input { font-size: var(--font-size-xs); }

    /* ── Error + count ── */
    .ti-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--space-4);
    }
    .ti-error {
      font-size: var(--font-size-xs);
      color: #ef4444;
      font-weight: 600;
    }
    .ti-count {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      margin-left: auto;
    }
  `],
  template: `
    <div class="ti-root"
      [class]="'ti-' + resolvedSize"
      [class]="cfg.customClass ?? ''">

      <!-- Field -->
      <div class="ti-field"
        [class.focused]="focused"
        [class.has-error]="!!validationMsg"
        [class.disabled]="cfg.disabled"
        (click)="focusInput()">

        <!-- Tags -->
        <span
          *ngFor="let tag of tags; let i = index"
          class="ti-tag"
          [style.background]="tagColors.bg"
          [style.color]="tagColors.text"
          [style.borderColor]="tagColors.border">
          <span class="ti-tag-text" [title]="tag.label ?? tag.value">{{ tag.label ?? tag.value }}</span>
          <button
            *ngIf="!cfg.disabled"
            type="button"
            class="ti-tag-remove"
            [style.color]="tagColors.text"
            [attr.aria-label]="'Eliminar ' + (tag.label ?? tag.value)"
            (click)="removeTag(i, $event)">
            <span class="ti-remove-icon material-symbols-outlined">close</span>
          </button>
        </span>

        <!-- Input -->
        <input
          #inputEl
          class="ti-input"
          type="text"
          [placeholder]="tags.length === 0 ? (cfg.placeholder ?? 'Agregar...') : ''"
          [disabled]="!!cfg.disabled || isMaxReached"
          [maxlength]="cfg.maxLength ?? 256"
          [(ngModel)]="inputValue"
          (focus)="focused = true"
          (blur)="onBlur()"
          (keydown)="onKeydown($event)" />
      </div>

      <!-- Footer -->
      <div class="ti-footer" *ngIf="validationMsg || cfg.maxTags">
        <span *ngIf="validationMsg" class="ti-error">{{ validationMsg }}</span>
        <span *ngIf="cfg.maxTags" class="ti-count">{{ tags.length }} / {{ cfg.maxTags }}</span>
      </div>
    </div>
  `
})
export class TagInputComponent implements ControlValueAccessor, OnChanges {
  /** Lista de valores (strings) — vinculable con ngModel / formControl. */
  @Input() value: string[] = [];
  /** Configuración. */
  @Input() config: TagInputConfig = {};

  /** Emite el array actualizado. */
  @Output() tagsChange = new EventEmitter<string[]>();
  /** Emite al intentar agregar un tag inválido. */
  @Output() validationFail = new EventEmitter<string>();

  @ViewChild('inputEl') inputRef!: ElementRef<HTMLInputElement>;

  tags: TagItem[] = [];
  inputValue = '';
  focused    = false;
  validationMsg = '';

  private onChange: (v: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): TagInputConfig { return this.config; }
  get resolvedSize(): string { return this.cfg.size ?? 'md'; }
  get isMaxReached(): boolean {
    return !!(this.cfg.maxTags && this.tags.length >= this.cfg.maxTags);
  }
  get tagColors() {
    return VARIANT_COLORS[this.cfg.variant ?? 'primary'];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.tags = (this.value ?? []).map(v => ({ value: v }));
    }
  }

  focusInput(): void {
    this.inputRef?.nativeElement?.focus();
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
    // Confirmar lo que quedó en el input al salir
    if (this.inputValue.trim()) this.tryAdd(this.inputValue.trim());
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    const seps = this.cfg.separators ?? ['Enter', ','];
    const key  = event.key;

    // Backspace sin texto → borrar último tag
    if (key === 'Backspace' && !this.inputValue && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
      return;
    }

    if (seps.includes(key)) {
      event.preventDefault();
      const val = this.inputValue.trim().replace(/,$/, '').trim();
      if (val) this.tryAdd(val);
    }
  }

  private tryAdd(raw: string): void {
    this.validationMsg = '';
    let val = raw;

    // Transform
    if (this.cfg.transform === 'lowercase') val = val.toLowerCase();
    if (this.cfg.transform === 'uppercase') val = val.toUpperCase();
    val = val.trim();

    if (!val) return;

    // Duplicados
    if (!this.cfg.allowDuplicates && this.tags.some(t => t.value === val)) {
      this.validationMsg = 'Valor duplicado';
      this.validationFail.emit(val);
      return;
    }

    // Validación URL
    if (this.cfg.validateUrl) {
      try { new URL(val); }
      catch {
        this.validationMsg = this.cfg.validationError ?? 'URL inválida';
        this.validationFail.emit(val);
        this.cdr.markForCheck();
        return;
      }
    }

    // Validación email
    if (this.cfg.validateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      this.validationMsg = this.cfg.validationError ?? 'Email inválido';
      this.validationFail.emit(val);
      this.cdr.markForCheck();
      return;
    }

    // Pattern personalizado
    if (this.cfg.pattern && !this.cfg.pattern.test(val)) {
      this.validationMsg = this.cfg.validationError ?? 'Valor inválido';
      this.validationFail.emit(val);
      this.cdr.markForCheck();
      return;
    }

    if (this.isMaxReached) return;

    this.tags.push({ value: val });
    this.inputValue = '';
    this.emit();
    this.cdr.markForCheck();
  }

  removeTag(index: number, event?: Event): void {
    event?.stopPropagation();
    this.tags.splice(index, 1);
    this.validationMsg = '';
    this.emit();
    this.cdr.markForCheck();
  }

  private emit(): void {
    const values = this.tags.map(t => t.value);
    this.onChange(values);
    this.tagsChange.emit(values);
  }

  // ControlValueAccessor
  writeValue(v: string[]): void {
    this.tags = (v ?? []).map(val => ({ value: val }));
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (v: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.config = { ...this.config, disabled }; this.cdr.markForCheck(); }
}
