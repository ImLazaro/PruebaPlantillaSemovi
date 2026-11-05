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
  ElementRef,
  ViewChild,
  NgZone,
  HostListener
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

/** Height (px) of each drum item — also the scroll-snap unit */
const ITEM_H = 44;
/** How many items are visible at once in the drum */
const VISIBLE_ITEMS = 5;
/** Total height of the drum track */
const COL_H = ITEM_H * VISIBLE_ITEMS; // 220 px
/** Padding so the first and last items can centre */
const DRUM_PAD = ITEM_H * Math.floor(VISIBLE_ITEMS / 2); // 88 px

type WheelCol = 'hours' | 'minutes' | 'seconds';

interface TimeParts { h: number; m: number; s: number; }

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimePickerComponent),
      multi: true
    }
  ],
  template: `
    <div [class]="wrapperClass + ' tp-wrapper'">

      <!-- Non-floating label -->
      <label *ngIf="label && !floating" [for]="controlId" class="tp-label">
        {{ label }}<span *ngIf="required" class="tp-req"> *</span
        ><span *ngIf="optional && !required" class="tp-opt"> (opcional)</span>
      </label>

      <!-- Field: input + dropdown -->
      <div class="tp-field" #inputContainer>

        <!-- Input row -->
        <div class="tp-control">
          <input
            type="text"
            [id]="controlId"
            [class]="'tp-input ' + inputSizeClass"
            [class.tp-input--invalid]="invalidTouched"
            [class.tp-input--open]="showDropdown"
            [value]="inputDisplayValue"
            [placeholder]="floating ? ' ' : placeholder"
            [disabled]="isDisabled"
            [readOnly]="readonly"
            (input)="onInputType($event)"
            (keydown)="onInputKeydown($event)"
            (blur)="onInputBlur()"
            (keydown.enter)="onInputEnter($event)"
            (keydown.escape)="closeDropdown()"
            (focus)="onFocus()"
            autocomplete="off"
            [attr.aria-label]="label || 'Seleccionar hora'"
            [attr.aria-expanded]="showDropdown"
            aria-haspopup="listbox"
          />
          <button
            type="button"
            class="tp-icon-btn"
            (mousedown)="$event.preventDefault()"
            (click)="toggleDropdown()"
            [disabled]="isDisabled"
            tabindex="-1"
            aria-hidden="true">
            <span class="material-symbols-outlined">schedule</span>
          </button>

          <!-- Floating label -->
          <label
            *ngIf="floating"
            [for]="controlId"
            class="tp-float-label"
            [class.tp-float-label--up]="labelShifted"
            [class.tp-float-label--error]="invalidTouched">
            {{ label }}<span *ngIf="required"> *</span
            ><span *ngIf="optional && !required" class="tp-opt"> (opcional)</span>
          </label>
        </div>

        <!-- ── Dropdown panel ── -->
        <div
          *ngIf="showDropdown"
          #dropdownPanel
          class="tp-dropdown"
          [class.tp-dropdown--wide]="showSeconds"
          [style.top.px]="dropdownTopPx"
          [style.left.px]="dropdownLeftPx"
          (mousedown)="$event.preventDefault()"
          (click)="$event.stopPropagation()">

          <!-- Header: preview + "Ahora" -->
          <div class="tp-hdr">
            <span class="tp-hdr-time">{{ pendingDisplay }}</span>
            <button type="button" class="tp-btn-now" (click)="setNow()">Ahora</button>
          </div>

          <!-- Drum wheels -->
          <div class="tp-wheels">

            <!-- Hours -->
            <div class="tp-track">
              <div class="tp-scroll" #hoursScroll
                   tabindex="0" role="listbox" aria-label="Horas"
                   (keydown)="onWheelKeydown($event, 'hours')">
                <div *ngFor="let h of hoursLoop; let i = index"
                     class="tp-item"
                     [class.tp-item--sel]="pendingHour === h"
                     [class.tp-item--dis]="isHourDisabled(h)"
                     role="option"
                     [attr.aria-selected]="pendingHour === h"
                     (click)="onWheelItemClick('hours', i)">{{ pad(h) }}</div>
              </div>
              <div class="tp-overlay" aria-hidden="true"></div>
              <div class="tp-bar"     aria-hidden="true"></div>
              <span class="tp-col-lbl" aria-hidden="true">HH</span>
            </div>

            <span class="tp-sep" aria-hidden="true">:</span>

            <!-- Minutes -->
            <div class="tp-track">
              <div class="tp-scroll" #minutesScroll
                   tabindex="0" role="listbox" aria-label="Minutos"
                   (keydown)="onWheelKeydown($event, 'minutes')">
                <div *ngFor="let m of minutesLoop; let i = index"
                     class="tp-item"
                     [class.tp-item--sel]="pendingMinute === m"
                     [class.tp-item--dis]="isMinuteDisabled(m)"
                     role="option"
                     [attr.aria-selected]="pendingMinute === m"
                     (click)="onWheelItemClick('minutes', i)">{{ pad(m) }}</div>
              </div>
              <div class="tp-overlay" aria-hidden="true"></div>
              <div class="tp-bar"     aria-hidden="true"></div>
              <span class="tp-col-lbl" aria-hidden="true">MM</span>
            </div>

            <ng-container *ngIf="showSeconds">
              <span class="tp-sep" aria-hidden="true">:</span>

              <!-- Seconds -->
              <div class="tp-track">
                <div class="tp-scroll" #secondsScroll
                     tabindex="0" role="listbox" aria-label="Segundos"
                     (keydown)="onWheelKeydown($event, 'seconds')">
                  <div *ngFor="let s of secondsLoop; let i = index"
                       class="tp-item"
                       [class.tp-item--sel]="pendingSecond === s"
                       [class.tp-item--dis]="isSecondDisabled(s)"
                       role="option"
                       [attr.aria-selected]="pendingSecond === s"
                       (click)="onWheelItemClick('seconds', i)">{{ pad(s) }}</div>
                </div>
                <div class="tp-overlay" aria-hidden="true"></div>
                <div class="tp-bar"     aria-hidden="true"></div>
                <span class="tp-col-lbl" aria-hidden="true">SS</span>
              </div>
            </ng-container>
          </div>

          <!-- Footer: Cancel / Confirm -->
          <div class="tp-ftr">
            <button type="button" class="tp-btn-cancel" (click)="closeDropdown()">Cancelar</button>
            <button
              type="button"
              class="tp-btn-ok"
              [class.tp-btn-ok--on]="canConfirm"
              [disabled]="!canConfirm"
              (click)="confirmSelection()">Aceptar</button>
          </div>
        </div>

        <!-- Click-away backdrop -->
        <div *ngIf="showDropdown" class="tp-backdrop" (click)="closeDropdown()"></div>
      </div>

      <!-- Validation error -->
      <div *ngIf="invalidTouched" class="tp-error">
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        Este campo es requerido
      </div>

      <!-- Helper text -->
      <p *ngIf="helperText && !invalidTouched" class="tp-helper">{{ helperText }}</p>
    </div>
  `,
  styles: [`
    /* ── HOST ── */
    :host {
      display: block;
      font-family: 'Montserrat', sans-serif;
    }

    /* ── WRAPPER ── */
    .tp-wrapper {
      position: relative;
      margin-bottom: 1rem;
    }

    /* ── LABELS ── */
    .tp-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary, #374151);
      margin-bottom: 0.25rem;
      font-family: 'Montserrat', sans-serif;
    }
    .tp-req { color: #ef4444; }
    .tp-opt { font-size: 0.75rem; color: var(--text-tertiary, #9ca3af); }

    .tp-float-label {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-tertiary, #6b7280);
      pointer-events: none;
      background: var(--bg-primary, #fff);
      padding: 0 0.25rem;
      transition: top 0.2s ease, font-size 0.2s ease, color 0.2s ease, transform 0.2s ease;
      z-index: 1;
      white-space: nowrap;
    }
    .tp-float-label--up {
      top: 0;
      transform: translateY(-50%);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--institucional-primario, #9D2449);
    }
    .tp-float-label--error { color: #ef4444 !important; }

    /* ── FIELD ── */
    .tp-field { position: relative; }
    .tp-control { position: relative; }

    /* ── INPUT ── */
    .tp-input {
      width: 100%;
      padding: 0.5rem 3rem 0.5rem 0.75rem;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 0.5rem;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #374151);
      font-family: 'Montserrat', sans-serif;
      font-size: 0.875rem;
      line-height: 1.5;
      min-height: 2.625rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .tp-input:focus,
    .tp-input--open {
      border-color: var(--institucional-primario, #9D2449) !important;
      box-shadow: 0 0 0 3px rgba(157, 36, 73, 0.12) !important;
    }
    .tp-input--invalid {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important;
    }
    .tp-input:disabled {
      background: var(--bg-secondary, #f9fafb);
      color: var(--text-tertiary, #9ca3af);
      cursor: not-allowed;
    }
    .tp-input::placeholder { color: var(--text-tertiary, #9ca3af); font-weight: 400; }
    .tp-input--sm { font-size: 0.8125rem; min-height: 2rem;    padding-top: 0.25rem;  padding-bottom: 0.25rem;  }
    .tp-input--md { font-size: 0.875rem;  min-height: 2.625rem; }
    .tp-input--lg { font-size: 1rem;      min-height: 3rem;    padding-top: 0.75rem;  padding-bottom: 0.75rem;  }

    /* ── CLOCK ICON BUTTON ── */
    .tp-icon-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-tertiary, #9ca3af);
      padding: 0;
      display: flex;
      align-items: center;
      transition: color 0.15s ease;
    }
    .tp-icon-btn:hover { color: var(--text-secondary, #6b7280); }
    .tp-icon-btn:disabled { cursor: not-allowed; opacity: 0.5; }
    .tp-icon-btn .material-symbols-outlined { font-size: 1.25rem; line-height: 1; }

    /* ── DROPDOWN PANEL ── */
    .tp-dropdown {
      position: fixed;
      z-index: 9999;
      background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08);
      width: 208px;
      overflow: hidden;
      font-family: 'Montserrat', sans-serif;
    }
    .tp-dropdown--wide { width: 292px; }

    /* ── HEADER ── */
    .tp-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 1rem;
      border-bottom: 1px solid var(--border-color, #f3f4f6);
      background: var(--bg-secondary, #f9fafb);
    }
    .tp-hdr-time {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--text-primary, #111827);
      letter-spacing: 0.04em;
      font-variant-numeric: tabular-nums;
    }
    .tp-btn-now {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--institucional-primario, #9D2449);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      transition: background 0.15s ease;
    }
    .tp-btn-now:hover { background: rgba(157,36,73,0.08); }

    /* ── DRUM WHEELS LAYOUT ── */
    .tp-wheels {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 0.75rem 1.5rem;
      background: var(--bg-primary, #fff);
      gap: 0;
    }
    .tp-sep {
      flex-shrink: 0;
      width: 14px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-secondary, #9ca3af);
      margin-top: 0;
      user-select: none;
      align-self: center;
      padding-bottom: 20px;
    }

    /* ── SINGLE DRUM TRACK ── */
    .tp-track {
      position: relative;
      flex: 1;
      height: 220px;
      overflow: hidden;
      border-radius: 0.5rem;
    }

    /* Scrollable drum list */
    .tp-scroll {
      height: 220px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-type: y mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      outline: none;
      padding-top: 88px;
      padding-bottom: 88px;
    }
    .tp-scroll:focus-visible {
      box-shadow: inset 0 0 0 2px rgba(157,36,73,0.4);
    }
    .tp-scroll::-webkit-scrollbar { display: none; }

    /* Drum item */
    .tp-item {
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.0625rem;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      scroll-snap-align: center;
      user-select: none;
      transition: color 0.1s ease, font-weight 0.1s ease;
    }
    .tp-item:hover:not(.tp-item--dis):not(.tp-item--sel) {
      color: var(--text-primary, #374151);
    }
    /* Selected item */
    .tp-item--sel {
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--institucional-primario, #9D2449);
    }
    /* Disabled (out of min/max range) */
    .tp-item--dis {
      opacity: 0.25;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* Depth fade overlay */
    .tp-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      background: linear-gradient(
        to bottom,
        var(--bg-primary, #fff)  0%,
        transparent              32%,
        transparent              68%,
        var(--bg-primary, #fff) 100%
      );
    }

    /* Centre selection bar */
    .tp-bar {
      position: absolute;
      left: 6px;
      right: 6px;
      top: calc(50% - 22px);
      height: 44px;
      pointer-events: none;
      z-index: 3;
      border-top: 1.5px solid var(--institucional-primario, #9D2449);
      border-bottom: 1.5px solid var(--institucional-primario, #9D2449);
      border-radius: 0.25rem;
      background: rgba(157,36,73,0.04);
    }

    /* Column label (HH / MM / SS) */
    .tp-col-lbl {
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.5625rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-tertiary, #9ca3af);
      text-transform: uppercase;
      pointer-events: none;
      z-index: 4;
    }

    /* ── FOOTER ── */
    .tp-ftr {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem 0.625rem;
      border-top: 1px solid var(--border-color, #f3f4f6);
      background: var(--bg-secondary, #f9fafb);
    }
    .tp-btn-cancel {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--text-secondary, #6b7280);
      transition: background 0.15s ease;
    }
    .tp-btn-cancel:hover { background: var(--bg-tertiary, #f3f4f6); }
    .tp-btn-ok {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.375rem 0.875rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      color: #fff;
      background: var(--border-color, #d1d5db);
      transition: background 0.15s ease, filter 0.15s ease;
    }
    .tp-btn-ok--on { background: var(--institucional-primario, #9D2449); }
    .tp-btn-ok--on:hover { filter: brightness(1.08); }
    .tp-btn-ok:disabled { cursor: not-allowed; }

    /* ── BACKDROP ── */
    .tp-backdrop { position: fixed; inset: 0; z-index: 9998; }

    /* ── VALIDATION / HELPER ── */
    .tp-error {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #ef4444;
      animation: tp-fadein 0.2s ease;
    }
    .tp-helper {
      margin: 0;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-tertiary, #6b7280);
    }
    @keyframes tp-fadein {
      from { opacity: 0; transform: translateY(-3px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── DARK MODE ── */
    :host-context([data-theme="dark"]) .tp-overlay {
      background: linear-gradient(
        to bottom,
        var(--bg-primary) 0%,
        transparent       32%,
        transparent       68%,
        var(--bg-primary) 100%
      );
    }
    :host-context([data-theme="dark"]) .tp-float-label {
      background: var(--bg-primary);
    }
  `]
})
export class TimePickerComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnDestroy {

  // ── Inputs ──────────────────────────────────────────────────────────────────

  @Input() label = '';
  @Input() controlName = '';
  @Input() control?: FormControl;
  @Input() floating = false;
  @Input() required = false;
  @Input() optional = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() placeholder = 'Seleccionar hora';
  @Input() minuteStep = 1;
  @Input() showSeconds = false;
  @Input() minTime?: string;
  @Input() maxTime?: string;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() helperText = '';
  @Input() fullWidth = false;

  // ── Output ───────────────────────────────────────────────────────────────────

  @Output() timeChange = new EventEmitter<string>();

  // ── ViewChildren ─────────────────────────────────────────────────────────────

  @ViewChild('inputContainer', { static: false }) inputContainerRef!: ElementRef<HTMLElement>;
  @ViewChild('dropdownPanel',  { static: false }) dropdownPanelRef!: ElementRef<HTMLElement>;
  @ViewChild('hoursScroll',    { static: false }) hoursScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('minutesScroll',  { static: false }) minutesScrollRef!: ElementRef<HTMLElement>;
  @ViewChild('secondsScroll',  { static: false }) secondsScrollRef!: ElementRef<HTMLElement>;

  // ── State ────────────────────────────────────────────────────────────────────

  controlId = '';
  showDropdown = false;
  dropdownPosition: 'bottom' | 'top' = 'bottom';
  dropdownTopPx = 0;
  dropdownLeftPx = 0;
  selectedTime: string | null = null;
  pendingHour: number | null = null;
  pendingMinute: number | null = null;
  pendingSecond: number | null = null;
  isFocused = false;
  inputDisplayValue = '';
  hours: number[] = [];
  minutes: number[] = [];
  seconds: number[] = [];

  // ── Private ──────────────────────────────────────────────────────────────────

  private _value: string | null = null;
  private _focusSnapshot: string | null = null;
  private _onChange: (v: string | null) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = false;
  private _controlSub?: Subscription;
  private _userInteracted = false;
  private _scrollCleanups: Array<() => void> = [];
  private _min: TimeParts | null = null;
  private _max: TimeParts | null = null;

  constructor(
    @Optional() private controlContainer: ControlContainer,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.controlId = this.controlName || `tp-${Math.random().toString(36).slice(2, 8)}`;
    this.buildArrays();
    this._min = this.parseTimeParts(this.minTime);
    this._max = this.parseTimeParts(this.maxTime);
  }

  ngAfterViewInit(): void {
    this.connectFormControl();
  }

  ngOnDestroy(): void {
    this._controlSub?.unsubscribe();
    this.detachScrollListeners();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onResize(): void {
    if (this.showDropdown) { this.calcPosition(); this.cdr.markForCheck(); }
  }

  // ── Arrays ───────────────────────────────────────────────────────────────────

  private buildArrays(): void {
    this.hours   = Array.from({ length: 24 }, (_, i) => i);
    const step   = Math.max(1, Math.min(30, this.minuteStep));
    this.minutes = [];
    for (let m = 0; m < 60; m += step) this.minutes.push(m);
    this.seconds = Array.from({ length: 60 }, (_, i) => i);
  }

  // ── Form control wiring ───────────────────────────────────────────────────────

  private connectFormControl(): void {
    if (this._controlSub) return;
    if (this.control) {
      this.bindFormControl(this.control);
      return;
    }
    if (!this.controlName) return;
    const parent = this.controlContainer?.control as import('@angular/forms').FormGroup | undefined;
    if (!parent?.get) return;
    const ctrl = parent.get(this.controlName) as FormControl;
    if (!ctrl) return;
    this.bindFormControl(ctrl);
  }

  private bindFormControl(ctrl: FormControl): void {
    this.control = ctrl;
    if (ctrl.value) this.parseValue(ctrl.value);
    this._controlSub = ctrl.valueChanges.subscribe(v => {
      this.parseValue(v);
      this.cdr.markForCheck();
    });
    this.cdr.markForCheck();
  }

  // ── Value parsing ─────────────────────────────────────────────────────────────

  private parseValue(val: unknown): void {
    if (!val || typeof val !== 'string') {
      this.selectedTime = null; this._value = null; this.inputDisplayValue = ''; return;
    }
    const full  = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(val);
    const short = /^(\d{1,2}):(\d{2})$/.exec(val);
    const match = full ?? short;
    if (!match) { this.selectedTime = null; this._value = null; this.inputDisplayValue = ''; return; }
    const h = +match[1], m = +match[2], s = full ? +match[3] : 0;
    if (h > 23 || m > 59 || s > 59) { this.selectedTime = null; this._value = null; this.inputDisplayValue = ''; return; }
    this.selectedTime      = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
    this._value            = this.selectedTime;
    this.inputDisplayValue = this.showSeconds ? this.selectedTime : `${this.pad(h)}:${this.pad(m)}`;
  }

  pad(n: number): string { return n.toString().padStart(2, '0'); }

  private parseTimeParts(t?: string): TimeParts | null {
    if (!t) return null;
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
    if (!m) return null;
    return { h: +m[1], m: +m[2], s: m[3] != null ? +m[3] : 0 };
  }

  // ── Disability helpers ────────────────────────────────────────────────────────

  isHourDisabled(h: number): boolean {
    if (this._min && h < this._min.h) return true;
    if (this._max && h > this._max.h) return true;
    return false;
  }

  isMinuteDisabled(m: number): boolean {
    const h = this.pendingHour ?? 0;
    if (this._min && h === this._min.h && m < this._min.m) return true;
    if (this._max && h === this._max.h && m > this._max.m) return true;
    return false;
  }

  isSecondDisabled(s: number): boolean {
    const h = this.pendingHour ?? 0, m = this.pendingMinute ?? 0;
    if (this._min && h === this._min.h && m === this._min.m && s < this._min.s) return true;
    if (this._max && h === this._max.h && m === this._max.m && s > this._max.s) return true;
    return false;
  }

  // ── Text input ────────────────────────────────────────────────────────────────

  onInputType(event: Event): void {
    const el     = event.target as HTMLInputElement;
    const digits = el.value.replace(/[^\d]/g, '').slice(0, this.showSeconds ? 6 : 4);
    const parts: string[] = [];
    const push = (raw: string, max: number) => {
      if (!raw) return;
      parts.push(raw.length === 2 ? this.pad(Math.min(+raw, max)) : raw);
    };
    push(digits.slice(0, 2), 23);
    if (digits.length > 2) push(digits.slice(2, 4), 59);
    if (this.showSeconds && digits.length > 4) push(digits.slice(4, 6), 59);
    const formatted = parts.join(':');
    if (formatted !== el.value) {
      el.value = formatted;
      try { el.setSelectionRange(formatted.length, formatted.length); } catch (_) {}
    }
    this.inputDisplayValue = formatted;
  }

  onInputKeydown(event: KeyboardEvent): void {
    const pass = ['Backspace','Delete','Tab','Enter','Escape',
                  'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',':'];
    if (pass.includes(event.key)) return;
    if (/^\d$/.test(event.key)) return;
    if ((event.ctrlKey || event.metaKey) && 'acvx'.includes(event.key.toLowerCase())) return;
    event.preventDefault();
  }

  onInputBlur(): void {
    this.isFocused = false;
    this._onTouched();
    this._userInteracted = true;
    const typed = this.inputDisplayValue.trim();

    // Si el usuario no escribió nada (dejó vacío sin cambiar), restaurar el valor anterior
    if (!typed && this._focusSnapshot) {
      this.inputDisplayValue = this._focusSnapshot;
      this._focusSnapshot = null;
      this.cdr.markForCheck();
      return;
    }

    this._focusSnapshot = null;

    if (!typed) { this.applyValue(null); return; }
    const parsed = this.tryParseTyped(typed);
    if (parsed) {
      this.applyValue(parsed);
    } else {
      this.inputDisplayValue = this.selectedTime
        ? (this.showSeconds ? this.selectedTime : this.selectedTime.slice(0, 5))
        : '';
      this.cdr.markForCheck();
    }
  }

  onInputEnter(event: Event): void {
    event.preventDefault();
    const parsed = this.tryParseTyped(this.inputDisplayValue.trim());
    if (parsed) { this.applyValue(parsed); if (this.showDropdown) this.closeDropdown(); }
  }

  private tryParseTyped(text: string): string | null {
    const full  = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(text);
    const short = /^(\d{1,2}):(\d{1,2})$/.exec(text);
    if (full)  { const h=+full[1],m=+full[2],s=+full[3];  if(h<=23&&m<=59&&s<=59) return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`; }
    if (short) { const h=+short[1],m=+short[2]; if(h<=23&&m<=59) return `${this.pad(h)}:${this.pad(m)}:00`; }
    return null;
  }

  private applyValue(val: string | null): void {
    this.selectedTime      = val;
    this._value            = val;
    this.inputDisplayValue = val ? (this.showSeconds ? val : val.slice(0, 5)) : '';
    this._onChange(val);
    if (this.control) {
      this.control.setValue(val, { emitEvent: false });
      this.control.markAsDirty();
      this.control.markAsTouched();
    }
    this.timeChange.emit(val ?? '');
    this.cdr.markForCheck();
  }

  // ── Derived state ─────────────────────────────────────────────────────────────

  get pendingDisplay(): string {
    if (this.pendingHour == null || this.pendingMinute == null) return 'Seleccionar hora';
    const t = `${this.pad(this.pendingHour)}:${this.pad(this.pendingMinute)}`;
    return this.showSeconds ? `${t}:${this.pad(this.pendingSecond ?? 0)}` : t;
  }

  get labelShifted(): boolean {
    return !!(this.inputDisplayValue || this.isFocused || this.showDropdown);
  }

  get invalidTouched(): boolean {
    return !!(this.control?.invalid && this.control.touched && this._userInteracted);
  }

  get isDisabled(): boolean { return this.disabled || this._disabled; }

  get canConfirm(): boolean {
    if (this.pendingHour == null || this.pendingMinute == null) return false;
    if (this.showSeconds && this.pendingSecond == null) return false;
    return true;
  }

  get wrapperClass(): string { return this.fullWidth ? 'w-full' : ''; }

  get inputSizeClass(): string { return `tp-input--${this.size}`; }

  // ── Focus / dropdown ──────────────────────────────────────────────────────────

  onFocus(): void {
    this.isFocused = true;
    this._userInteracted = true;
    // Guarda el valor actual y limpia el input para que el usuario escriba directamente
    if (this.inputDisplayValue && !this.isDisabled && !this.readonly) {
      this._focusSnapshot = this.inputDisplayValue;
      this.inputDisplayValue = '';
      this.cdr.markForCheck();
    } else {
      this._focusSnapshot = this.inputDisplayValue || null;
    }
    if (!this.showDropdown && !this.isDisabled && !this.readonly) this.openDropdown();
  }

  toggleDropdown(): void {
    if (this.isDisabled || this.readonly) return;
    this.showDropdown ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown(): void {
    this.calcPosition();
    this._userInteracted = true;
    this._onTouched();

    if (this.selectedTime) {
      const [h, m, s] = this.selectedTime.split(':').map(Number);
      this.pendingHour   = h;
      this.pendingMinute = m;
      this.pendingSecond = this.showSeconds ? s : null;
    } else {
      this.pendingHour = this.pendingMinute = this.pendingSecond = null;
    }

    this.showDropdown = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.scrollAllToSelected('instant');
      this.attachScrollListeners();
    }, 0);
  }

  closeDropdown(): void {
    this.detachScrollListeners();
    this.showDropdown = false;
    this.cdr.markForCheck();
  }

  private calcPosition(): void {
    if (!this.inputContainerRef) return;
    const rect   = this.inputContainerRef.nativeElement.getBoundingClientRect();
    const below  = window.innerHeight - rect.bottom;
    const above  = rect.top;
    const dropH  = 340;
    this.dropdownPosition = (above > below && below < dropH) ? 'top' : 'bottom';
    this.dropdownLeftPx   = rect.left;
    this.dropdownTopPx    = this.dropdownPosition === 'bottom'
      ? rect.bottom + 4
      : rect.top - dropH - 4;
  }

  // ── Loop arrays (tripled for infinite-scroll effect) ─────────────────────────

  get hoursLoop():   number[] { return [...this.hours,   ...this.hours,   ...this.hours];   }
  get minutesLoop(): number[] { return [...this.minutes, ...this.minutes, ...this.minutes]; }
  get secondsLoop(): number[] { return [...this.seconds, ...this.seconds, ...this.seconds]; }

  // ── Drum mechanics ────────────────────────────────────────────────────────────

  /**
   * Scroll every open column to its pending value, placing it in the
   * **middle copy** of the tripled array so there are items above and below.
   */
  private scrollAllToSelected(behavior: ScrollBehavior = 'smooth'): void {
    const hIdx = this.pendingHour   != null ? this.hours.indexOf(this.pendingHour)   : 0;
    const mIdx = this.pendingMinute != null ? this.minutes.indexOf(this.pendingMinute) : 0;
    const sIdx = this.pendingSecond ?? 0;
    // Middle-copy offset = arr.length * ITEM_H
    this.scrollColToLoopIdx(this.hoursScrollRef?.nativeElement,   this.hours.length   + hIdx, behavior);
    this.scrollColToLoopIdx(this.minutesScrollRef?.nativeElement, this.minutes.length + mIdx, behavior);
    if (this.showSeconds) {
      this.scrollColToLoopIdx(this.secondsScrollRef?.nativeElement, this.seconds.length + sIdx, behavior);
    }
  }

  /** Scroll a column element to a specific loop-array index. */
  private scrollColToLoopIdx(el: HTMLElement | undefined, loopIdx: number, behavior: ScrollBehavior): void {
    if (!el || loopIdx < 0) return;
    el.scrollTo({ top: loopIdx * ITEM_H, behavior });
  }

  /** Click on a drum item: always snap to the equivalent item in the middle copy. */
  onWheelItemClick(col: WheelCol, loopIdx: number): void {
    const arr     = col === 'hours' ? this.hours : col === 'minutes' ? this.minutes : this.seconds;
    const realIdx = loopIdx % arr.length;
    // Target the middle copy so there are always items above and below
    const targetLoopIdx = arr.length + realIdx;
    const el = this.scrollElFor(col);
    if (el) el.scrollTo({ top: targetLoopIdx * ITEM_H, behavior: 'smooth' });
    this.setPending(col, realIdx);
    this.cdr.markForCheck();
  }

  onWheelKeydown(event: KeyboardEvent, col: WheelCol): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const el  = this.scrollElFor(col);
    if (!el) return;
    el.scrollBy({ top: event.key === 'ArrowDown' ? ITEM_H : -ITEM_H, behavior: 'smooth' });
  }

  private attachScrollListeners(): void {
    this.detachScrollListeners();
    const cols: Array<{ el: HTMLElement | null; col: WheelCol }> = [
      { el: this.hoursScrollRef?.nativeElement   ?? null, col: 'hours'   },
      { el: this.minutesScrollRef?.nativeElement ?? null, col: 'minutes' },
      ...(this.showSeconds
        ? [{ el: this.secondsScrollRef?.nativeElement ?? null, col: 'seconds' as WheelCol }]
        : [])
    ];
    for (const { el, col } of cols) {
      if (!el) continue;
      let timer: ReturnType<typeof setTimeout>;
      const handler = () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.zone.run(() => this.onScrollEnd(col, el!)), 80);
      };
      this.zone.runOutsideAngular(() => el!.addEventListener('scroll', handler, { passive: true }));
      this._scrollCleanups.push(() => { el!.removeEventListener('scroll', handler); clearTimeout(timer); });
    }
  }

  private detachScrollListeners(): void {
    this._scrollCleanups.forEach(fn => fn());
    this._scrollCleanups = [];
  }

  private onScrollEnd(col: WheelCol, el: HTMLElement): void {
    const arr       = col === 'hours' ? this.hours : col === 'minutes' ? this.minutes : this.seconds;
    const totalLen  = arr.length * 3;
    const rawIdx    = Math.max(0, Math.min(Math.round(el.scrollTop / ITEM_H), totalLen - 1));
    const realIdx   = rawIdx % arr.length;

    // Snap to nearest grid line if mid-frame
    if (el.scrollTop !== rawIdx * ITEM_H) {
      el.scrollTo({ top: rawIdx * ITEM_H, behavior: 'smooth' });
    }

    this.setPending(col, realIdx);
    this.cdr.markForCheck();

    // If we drifted into the first or last copy, silently teleport to the
    // equivalent position in the middle copy so the drum stays infinite.
    if (rawIdx < arr.length || rawIdx >= arr.length * 2) {
      const middleIdx = arr.length + realIdx;
      // Use requestAnimationFrame so the smooth snap above finishes first
      requestAnimationFrame(() => {
        el.scrollTo({ top: middleIdx * ITEM_H, behavior: 'instant' });
      });
    }
  }

  private setPending(col: WheelCol, idx: number): void {
    if (col === 'hours')   this.pendingHour   = this.hours[idx]   ?? null;
    if (col === 'minutes') this.pendingMinute = this.minutes[idx] ?? null;
    if (col === 'seconds') this.pendingSecond = this.seconds[idx] ?? null;
  }

  private scrollElFor(col: WheelCol): HTMLElement | undefined {
    if (col === 'hours')   return this.hoursScrollRef?.nativeElement;
    if (col === 'minutes') return this.minutesScrollRef?.nativeElement;
    return this.secondsScrollRef?.nativeElement;
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  setNow(): void {
    const now  = new Date();
    const step = Math.max(1, this.minuteStep);
    const snapped = this.minutes.reduce(
      (best, m) => Math.abs(m - now.getMinutes()) < Math.abs(best - now.getMinutes()) ? m : best,
      this.minutes[0]
    );
    this.pendingHour   = now.getHours();
    this.pendingMinute = snapped;
    this.pendingSecond = this.showSeconds ? now.getSeconds() : null;
    this.cdr.markForCheck();
    setTimeout(() => this.scrollAllToSelected('smooth'), 0);
  }

  confirmSelection(): void {
    if (!this.canConfirm) return;
    const val = `${this.pad(this.pendingHour!)}:${this.pad(this.pendingMinute!)}:${this.pad(this.pendingSecond ?? 0)}`;
    this.applyValue(val);
    this.closeDropdown();
  }

  // ── ControlValueAccessor ──────────────────────────────────────────────────────

  writeValue(value: unknown): void {
    this.parseValue(value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string | null) => void): void { this._onChange = fn; }

  registerOnTouched(fn: () => void): void { this._onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
    this.cdr.markForCheck();
  }
}

