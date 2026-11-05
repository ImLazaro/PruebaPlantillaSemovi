import {
  Component,
  Input,
  Output,
  EventEmitter,
  Optional,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  forwardRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ControlContainer,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true
    }
  ],
  template: `
    <label
      class="inline-flex items-center gap-2.5 cursor-pointer select-none group"
      [class.opacity-50]="isDisabled"
      [class.cursor-not-allowed]="isDisabled">
      <div class="relative flex items-center justify-center">
        <input
          type="checkbox"
          class="peer sr-only"
          [id]="controlId"
          [checked]="isChecked"
          [disabled]="isDisabled"
          (change)="onToggle($event)"
          (blur)="onBlur()" />
        <div
          class="flex items-center justify-center rounded transition-all duration-200 border-2"
          [ngClass]="getBoxClasses()">
          <!-- Check icon -->
          <svg
            *ngIf="isChecked"
            class="text-white"
            [ngClass]="getIconSize()"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            stroke-width="3">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <span
        *ngIf="label"
        class="text-gray-700 font-medium transition-colors duration-150"
        [ngClass]="getLabelClasses()">
        {{ label }}
      </span>
    </label>
  `,
  styles: [`
    :host {
      display: inline-block;
      font-family: 'Montserrat', sans-serif;
    }
  `]
})
export class CheckboxComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() label = '';
  @Input() controlName = '';
  @Input() control?: FormControl;
  @Input() disabled = false;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() variant: 'default' | 'indigo' = 'default';
  @Input() extraClasses = '';

  /** Standalone mode: bind checked state directly */
  @Input()
  set checked(val: boolean) {
    this._value = val;
    this.cdr.markForCheck();
  }

  /** Standalone mode: emits on toggle */
  @Output() change = new EventEmitter<boolean>();

  controlId = '';
  private _value = false;
  private _onChange: (value: boolean) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = false;
  private _control?: FormControl;
  private _controlSub?: Subscription;

  constructor(
    @Optional() private controlContainer: ControlContainer,
    private cdr: ChangeDetectorRef
  ) {}

  get isChecked(): boolean {
    return this._value;
  }

  get isDisabled(): boolean {
    return this.disabled || this._disabled;
  }

  ngOnInit(): void {
    this.controlId = this.controlName || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  }

  ngAfterViewInit(): void {
    this.attemptControlConnection();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control']) {
      this.attemptControlConnection();
    }
  }

  ngOnDestroy(): void {
    this._controlSub?.unsubscribe();
  }

  private attemptControlConnection(): void {
    if (this._control) return;

    if (this.control) {
      this._control = this.control;
      this._value = !!this.control.value;
      this._controlSub?.unsubscribe();
      this._controlSub = this.control.valueChanges.subscribe(val => {
        this._value = !!val;
        this.cdr.markForCheck();
      });
      this.cdr.markForCheck();
      return;
    }

    if (!this.controlName) return;
    if (this.controlContainer?.control) {
      const parent = this.controlContainer.control as import('@angular/forms').FormGroup;
      if (parent?.get) {
        const found = parent.get(this.controlName) as FormControl;
        if (found) {
          this._control = found;
          this._value = !!found.value;
          this._controlSub = found.valueChanges.subscribe(val => {
            this._value = !!val;
            this.cdr.markForCheck();
          });
          this.cdr.markForCheck();
        }
      }
    }
  }

  onToggle(event: Event): void {
    if (this.isDisabled) return;
    const target = event.target as HTMLInputElement;
    const newVal = target.checked;
    this._value = newVal;
    this._onChange(newVal);
    this._onTouched();

    if (this._control) {
      this._control.setValue(newVal);
      this._control.markAsDirty();
      this._control.markAsTouched();
    }

    this.change.emit(newVal);
    this.cdr.markForCheck();
  }

  onBlur(): void {
    this._onTouched();
  }

  getBoxClasses(): Record<string, boolean> {
    const isMedium = this.size === 'md';
    const isIndigo = this.variant === 'indigo';
    return {
      'w-5 h-5': isMedium,
      'w-4 h-4': !isMedium,
      // Checked state
      'bg-institucional-primario border-institucional-primario': this.isChecked && !isIndigo,
      'bg-indigo-600 border-indigo-600': this.isChecked && isIndigo,
      // Unchecked state
      'bg-white border-gray-300 group-hover:border-gray-400': !this.isChecked && !this.isDisabled,
      'bg-gray-100 border-gray-200': !this.isChecked && this.isDisabled,
      // Focus ring
      'ring-2 ring-offset-1 ring-institucional-primario/30': false
    };
  }

  getIconSize(): Record<string, boolean> {
    return {
      'w-3.5 h-3.5': this.size === 'md',
      'w-3 h-3': this.size === 'sm'
    };
  }

  getLabelClasses(): Record<string, boolean> {
    return {
      'text-sm': this.size === 'md',
      'text-xs': this.size === 'sm'
    };
  }

  // --- ControlValueAccessor ---
  writeValue(value: unknown): void {
    this._value = !!value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
