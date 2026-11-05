import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef,
  OnDestroy, OnChanges, SimpleChanges, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSize, UiVariant } from '../_ui-types';

export type CountdownFormat = 'hh:mm:ss' | 'mm:ss' | 'ss';
export type CountdownState  = 'idle' | 'running' | 'paused' | 'finished';

export interface CountdownConfig {
  /** Duración en segundos. */
  seconds: number;
  /** Formato de visualización. Default: 'mm:ss' */
  format?: CountdownFormat;
  /** Tamaño del display. Default: 'md' */
  size?: UiSize;
  /** Color de acento. Default: 'primary' */
  variant?: UiVariant;
  /** Muestra barra de progreso circular. Default: true */
  showProgress?: boolean;
  /** Muestra controles de inicio/pausa/reinicio. Default: false */
  showControls?: boolean;
  /** Inicia automáticamente al inicializar. Default: false */
  autoStart?: boolean;
  /** Segundos en los que se activa la advertencia visual (rojo). Default: 30 */
  warningThreshold?: number;
  /** Mensaje al finalizar. */
  finishedMessage?: string;
  /** Etiqueta bajo el contador. */
  label?: string;
}

const VARIANT_COLOR: Record<UiVariant, string> = {
  primary:   'var(--institucional-primario)',
  secondary: 'var(--institucional-secundario)',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  ghost:     '#6b7280',
};

/**
 * CountdownTimerComponent
 *
 * Contador regresivo con display SVG circular, controles opcionales
 * y umbral de advertencia visual.
 *
 * @example OTP básico (auto-start, sin controles):
 * ```html
 * <app-countdown-timer
 *   [config]="{ seconds: 300, autoStart: true, label: 'Código expira en' }"
 *   (finished)="onOtpExpired()" />
 * ```
 *
 * @example Con controles:
 * ```html
 * <app-countdown-timer
 *   [config]="{ seconds: 600, showControls: true, showProgress: true }"
 *   (tick)="onTick($event)" />
 * ```
 */
@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: inline-block; }

    .cdt-root {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
      font-family: 'Montserrat', sans-serif;
    }

    /* ── SVG progress ring ── */
    .cdt-ring-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cdt-ring-svg { transform: rotate(-90deg); }
    .cdt-ring-track { fill: none; }
    .cdt-ring-progress {
      fill: none;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.95s linear, stroke 0.3s ease;
    }

    .cdt-display {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
    }
    .cdt-time {
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #111827;
      transition: color 0.3s ease;
    }
    .cdt-time.warning { color: #ef4444; }
    .cdt-time.finished { color: #9ca3af; }

    /* Sizes */
    .cdt-sm  .cdt-time { font-size: 1rem; }
    .cdt-md  .cdt-time { font-size: 1.4rem; }
    .cdt-lg  .cdt-time { font-size: 2rem; }

    /* ── Flat (no ring) display ── */
    .cdt-flat {
      display: inline-flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-8) var(--space-16);
      border-radius: var(--radius-pill);
      background: #f3f4f6;
      border: 2px solid #e5e7eb;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .cdt-flat.running { border-color: var(--accent, var(--institucional-primario)); }
    .cdt-flat.warning { border-color: #ef4444; background: #fef2f2; }
    .cdt-flat.finished { background: #f3f4f6; border-color: #e5e7eb; }
    .cdt-flat .cdt-time { position: static; }

    /* ── State dot ── */
    .cdt-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: #9ca3af;
      transition: background 0.3s ease;
    }
    .cdt-dot.running { background: #10b981; animation: cdt-pulse 1.2s ease-in-out infinite; }
    .cdt-dot.warning { background: #ef4444; animation: cdt-pulse 0.6s ease-in-out infinite; }
    @keyframes cdt-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    /* ── Label ── */
    .cdt-label {
      font-size: var(--font-size-xs);
      color: #9ca3af;
      font-weight: 500;
      text-align: center;
    }

    /* ── Controls ── */
    .cdt-controls {
      display: flex;
      align-items: center;
      gap: var(--space-8);
    }
    .cdt-ctrl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      background: #f3f4f6;
      color: #374151;
      transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
    }
    .cdt-ctrl-btn:hover:not(:disabled) { background: rgba(157,36,73,0.1); color: var(--institucional-primario); }
    .cdt-ctrl-btn:active:not(:disabled) { transform: scale(0.9); }
    .cdt-ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .cdt-ctrl-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(157,36,73,0.25);
    }
    .cdt-ctrl-icon {
      font-size: 1.1rem;
      font-family: 'Material Symbols Outlined';
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  `],
  template: `
    <div class="cdt-root" [class]="'cdt-' + resolvedSize">

      <!-- CON RING SVG -->
      <div *ngIf="cfg.showProgress !== false; else flatDisplay" class="cdt-ring-wrap">
        <svg
          class="cdt-ring-svg"
          [attr.width]="svgSize"
          [attr.height]="svgSize"
          [attr.viewBox]="'0 0 ' + svgSize + ' ' + svgSize"
          aria-hidden="true">
          <!-- Track -->
          <circle
            class="cdt-ring-track"
            [attr.cx]="svgSize / 2"
            [attr.cy]="svgSize / 2"
            [attr.r]="radius"
            stroke="#e5e7eb"
            [attr.stroke-width]="strokeWidth">
          </circle>
          <!-- Progress -->
          <circle
            class="cdt-ring-progress"
            [attr.cx]="svgSize / 2"
            [attr.cy]="svgSize / 2"
            [attr.r]="radius"
            [attr.stroke]="isWarning ? '#ef4444' : accentColor"
            [attr.stroke-width]="strokeWidth"
            [attr.stroke-dasharray]="circumference"
            [attr.stroke-dashoffset]="dashOffset">
          </circle>
        </svg>

        <div class="cdt-display">
          <span class="cdt-time"
            [class.warning]="isWarning"
            [class.finished]="state === 'finished'">
            {{ displayTime }}
          </span>
        </div>
      </div>

      <!-- FLAT (sin ring) -->
      <ng-template #flatDisplay>
        <div class="cdt-flat"
          [class.running]="state === 'running'"
          [class.warning]="isWarning"
          [class.finished]="state === 'finished'">
          <span class="cdt-dot" [class.running]="state === 'running'" [class.warning]="isWarning"></span>
          <span class="cdt-time"
            [class.warning]="isWarning"
            [class.finished]="state === 'finished'">
            {{ displayTime }}
          </span>
        </div>
      </ng-template>

      <!-- Label -->
      <span *ngIf="cfg.label || (state === 'finished' && cfg.finishedMessage)"
        class="cdt-label">
        {{ state === 'finished' && cfg.finishedMessage ? cfg.finishedMessage : cfg.label }}
      </span>

      <!-- Controls -->
      <div *ngIf="cfg.showControls" class="cdt-controls">
        <!-- Play / Pause -->
        <button type="button" class="cdt-ctrl-btn"
          [disabled]="state === 'finished'"
          [attr.aria-label]="state === 'running' ? 'Pausar' : 'Iniciar'"
          (click)="togglePlayPause()">
          <span class="cdt-ctrl-icon">{{ state === 'running' ? 'pause' : 'play_arrow' }}</span>
        </button>
        <!-- Reset -->
        <button type="button" class="cdt-ctrl-btn"
          [attr.aria-label]="'Reiniciar'"
          (click)="reset()">
          <span class="cdt-ctrl-icon">replay</span>
        </button>
      </div>

    </div>
  `
})
export class CountdownTimerComponent implements OnInit, OnChanges, OnDestroy {
  /** Configuración del contador. */
  @Input() config!: CountdownConfig;

  /** Emite cada segundo con los segundos restantes. */
  @Output() tick = new EventEmitter<number>();
  /** Emite cuando el contador llega a 0. */
  @Output() finished = new EventEmitter<void>();
  /** Emite al iniciar. */
  @Output() started = new EventEmitter<void>();
  /** Emite al pausar. */
  @Output() paused = new EventEmitter<void>();
  /** Emite al reiniciar. */
  @Output() reset$ = new EventEmitter<void>();

  state: CountdownState = 'idle';
  remaining = 0;

  private total = 0;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(private cdr: ChangeDetectorRef) {}

  /* ── Getters de configuración ── */
  get cfg(): CountdownConfig {
    return this.config;
  }

  get resolvedSize(): string {
    return this.cfg.size ?? 'md';
  }

  get accentColor(): string {
    return VARIANT_COLOR[this.cfg.variant ?? 'primary'];
  }

  get isWarning(): boolean {
    const threshold = this.cfg.warningThreshold ?? 30;
    return this.state !== 'finished' && this.remaining <= threshold && this.remaining > 0;
  }

  /* ── SVG ring ── */
  get svgSize(): number {
    return this.resolvedSize === 'sm' ? 72 : this.resolvedSize === 'lg' ? 140 : 100;
  }
  get strokeWidth(): number {
    return this.resolvedSize === 'sm' ? 5 : this.resolvedSize === 'lg' ? 9 : 7;
  }
  get radius(): number {
    return (this.svgSize / 2) - (this.strokeWidth / 2);
  }
  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }
  get dashOffset(): number {
    if (this.total === 0) return 0;
    const progress = this.remaining / this.total;
    return this.circumference * (1 - progress);
  }

  /* ── Display time ── */
  get displayTime(): string {
    const s = this.remaining;
    const format = this.cfg.format ?? 'mm:ss';

    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;

    const pad = (n: number): string => String(n).padStart(2, '0');

    if (format === 'hh:mm:ss') return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
    if (format === 'ss') return pad(ss);
    return `${pad(mm)}:${pad(ss)}`;
  }

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.total     = this.cfg.seconds;
    this.remaining = this.cfg.seconds;
    if (this.cfg.autoStart) this.start();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && !changes['config'].firstChange) {
      const prev = changes['config'].previousValue as CountdownConfig;
      if (prev?.seconds !== this.cfg.seconds) {
        this.reset();
      }
    }
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }

  /* ── API pública ── */
  start(): void {
    if (this.state === 'running' || this.remaining === 0) return;
    this.state = 'running';
    this.started.emit();
    this.intervalId = setInterval(() => {
      this.remaining--;
      this.tick.emit(this.remaining);
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.state = 'finished';
        this.clearInterval();
        this.finished.emit();
      }
      this.cdr.markForCheck();
    }, 1000);
    this.cdr.markForCheck();
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.clearInterval();
    this.state = 'paused';
    this.paused.emit();
    this.cdr.markForCheck();
  }

  reset(): void {
    this.clearInterval();
    this.total     = this.cfg.seconds;
    this.remaining = this.cfg.seconds;
    this.state = 'idle';
    this.reset$.emit();
    this.cdr.markForCheck();
    if (this.cfg.autoStart) this.start();
  }

  togglePlayPause(): void {
    this.state === 'running' ? this.pause() : this.start();
  }

  private clearInterval(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
