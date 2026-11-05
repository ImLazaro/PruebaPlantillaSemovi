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
  OnDestroy
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
import { UiSize } from '../../_ui-types';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ],
  template: `
    <label
      class="inline-flex items-center gap-3 cursor-pointer select-none group"
      [class.opacity-50]="isDisabled"
      [class.cursor-not-allowed]="isDisabled">
      <button
        type="button"
        role="switch"
        [id]="controlId"
        [attr.aria-checked]="isChecked"
        [attr.aria-label]="label"
        [disabled]="isDisabled"
        class="relative inline-flex flex-shrink-0 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
        [ngClass]="getTrackClasses()"
        (click)="onToggle()"
        (blur)="onBlur()">
        <!-- Thumb -->
        <span
          aria-hidden="true"
          class="pointer-events-none inline-block rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-in-out"
          [ngClass]="getThumbClasses()">
        </span>
      </button>
      <span
        *ngIf="label || onLabel || offLabel"
        class="text-gray-700 font-medium transition-colors duration-150"
        [ngClass]="getLabelSizeClass()">
        {{ getDisplayLabel() }}
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
export class ToggleSwitchComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {
  @Input() label = '';
  @Input() onLabel = '';
  @Input() offLabel = '';
  @Input() controlName = '';
  @Input() disabled = false;
  @Input() size: UiSize = 'md';

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
    this.controlId = this.controlName || `toggle-${Math.random().toString(36).slice(2, 9)}`;
  }

  ngAfterViewInit(): void {
    this.attemptControlConnection();
  }

  ngOnDestroy(): void {
    this._controlSub?.unsubscribe();
  }

  private attemptControlConnection(): void {
    if (this._control || !this.controlName) return;
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

  onToggle(): void {
    if (this.isDisabled) return;
    const newVal = !this._value;
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

  getDisplayLabel(): string {
    if (this.onLabel && this.offLabel) {
      return this.isChecked ? this.onLabel : this.offLabel;
    }
    return this.label;
  }

  getTrackClasses(): Record<string, boolean> {
    const s = this.size;
    return {
      // Size
      'h-6 w-11': s === 'md',
      'h-5 w-9': s === 'sm',
      'h-7 w-[52px]': s === 'lg',
      // Colors
      'bg-emerald-500': this.isChecked,
      'bg-gray-300': !this.isChecked,
      // Focus
      'focus:ring-emerald-400': this.isChecked,
      'focus:ring-gray-300': !this.isChecked
    };
  }

  getThumbClasses(): Record<string, boolean> {
    const s = this.size;
    return {
      // Size
      'h-5 w-5': s === 'md',
      'h-4 w-4': s === 'sm',
      'h-6 w-6': s === 'lg',
      // Position
      'translate-x-5': this.isChecked && s === 'md',
      'translate-x-4': this.isChecked && s === 'sm',
      'translate-x-[26px]': this.isChecked && s === 'lg',
      'translate-x-0.5': !this.isChecked,
      // Vertical center
      'mt-0.5': true
    };
  }

  getLabelSizeClass(): Record<string, boolean> {
    return {
      'text-sm': this.size === 'md' || this.size === 'lg',
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
