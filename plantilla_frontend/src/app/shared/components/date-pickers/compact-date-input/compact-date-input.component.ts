import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, Optional, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ControlContainer, AbstractControl } from '@angular/forms';
import { DayPickerComponent } from '../day-picker/day-picker.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-compact-date-input',
  standalone: true,
  imports: [CommonModule, DayPickerComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CompactDateInputComponent),
      multi: true
    }
  ],
  template: `
    <div [class]="wrapperClass + ' mb-3'" [ngClass]="{'relative': true, 'z-[100]': showCalendar}">
      
      <!-- Label -->
      <label *ngIf="label && !floating" [for]="controlId" class="form-label">
        {{ label }}<span *ngIf="required" class="text-red-500"> *</span>
      </label>

      <!-- Container principal -->
      <div class="compact-date-input relative" #inputContainer [ngClass]="{'mt-1': label && !floating}">
        
        <!-- Input display con floating label -->
        <div class="relative">
          <!-- Input principal -->
          <div 
            [id]="controlId"
            class="peer w-full cursor-pointer"
            [class]="inputClass"
            [ngClass]="{ 
              'border-red-500 ring-red-500': hasError || invalidTouched,
              'border-green-500 ring-green-500': validTouched,
              'ring-2 ring-opacity-50': showCalendar
            }"
            [style.border-color]="getBorderColor()"
            [style.box-shadow]="getBoxShadow()"
            [style.width]="getComputedWidth()"
            [style.height]="getComputedHeight()"
            [style.paddingLeft.px]="floating ? 16 : 12"
            [style.paddingRight.px]="48"
            [style.paddingTop.px]="floating ? 14 : null"
            [style.paddingBottom.px]="floating ? 14 : null"
            (click)="toggleCalendar()"
            (keydown.enter)="toggleCalendar()"
            (keydown.space)="toggleCalendar(); $event.preventDefault()"
            (focus)="onFocus()"
            (blur)="onBlur()"
            tabindex="0"
            role="button"
            [attr.aria-label]="ariaLabel || 'Seleccionar fecha'"
            [attr.aria-expanded]="showCalendar">
            
            <div class="flex items-center justify-between h-full">
              <span class="text-sm truncate" [class.text-gray-400]="!selectedDate && floating" [class.text-gray-500]="!selectedDate && !floating" [class.text-gray-900]="selectedDate">
                {{ placeholder && !selectedDate ? '' : getDisplayText() }}
              </span>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  *ngIf="selectedDate && clearable"
                  type="button"
                  class="flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Limpiar fecha"
                  (click)="$event.stopPropagation(); clearDate()"
                  aria-label="Limpiar fecha">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Floating label -->
          <label
            *ngIf="floating"
            [for]="controlId"
            class="absolute left-4 text-gray-500 pointer-events-none floating-label transition-all duration-200"
            [class.label--shifted]="labelShifted"
            [class.text-red-500]="hasError || invalidTouched"
            [class.text-green-500]="validTouched && !(hasError || invalidTouched)">
            {{ label }} <span *ngIf="required" class="text-red-500">*</span>
          </label>
        </div>

        <!-- Calendar dropdown -->
        <div 
          *ngIf="showCalendar"
          #calendarDropdown
          class="fixed z-[9999]"
          [style.top.px]="calendarTop"
          [style.left.px]="calendarLeft"
          [style.width.px]="calendarWidth"
          (click)="$event.stopPropagation()">
          
          <app-daypicker
            [attr.data-key]="calendarKey"
            [selected]="selectedDate"
            [initialDate]="initialDateValue"
            [minDate]="minDate"
            [maxDate]="maxDate"
            [disabledDates]="disabledDates"
            [locale]="locale"
            [onlyCurrentMonth]="true"
            [showFooter]="false"
            [className]="'compact-calendar'"
            (dateChange)="onDateSelected($event)">
          </app-daypicker>
        </div>

        <!-- Backdrop para cerrar el calendario -->
        <div 
          *ngIf="showCalendar"
          class="fixed inset-0 z-40"
          (click)="closeCalendar()">
        </div>
      </div>

      <!-- Mensajes de validación -->
      <div *ngIf="invalidTouched" class="mt-1">
        <div *ngIf="hasValidationError('required')" class="error-message">
          Este campo es requerido
        </div>
        <div *ngIf="validationErrors && validationErrors['custom']" class="error-message">
          {{ validationErrors['custom'] }}
        </div>
      </div>

      <!-- Helper text -->
      <div *ngIf="helperText && !invalidTouched" class="mt-1 text-xs text-gray-500">
        {{ helperText }}
      </div>
    </div>
  `,
  styles: [`
    /* Variables simplificadas */
    :host {
      --primary: var(--institucional-primario, #8B1538);
      --transition: all 0.2s ease;
    }

    /* Floating label */
    .floating-label {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: white;
      padding: 0 4px;
      font-size: 1rem;
      color: #6b7280;
      transition: var(--transition);
      pointer-events: none;
    }

    .label--shifted {
      top: 0;
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 600;
    }

    /* Input base */
    .peer {
      width: 100%;
      min-height: 2.5rem;
      padding: 0.5rem 3rem 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      background: white;
      color: #374151;
      transition: var(--transition);
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .peer:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 21, 56, 0.1);
    }

    .peer:disabled {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    /* Contenedores */
    .compact-date-input { min-width: 200px; }
    .compact-calendar { max-width: 280px; }
    .compact-calendar .app-daypicker { 
      border: none; 
      padding: 16px; 
    }

    /* Estilos del calendario interno */
    :host ::ng-deep .compact-calendar .app-daypicker__day {
      width: 32px;
      height: 32px;
      font-size: 0.75rem;
    }

    :host ::ng-deep .compact-calendar .app-daypicker__weekday {
      font-size: 0.75rem;
    }

    :host ::ng-deep .compact-calendar .app-daypicker__header-content app-select .peer {
      min-height: 30px !important;
      padding-right: 32px !important;
    }

    /* Mensajes de error */
    .error-message {
      color: #ef4444;
      font-size: 0.875rem;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class CompactDateInputComponent implements ControlValueAccessor, AfterViewInit, OnChanges, OnDestroy {
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() disabledDates?: Date[] | ((date: Date) => boolean);
  @Input() locale: string = 'es-MX';
  @Input() placeholder: string = 'Seleccionar fecha';
  @Input() ariaLabel?: string;
  @Input() hasError: boolean = false;
  
  // Nuevas propiedades para floating label y validaciones
  @Input() label: string = '';
  @Input() floating: boolean = false;
  @Input() required: boolean = false;
  @Input() helperText: string = '';
  @Input() width?: string;
  @Input() height?: string;
  @Input() fullWidth: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() controlName = '';
  @Input() clearable = true;

  @Output() dateChange = new EventEmitter<string | Date | null>();

  @ViewChild('inputContainer', { static: false }) inputContainer!: ElementRef;
  @ViewChild('calendarDropdown', { static: false }) calendarDropdown!: ElementRef;

  selectedDate: Date | null = null;
  showCalendar = false;
  dropdownPosition: 'bottom' | 'top' = 'bottom';
  initialDateValue: Date = new Date();
  calendarTop: number = 0;
  calendarLeft: number = 0;
  calendarWidth: number = 280;
  calendarKey: number = 0;
  controlId: string = '';
  isFocused: boolean = false;
  validationErrors: Record<string, unknown> | null = null;
  @Input() control?: FormControl;
  private controlSubscription?: Subscription;

  // ControlValueAccessor implementation
  private onChange = (value: string | Date | null) => {};
  private onTouched = () => {};

  constructor(@Optional() private controlContainer?: ControlContainer, private cdr?: ChangeDetectorRef) {
    this.controlId = `compact-date-input-${Math.random().toString(36).slice(2, 9)}`;
  }

  ngAfterViewInit(): void {
    // Intentar obtener el FormControl del parent si se proporciona controlName
    this.setupFormControl();
    
    // Inicializar la fecha inicial basada en las restricciones
    this.updateInitialDate();
  }

  setControlFromParent(control: FormControl): void {
    if (this.control != null) return;
    this.bindToControl(control);
  }

  private setupFormControl(): void {
    if (this.controlName && this.controlContainer) {
      try {
        const parent = this.controlContainer.control as (AbstractControl & { get?: (name: string) => FormControl | null });

        if (parent && parent.get) {
          const found = parent.get(this.controlName) as FormControl;
          if (found) {
            this.bindToControl(found);
          }
        }
      } catch (error) {
        // Control not found in parent FormGroup; will rely on external [control] binding
      }
    }
  }

  private bindToControl(control: FormControl): void {
    this.control = control;

    // Aplicar valor inicial al UI
    try {
      this.writeValue(this.control.value);
    } catch (err) {}

    // Suscribirse a cambios externos
    this.controlSubscription = this.control.valueChanges.subscribe(val => {
      try { this.writeValue(val); } catch (e) {}
      if (this.cdr) this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.controlSubscription) {
      this.controlSubscription.unsubscribe();
      this.controlSubscription = undefined;
    }
    this._detachScrollListeners();
    this._detachWindowListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['minDate'] || changes['maxDate']) {
      this.updateInitialDate();
    }
  }

  private updateInitialDate(): void {
    const today = new Date();
    
    if (this.minDate && today < this.minDate) {
      this.initialDateValue = new Date(this.minDate);
    } else if (this.maxDate && today > this.maxDate) {
      this.initialDateValue = new Date(this.maxDate);
    } else {
      this.initialDateValue = new Date(today);
    }
  }

  onWindowResize = (): void => {
    if (this.showCalendar) {
      this.calculateDropdownPosition();
    }
  }

  onWindowScroll = (): void => {
    if (this.showCalendar) {
      this.calculateDropdownPosition();
    }
  }

  // Recalcular posición cuando haya scroll en elementos internos (ej: modal con scroll)
  private _scrollHandler = () => {
    if (this.showCalendar) {
      this.calculateDropdownPosition();
    }
  };

  private _scrollParents: Element[] = [];
  private _windowListenersAttached = false;

  // Accept different incoming formats from the FormControl (Date | string | number | null)
  writeValue(value: unknown): void {
    // Aceptar strings (YYYY-MM-DD, ISO), números (timestamp) o Date
    if (value === null || value === undefined || value === '') {
      this.selectedDate = null;
      return;
    }

    if (value instanceof Date) {
      this.selectedDate = this.isValidDate(value) ? new Date(value) : null;
      return;
    }

    if (typeof value === 'number') {
      const d = new Date(value);
      this.selectedDate = this.isValidDate(d) ? d : null;
      return;
    }

    if (typeof value === 'string') {
      // soportar 'YYYY-MM-DD' y variantes ISO
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        const parsed = new Date(y, mo - 1, d, 0, 0, 0, 0);
        this.selectedDate = this.isValidDate(parsed) ? parsed : null;
        return;
      }

      // intentar Date constructor para ISO u otros formatos
      const iso = new Date(value);
      this.selectedDate = this.isValidDate(iso) ? iso : null;
      return;
    }

    // Por defecto, limpiar
    this.selectedDate = null;
  }

  registerOnChange(fn: (value: string | Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  getDisplayText(): string {
    if (!this.selectedDate || !this.isValidDate(this.selectedDate)) {
      return this.placeholder;
    }

    try {
      return new Intl.DateTimeFormat(this.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(this.selectedDate);
    } catch (err) {
      return this.placeholder;
    }
  }

  private isValidDate(d: unknown): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
  }

  getCurrentDateForPicker(): Date {
    // Si ya hay una fecha seleccionada, la usamos
    if (this.selectedDate) {
      return this.selectedDate;
    }
    
    // Si no hay fecha seleccionada, usar la fecha actual
    const today = new Date();
    
    // Verificar si la fecha actual está dentro de los límites permitidos
    if (this.minDate && today < this.minDate) {
      return this.minDate;
    }
    
    if (this.maxDate && today > this.maxDate) {
      return this.maxDate;
    }
    
    return today;
  }

  getInitialDateForCalendar(): Date {
    // Solo retornar fecha inicial cuando el calendario está abierto y no hay fecha seleccionada
    if (!this.showCalendar || this.selectedDate) {
      return new Date(); // Valor por defecto
    }
    
    const today = new Date();
    
    if (this.minDate && today < this.minDate) {
      return this.minDate;
    }
    
    if (this.maxDate && today > this.maxDate) {
      return this.maxDate;
    }
    
    return today;
  }

  getInitialDate(): Date {
    // Fecha inicial para mostrar el calendario cuando no hay fecha seleccionada
    const today = new Date();
    
    // Verificar si la fecha actual está dentro de los límites permitidos
    if (this.minDate && today < this.minDate) {
      return this.minDate;
    }
    
    if (this.maxDate && today > this.maxDate) {
      return this.maxDate;
    }
    
    return today;
  }

  getCalendarClasses(): string {
    return '';
  }

  calculateDropdownPosition(): void {
    if (!this.inputContainer) return;

    const inputRect = this.inputContainer.nativeElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const calendarHeight = 400;
    const calendarW = Math.max(inputRect.width, 310);

    this.calendarWidth = calendarW;

    // Posición horizontal: alinear al borde izquierdo del input,
    // pero ajustar si se sale por la derecha del viewport
    let left = inputRect.left;
    if (left + calendarW > viewportWidth - 8) {
      left = viewportWidth - calendarW - 8;
    }
    if (left < 8) left = 8;
    this.calendarLeft = left;

    // Posición vertical
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;

    let top: number;
    if (spaceAbove > spaceBelow && spaceBelow < calendarHeight) {
      // Mostrar arriba
      top = inputRect.top - calendarHeight - 4;
    } else {
      // Mostrar abajo
      top = inputRect.bottom + 4;
    }

    // Clampear para que no se salga por la parte inferior del viewport
    if (top + calendarHeight > viewportHeight - 8) {
      top = viewportHeight - calendarHeight - 8;
    }
    if (top < 8) top = 8;
    this.calendarTop = top;
  }

  toggleCalendar(): void {
    if (!this.showCalendar) {
      this.calculateDropdownPosition();
      // Actualizar la fecha inicial cada vez que se abre el calendario
      this.updateInitialDate();
      // Incrementar la clave para forzar re-render del calendario
      this.calendarKey++;
      this._attachScrollListeners();
      this._attachWindowListeners();
    } else {
      this._detachScrollListeners();
      this._detachWindowListeners();
    }
    
    this.showCalendar = !this.showCalendar;
    
    if (this.showCalendar) {
      this.onTouched();
    }
  }

  closeCalendar(): void {
    this.showCalendar = false;
    this._detachScrollListeners();
    this._detachWindowListeners();
  }

  private _attachScrollListeners(): void {
    this._scrollParents = [];
    let el: Element | null = this.inputContainer?.nativeElement;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (/auto|scroll/.test(style.overflow + style.overflowY + style.overflowX)) {
        this._scrollParents.push(el);
        el.addEventListener('scroll', this._scrollHandler, { passive: true });
      }
      el = el.parentElement;
    }
  }

  private _detachScrollListeners(): void {
    this._scrollParents.forEach(el => el.removeEventListener('scroll', this._scrollHandler));
    this._scrollParents = [];
  }

  private _attachWindowListeners(): void {
    if (this._windowListenersAttached) return;
    window.addEventListener('resize', this.onWindowResize, { passive: true });
    window.addEventListener('scroll', this.onWindowScroll, { passive: true });
    this._windowListenersAttached = true;
  }

  private _detachWindowListeners(): void {
    if (!this._windowListenersAttached) return;
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('scroll', this.onWindowScroll);
    this._windowListenersAttached = false;
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
  }

  // Computed properties
  get labelShifted(): boolean {
    return !!(this.selectedDate || this.isFocused);
  }

  get invalidTouched(): boolean {
    return this.hasError || !!(this.validationErrors && Object.keys(this.validationErrors).length > 0);
  }

  get validTouched(): boolean {
    return !!(this.selectedDate && !this.invalidTouched);
  }

  get inputClass(): string {
    const sizeClasses = {
      sm: 'text-sm py-1 px-2 min-h-8',
      md: 'text-base py-2 px-3 min-h-10',
      lg: 'text-lg py-3 px-4 min-h-12'
    };

    return `w-full rounded-lg transition-all duration-200 ${sizeClasses[this.size]}`;
  }

  get wrapperClass(): string {
    return this.fullWidth ? 'w-full' : '';
  }

  // Style methods
  getBorderColor(): string | null {
    if (this.invalidTouched) return 'rgb(239,68,68)';
    if (this.validTouched) return 'rgb(16,185,129)';
    if (this.showCalendar) return 'var(--institucional-primario)';
    return null;
  }

  getBoxShadow(): string | null {
    if (this.invalidTouched) return '0 0 0 3px rgba(239,68,68,0.12)';
    if (this.validTouched) return '0 0 0 3px rgba(16,185,129,0.12)';
    if (this.showCalendar) return '0 0 0 3px rgba(139, 21, 56, 0.12)';
    return null;
  }

  getComputedWidth(): string | null {
    return this.width ?? null;
  }

  getComputedHeight(): string | null {
    return this.height ?? null;
  }

  // Validation methods
  hasValidationError(errorType: string): boolean {
    return !!(this.validationErrors && this.validationErrors[errorType]);
  }

  onDateSelected(date: Date): void {
    this.selectedDate = date;
    // Convertir a formato YYYY-MM-DD para consistencia
    const dateString = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null;
    this.onChange(dateString);
    this.dateChange.emit(dateString);

    // Actualizar el FormControl directamente (patrón controlName sin formControlName)
    if (this.control) {
      this.control.setValue(dateString, { emitEvent: true });
      this.control.markAsDirty();
      this.control.markAsTouched();
    }

    this.closeCalendar();
  }

  clearDate(): void {
    this.selectedDate = null;
    this.onChange(null);
    this.dateChange.emit(null);
    if (this.control) {
      this.control.setValue(null, { emitEvent: true });
      this.control.markAsDirty();
      this.control.markAsTouched();
    }
    this.closeCalendar();
  }
}
