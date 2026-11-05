import { Component, Input, OnInit, Optional, Output, EventEmitter, ElementRef, HostListener, ChangeDetectorRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, ControlContainer, FormControl, ValidatorFn, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { UniversalIconComponent } from '../../universal-icon/universal-icon.component';
import { UiDensity, UiIconType, UiSize, UiState, UiStatus, UiVariant } from '../../_ui-types';

export interface SelectOption {
  value: unknown;
  label: string;
  disabled?: boolean;
  group?: string;
}


export interface SelectUiConfig {
  variant?: UiVariant;
  size?: UiSize;
  state?: UiState;
  floating?: boolean;
  iconLeft?: string;
  iconRight?: string;
  iconLeftType?: UiIconType;
  iconRightType?: UiIconType;
  /** @deprecated Use `state`. */
  status?: UiStatus;
  density?: UiDensity;
}

type ValidatorSpec = {
  required?: boolean;
  custom?: (value: unknown) => string | null; // return error message or null
  messages?: { [key: string]: string };
};

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UniversalIconComponent],
  template: `
    <!-- Loading state simplificado -->
    <div *ngIf="isInitializing" class="animate-pulse">
      <div class="h-12 bg-gray-200 rounded-md mb-3"></div>
    </div>

    <!-- Component content -->
    <div [class]="wrapperClass + ' mb-3'" [ngClass]="{'relative': true}" *ngIf="!isInitializing">
      
      <!-- Label -->
      <label *ngIf="label && !floating" [for]="controlId" class="form-label">
        {{ label }}<span *ngIf="isRequired" class="text-red-500"> *</span>
      </label>

      <!-- Container principal -->
      <div class="relative" [ngClass]="{'mt-1': label && !floating}">
        
        <!-- Input simulado con dropdown personalizado -->
        <div class="relative">
          
          <!-- Icono izquierdo -->
          <span *ngIf="iconLeft" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <app-universal-icon
              *ngIf="iconLeftType === 'universal'"
              [name]="iconLeft"
              [size]="20"
              customClass="text-current">
            </app-universal-icon>
            <span *ngIf="!iconLeftType || iconLeftType !== 'universal'">{{ iconLeft }}</span>
          </span>

          <!-- Input principal simulado -->
          <div
            [id]="controlId"
            class="peer cursor-pointer"
            [class]="inputClass"
            [ngClass]="cachedStateClasses"
            [class.pt-5]="floating"
            [class.pb-2]="floating"
            [attr.aria-expanded]="isOpen"
            [attr.aria-haspopup]="true"
            [attr.role]="'combobox'"
            [attr.aria-controls]="listboxId"
            [attr.aria-activedescendant]="activeDescendantId"
            [attr.aria-label]="computedAriaLabel"
            [attr.aria-disabled]="isInteractionDisabled()"
            [attr.tabindex]="isInteractionDisabled() ? -1 : 0"
            (click)="toggleDropdown(); $event.stopPropagation()"
            (keydown)="onKeyDown($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (mouseenter)="onMouseEnter()"
            (mouseleave)="onMouseLeave()"
            (mousedown)="onPointerDown()"
            (mouseup)="onPointerUp()">
            
            <!-- Texto mostrado -->
            <span class="block truncate" [class.text-gray-400]="!selectedOption">
              {{ selectedOption ? selectedOption.label : placeholder }}
            </span>
          </div>

          <!-- Floating label simplificado -->
          <label
            *ngIf="floating && label"
            [for]="controlId"
            class="absolute text-gray-500 pointer-events-none floating-label transition-all duration-200"
            [class.label--shifted]="labelShifted"
            [class.text-red-500]="invalidTouched"
            [class.text-green-500]="validTouched && !invalidTouched"
            [class.pl-12]="iconLeft"
            [class.pl-4]="!iconLeft">
            {{ label }} <span *ngIf="isRequired" class="text-red-500">*</span>
          </label>

          <!-- Icono de flecha -->
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg 
              class="w-5 h-5 text-gray-400 transition-transform duration-200"
              [class.rotate-180]="isOpen"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>

        <!-- Dropdown panel -->
        <div 
          *ngIf="isOpen"
          class="absolute w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto" style="z-index: var(--z-popover);"
          [style.width]="getComputedWidth() || '100%'"
          [id]="listboxId"
          role="listbox"
          [attr.aria-label]="'Opciones disponibles'"
          (click)="$event.stopPropagation()"
          (mousedown)="$event.stopPropagation()">
          
          <!-- No options message -->
          <div *ngIf="options.length === 0" class="px-4 py-3 text-sm text-gray-500 text-center">
            No hay opciones disponibles
          </div>

          <!-- Options list -->
          <ng-container *ngIf="options.length > 0">
            <!-- Opciones agrupadas -->
            <ng-container *ngIf="hasGroups(); else simpleOptionsList">
              <div *ngFor="let group of getGroups()">
                <!-- Group header -->
                <div class="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                  {{ group }}
                </div>
                <!-- Group options -->
                <div 
                  *ngFor="let option of getOptionsByGroup(group); let i = index"
                  class="option-item"
                  [class.highlighted]="highlightedIndex === getGlobalIndex(option)"
                  [class.selected]="isSelected(option)"
                  [class.disabled]="option.disabled"
                  [attr.id]="getOptionDomId(option)"
                  role="option"
                  [attr.aria-selected]="isSelected(option)"
                  (click)="selectOption(option)"
                  (mouseenter)="highlightedIndex = getGlobalIndex(option)">
                  
                  <div class="flex items-center justify-between px-4 py-3">
                    <span class="text-sm text-gray-900">{{ option.label }}</span>
                    <!-- Check icon for selected -->
                    <div *ngIf="isSelected(option)" class="flex-shrink-0">
                      <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
            
            <!-- Opciones simples -->
            <ng-template #simpleOptionsList>
              <div 
                *ngFor="let option of options; trackBy: trackByOption; let i = index"
                class="option-item"
                [class.highlighted]="highlightedIndex === i"
                [class.selected]="isSelected(option)"
                [class.disabled]="option.disabled"
                [attr.id]="getOptionDomId(option)"
                role="option"
                [attr.aria-selected]="isSelected(option)"
                (click)="selectOption(option)"
                (mouseenter)="highlightedIndex = i">
                
                <div class="flex items-center justify-between px-4 py-3">
                  <span class="text-sm font-medium text-gray-900">{{ option.label }}</span>
                  <!-- Check icon for selected -->
                  <div *ngIf="isSelected(option)" class="flex-shrink-0">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </ng-template>
          </ng-container>
        </div>
      </div>

      <!-- Mensajes de validación -->
      <div *ngIf="invalidTouched" class="mt-1">
        <div *ngIf="control?.errors?.['required']" class="error-message">
          {{ getMessage('required') || 'Este campo es requerido' }}
        </div>
        <div *ngIf="control?.errors?.['custom']" class="error-message">
          {{ control?.errors?.['custom'] }}
        </div>
      </div>

      <!-- Helper text -->
      <div *ngIf="helperText && !invalidTouched" class="mt-1 text-xs text-gray-500">
        {{ helperText }}
      </div>
    </div>
  `,
  styles: [`
    /* Floating label styles */
    .floating-label {
      transition: all var(--transition-fast);
      top: 50%;
      transform: translateY(-50%);
      left: var(--space-12);
      font-size: var(--font-size-md);
      background: white;
      padding: 0 var(--space-4);
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
    }

    .label--shifted {
      top: 0;
      transform: translateY(-50%);
      font-size: var(--font-size-xs);
      color: var(--institucional-primario) !important;
      font-weight: 600;
    }

    /* Input simulado styles */
    .peer {
      font-family: 'Montserrat', sans-serif;
      color: var(--gray-800);
      border: 1px solid var(--gray-300);
      border-radius: var(--border-radius);
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      min-height: var(--select-height, var(--component-control-height-md));
    }

    .peer:focus-visible {
      outline: none;
      border-color: var(--institucional-primario);
      box-shadow: 0 0 0 var(--focus-ring-size-md) var(--focus-ring-primary), var(--shadow-institucional);
    }

    .peer:disabled {
      background-color: var(--gray-50);
      color: var(--gray-400);
      cursor: not-allowed;
    }

    /* Dropdown styles */
    .option-item {
      cursor: pointer;
      transition: all var(--transition-fast);
      border-bottom: 1px solid var(--gray-100);
    }

    .option-item:last-child {
      border-bottom: none;
    }

    .option-item:hover,
    .option-item.highlighted {
      background-color: var(--gray-50);
    }

    .option-item.selected {
      background-color: rgba(139, 21, 56, 0.05);
      border-left: var(--focus-ring-size-md) solid var(--institucional-primario);
    }

    .option-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: var(--gray-50);
    }

    .option-item.disabled:hover {
      background-color: var(--gray-50);
    }

    /* Error styles */
    .error-message {
      color: var(--error);
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
      font-size: var(--font-size-sm);
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Scrollbar styles */
    .overflow-auto::-webkit-scrollbar {
      width: var(--space-4);
    }

    .overflow-auto::-webkit-scrollbar-track {
      background: var(--gray-100);
    }

    .overflow-auto::-webkit-scrollbar-thumb {
      background: var(--gray-300);
      border-radius: calc(var(--space-4) - 1px);
    }

    .overflow-auto::-webkit-scrollbar-thumb:hover {
      background: var(--gray-400);
    }
  `]
})
export class SelectComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() controlName = '';
  @Input() control?: FormControl;
  @Input() label = '';
  @Input() placeholder = 'Seleccionar...';
  @Input() options: SelectOption[] = [];
  @Input() validationMap: { [key: string]: ValidatorSpec } = {};
  @Input() required = false;

  private _uiConfig?: SelectUiConfig;
  @Input()
  set uiConfig(value: SelectUiConfig | undefined) {
    this._uiConfig = value;
    this.applyUiConfig();
  }
  get uiConfig(): SelectUiConfig | undefined {
    return this._uiConfig;
  }
  @Input() allowEmpty = true;
  @Input() width?: string;
  @Input() height?: string;
  @Input() extraClasses = '';
  @Input() helperText = '';
  @Input() ariaLabel = '';

  /** Input estandarizado de variante UI. */
  @Input() uiVariant?: UiVariant;
  /** Input estandarizado de tamaño UI. */
  @Input() uiSize?: UiSize;
  /** Input estandarizado de estado UI. */
  @Input() uiState?: UiState;
  
  // Variantes visuales y presentaciones
  /** @deprecated Usar `uiConfig.variant` para configuración avanzada visual. */
  @Input() variant: 'filled' | 'outlined' | 'borderless' | 'underlined' | 'rounded' | 'square' = 'outlined';
  /** @deprecated Usar `uiConfig.size` para configuración avanzada visual. */
  @Input() size: UiSize = 'md';
  @Input() state: UiState = 'default';
  /** @deprecated Usar `uiConfig.floating` para configuración avanzada visual. */
  @Input() floating = false;
  /** @deprecated Usar `uiConfig.iconLeft` para configuración avanzada visual. */
  @Input() iconLeft?: string;
  /** @deprecated Usar `uiConfig.iconRight` para configuración avanzada visual. */
  @Input() iconRight?: string;
  /** @deprecated Usar `uiConfig.iconLeftType` para configuración avanzada visual. */
  @Input() iconLeftType?: 'bootstrap' | 'material' | 'universal';
  /** @deprecated Usar `uiConfig.iconRightType` para configuración avanzada visual. */
  @Input() iconRightType?: 'bootstrap' | 'material' | 'universal';
  
  // NUEVAS PROPIEDADES DE PERSONALIZACIÓN
  @Input() customStyle?: Record<string, unknown>;
  @Input() theme?: string;
  @Input() customCss?: string;
  @Input() fullWidth = false;

  // Output events
  @Output() selectionChange = new EventEmitter<unknown>();
  /** @deprecated Use `selectionChange`. */
  @Output() change = this.selectionChange;

  // Estado interno
  controlId = '';
  listboxId = '';
  isFocused = false;
  isHovered = false;
  isActivePress = false;
  isOpen = false;
  selectedOption: SelectOption | null = null;
  highlightedIndex = -1;
  isInitializing = true;

  // Cache para optimización de rendimiento
  private _cachedStateClasses: Record<string, boolean> = {};
  private _isClassesDirty = true;

  get cachedStateClasses(): Record<string, boolean> {
    if (this._isClassesDirty) {
      this._cachedStateClasses = {
        'border-red-500 ring-red-500': this.invalidTouched,
        'border-green-500 ring-green-500': this.validTouched,
        'ring-2 ring-opacity-50': this.isOpen,
        'ui-state-default': this.state === 'default' && !this.isOpen && !this.isHovered && !this.isActivePress && !this.isInteractionDisabled(),
        'ui-state-hover': this.isHovered && !this.isInteractionDisabled(),
        'ui-state-active': this.isActivePress && !this.isInteractionDisabled(),
        'ui-state-disabled': this.isInteractionDisabled(),
        'ui-state-loading': this.state === 'loading',
        'ui-state-error': this.state === 'error' || this.invalidTouched
      };
      this._isClassesDirty = false;
    }
    return this._cachedStateClasses;
  }

  constructor(
    @Optional() private controlContainer: ControlContainer,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyUiConfig();
    this.controlId = this.controlName || `select-${Math.random().toString(36).slice(2, 9)}`;
    this.listboxId = `${this.controlId}-listbox`;
    this.attemptControlConnection();
    if (this.control) {
      this.setupInitialState();
    }
    this.assertAccessibleNameContract();
  }

  private applyUiConfig(): void {
    if (!this.uiConfig && !this.uiVariant && !this.uiSize && !this.uiState) {
      return;
    }

    const normalizedVariant = this.uiVariant ?? this.uiConfig?.variant;
    if (normalizedVariant) {
      this.variant = this.mapUiVariantToLegacyVariant(normalizedVariant);
    }
    this.size = this.uiSize ?? this.uiConfig?.size ?? this.size;
    this.state = this.resolveState(this.uiState ?? this.uiConfig?.state, this.uiConfig?.status);
    if (this.state === 'disabled' && this.control) {
      this.control.disable({ emitEvent: false });
    }
    this.floating = this.uiConfig?.floating ?? this.floating;
    this.iconLeft = this.uiConfig?.iconLeft ?? this.iconLeft;
    this.iconRight = this.uiConfig?.iconRight ?? this.iconRight;
    this.iconLeftType = (this.uiConfig?.iconLeftType as 'bootstrap' | 'material' | 'universal' | undefined) ?? this.iconLeftType;
    this.iconRightType = (this.uiConfig?.iconRightType as 'bootstrap' | 'material' | 'universal' | undefined) ?? this.iconRightType;
  }

  private mapUiVariantToLegacyVariant(variant: UiVariant): 'filled' | 'outlined' | 'borderless' | 'underlined' | 'rounded' | 'square' {
    switch (variant) {
      case 'secondary':
      case 'success':
        return 'filled';
      case 'warning':
      case 'danger':
        return 'underlined';
      case 'primary':
      default:
        return 'outlined';
    }
  }

  private resolveState(state?: UiState, status?: UiStatus): UiState {
    if (state) {
      return state;
    }
    if (status === 'disabled') {
      return 'disabled';
    }
    if (status === 'loading') {
      return 'loading';
    }
    return 'default';
  }

  ngAfterViewInit(): void {
    // Reintento de conexión para escenarios con contenido proyectado en stepper
    if (!this.control && this.controlName) {
      let attempts = 0;
      const maxAttempts = 8;
      const tryConnection = () => {
        attempts++;
        this.attemptControlConnection();
        if (this.control) {
          this.setupInitialState();
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(tryConnection, 40 * attempts);
        }
      };
      tryConnection();
    }

    // Forzar detección después de que la vista esté completamente inicializada
    setTimeout(() => {
      this.cdr.detectChanges();
      // Marcar como inicializado y invalidar cache
      this.isInitializing = false;
      this._isClassesDirty = true;
      this.cdr.detectChanges();
    }, 10); // Reducido de 50ms a 10ms
  }

  private attemptControlConnection(): void {
    if (this.control || !this.controlName) return;

    // Estrategia 1: ControlContainer directo
    if (this.controlContainer && this.controlContainer.control) {
      const parent = this.controlContainer.control as (AbstractControl & { get?: (name: string) => AbstractControl | null });
      if (parent && parent.get) {
        this.control = parent.get(this.controlName) as FormControl;
        if (this.control) return;
      }
    }

    // Estrategia 2: buscar StepperForm en el DOM (contenido proyectado)
    try {
      const stepperElement = this.elementRef.nativeElement.closest('app-stepper-form') as Element | null;
      const stepperComponent = stepperElement
        ? (window as { ng?: { getComponent?: (el: Element) => { masterFormGroup?: { get: (name: string) => FormControl | null } } | null } }).ng?.getComponent?.(stepperElement)
        : null;
      if (stepperComponent?.masterFormGroup) {
        this.control = stepperComponent.masterFormGroup.get(this.controlName) as FormControl;
      }
    } catch {
      // Ignorar errores de introspección en producción
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.applyUiConfig();
    // Reaccionar a cambios en inputs críticos
    if (changes['options'] && this.control) {
      this.updateSelectedOption(this.control.value);
    }
    
    if (changes['validationMap'] && this.control) {
      this.setupValidators();
      this._isClassesDirty = true; // Invalidar cache cuando cambian validaciones
    }
    
    // Forzar detección de cambios
    this.cdr.markForCheck();
  }

  private setupInitialState(): void {
    // Setup validators
    this.setupValidators();

    // Watch for value changes
    if (this.control!.value) {
      this.updateSelectedOption(this.control!.value);
    }

    this.control!.valueChanges.subscribe(value => {
      this.updateSelectedOption(value);
      // Forzar detección cuando cambia el valor
      this.cdr.markForCheck();
    });
    
    // Forzar detección inicial
    this.cdr.detectChanges();
  }

  private setupValidators(): void {
    if (!this.control) return;

    const spec = this.validationMap?.[this.controlName];
    if (spec) {
      if (!spec.messages) spec.messages = {};
      
      const fns: ValidatorFn[] = [];
      
      if (spec.required || this.required) {
        fns.push(Validators.required);
      }

      if (spec.custom) {
        const customFn: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
          const res = spec.custom!(c.value);
          return res ? { custom: res } : null;
        };
        fns.push(customFn);
      }

      if (fns.length) {
        this.control.setValidators(fns);
        this.control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
    }
  }

  private updateSelectedOption(value: unknown): void {
    this.selectedOption = this.options.find(option => option.value === value) || null;
    // Forzar detección cuando se actualiza la opción seleccionada
    this.cdr.markForCheck();
  }

  // Event handlers
  toggleDropdown(): void {
    if (this.isInteractionDisabled()) {
      return;
    }
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
    // Marcar cache como dirty cuando cambia el estado
    this._isClassesDirty = true;
    // Forzar detección después de toggle
    this.cdr.markForCheck();
  }

  openDropdown(): void {
    if (this.isInteractionDisabled()) {
      return;
    }
    this.isOpen = true;
    this._isClassesDirty = true;
    this.highlightedIndex = this.selectedOption ? 
      this.options.findIndex(option => option.value === this.selectedOption!.value) : -1;
    this.cdr.markForCheck();
  }

  closeDropdown(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this._isClassesDirty = true;
      this.highlightedIndex = -1;
      
      // Forzar la detección de cambios si es necesario
      if (this.cdr) {
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * Método público para forzar el cierre del dropdown
   * Útil cuando se necesita cerrar desde componentes padre
   */
  forceClose(): void {
    this.closeDropdown();
  }

  selectOption(option: SelectOption): void {
    if (option.disabled) return;

    this.selectedOption = option;
    
    if (this.control) {
      this.control.setValue(option.value);
      this.control.markAsDirty();
      this.control.markAsTouched();
    }
    
    this.selectionChange.emit(option.value);
    
    // Cerrar el dropdown de forma más robusta
    setTimeout(() => {
      this.closeDropdown();
      // Forzar detección después de selección
      this.cdr.detectChanges();
    }, 0);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isInteractionDisabled()) {
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateOptions(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateOptions(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen && this.highlightedIndex >= 0) {
          this.selectOption(this.options[this.highlightedIndex]);
        } else {
          this.toggleDropdown();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  private navigateOptions(direction: number): void {
    if (!this.isOpen) {
      this.openDropdown();
      return;
    }

    const enabledOptions = this.options.filter(option => !option.disabled);
    if (enabledOptions.length === 0) return;

    let newIndex = this.highlightedIndex + direction;
    
    if (newIndex < 0) {
      newIndex = this.options.length - 1;
    } else if (newIndex >= this.options.length) {
      newIndex = 0;
    }

    // Skip disabled options
    while (this.options[newIndex]?.disabled) {
      newIndex += direction;
      if (newIndex < 0) newIndex = this.options.length - 1;
      if (newIndex >= this.options.length) newIndex = 0;
    }

    this.highlightedIndex = newIndex;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Usar un timeout para asegurar que se ejecute después de otros eventos
    setTimeout(() => {
      const target = event.target as HTMLElement;
      
      // Verificar si el clic fue dentro del componente o del dropdown
      if (target && 
          this.isOpen && 
          !this.elementRef.nativeElement.contains(target)) {
        this.closeDropdown();
      }
    }, 0);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Cerrar inmediatamente en mousedown si es fuera del componente
    if (target && 
        this.isOpen && 
        !this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.closeDropdown();
      event.preventDefault();
    }
  }

  onFocus(): void {
    this.isFocused = true;
    this._isClassesDirty = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.isActivePress = false;
    this._isClassesDirty = true;
  }

  onMouseEnter(): void {
    this.isHovered = true;
    this._isClassesDirty = true;
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.isActivePress = false;
    this._isClassesDirty = true;
  }

  onPointerDown(): void {
    this.isActivePress = true;
    this._isClassesDirty = true;
  }

  onPointerUp(): void {
    this.isActivePress = false;
    this._isClassesDirty = true;
  }

  // Computed properties
  get invalidTouched(): boolean {
    return !!(this.control && this.control.invalid && this.control.touched);
  }

  get validTouched(): boolean {
    return !!(this.control && this.control.valid && this.control.touched && this.control.value);
  }

  get labelShifted(): boolean {
    return !!(this.control && this.control.value !== null && this.control.value !== '')
      || !!this.selectedOption
      || this.isFocused
      || this.isOpen;
  }

  get inputClass(): string {
    const sizeClasses = {
      xs: 'text-xs py-1 px-2',
      sm: 'text-sm py-2 px-3',
      md: 'text-base py-3 px-4',
      lg: 'text-lg py-4 px-5',
      xl: 'text-xl py-5 px-6'
    };

    const variantClasses = {
      outlined: 'bg-white border',
      filled: 'bg-gray-50 border-transparent',
      borderless: 'bg-transparent border-transparent',
      underlined: 'bg-transparent border-0 border-b',
      rounded: 'bg-white border rounded-full',
      square: 'bg-white border rounded-none'
    };

    return `w-full rounded-lg transition-all duration-200 ${sizeClasses[this.size]} ${variantClasses[this.variant]} ${this.extraClasses}`;
  }

  get wrapperClass(): string {
    return this.fullWidth ? 'w-full' : '';
  }

  isInteractionDisabled(): boolean {
    return this.state === 'disabled' || this.state === 'loading' || !!this.control?.disabled;
  }

  get isRequired(): boolean {
    return this.required || !!(this.validationMap?.[this.controlName]?.required);
  }

  // Style methods
  getBorderColor(): string | null {
    if (this.invalidTouched) return 'rgb(239,68,68)';
    if (this.validTouched) return 'rgb(16,185,129)';
    if (this.isOpen) return 'var(--institucional-primario)';
    return null;
  }

  getBoxShadow(): string | null {
    if (this.invalidTouched) return '0 0 0 var(--focus-ring-size-md) var(--focus-ring-danger)';
    if (this.validTouched) return '0 0 0 var(--focus-ring-size-md) color-mix(in srgb, var(--success) 26%, transparent)';
    if (this.isOpen) return '0 0 0 var(--focus-ring-size-md) var(--focus-ring-primary)';
    return null;
  }

  getComputedWidth(): string | null {
    return this.width ?? null;
  }

  getComputedHeight(): string | null {
    return this.height ?? null;
  }

  // Utility methods
  isSelected(option: SelectOption): boolean {
    return this.selectedOption?.value === option.value;
  }

  getOptionDomId(option: SelectOption): string {
    return `${this.controlId}-option-${this.getStableOptionId(option)}`;
  }

  getGlobalIndex(option: SelectOption): number {
    return this.options.findIndex(opt => opt.value === option.value);
  }


  private getStableOptionId(option: SelectOption): string {
    const rawValue = String(option.value ?? option.label ?? 'option');
    const normalized = rawValue
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'option';
  }

  getMessage(key: string): string | undefined {
    const spec = this.validationMap?.[this.controlName];
    return spec?.messages ? spec.messages[key] : undefined;
  }

  // Methods for grouped options
  hasGroups(): boolean {
    return this.options.some(option => option.group);
  }

  getGroups(): string[] {
    const groups = this.options
      .filter(option => option.group)
      .map(option => option.group!)
      .filter((group, index, array) => array.indexOf(group) === index);
    return groups;
  }

  getOptionsByGroup(group: string): SelectOption[] {
    return this.options.filter(option => option.group === group);
  }

  // Track by function for performance
  trackByOption(index: number, option: SelectOption): unknown {
    return option.value;
  }

  /**
   * Fuerza la sincronización de la selección desde el FormControl.
   * Útil cuando el control se actualiza programáticamente con emitEvent:false
   */
  refreshFromControl(): void {
    if (!this.control) return;
    this.updateSelectedOption(this.control.value);
    // Forzar detección de cambios para OnPush parents
    if (this.cdr) {
      this.cdr.detectChanges();
    }
  }

  get activeDescendantId(): string | null {
    if (!this.isOpen || this.highlightedIndex < 0 || this.highlightedIndex >= this.options.length) {
      return null;
    }
    return this.getOptionDomId(this.options[this.highlightedIndex]);
  }

  get computedAriaLabel(): string {
    return this.ariaLabel || this.label || this.placeholder || 'Selector';
  }

  private assertAccessibleNameContract(): void {
    if (!this.label && !this.ariaLabel && !this.placeholder) {
      throw new Error('[app-select] Debes definir `label` visible, `ariaLabel` o `placeholder` para accesibilidad.');
    }
  }
}
