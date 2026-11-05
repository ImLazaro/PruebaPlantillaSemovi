import {
  Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type RelativeTimeFormat = 'auto' | 'long' | 'short' | 'narrow';

export interface RelativeTimeConfig {
  /** Locale. Default: 'es-MX' */
  locale?: string;
  /** Estilo de formato. Default: 'auto' (usa long para >1h, short para menos) */
  format?: RelativeTimeFormat;
  /** Intervalo de actualización en ms. Default: 30000 (30s). 0 = no actualizar */
  updateInterval?: number;
  /** Muestra el tooltip con la fecha/hora absoluta. Default: true */
  showTooltip?: boolean;
  /** Formato de la fecha en el tooltip (Intl.DateTimeFormat options). Default: fecha + hora completa */
  tooltipFormat?: Intl.DateTimeFormatOptions;
  /** Clase CSS adicional. */
  customClass?: string;
  /** Si la fecha está en el futuro, muestra "en X tiempo". Default: true */
  allowFuture?: boolean;
}

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year',   ms: 31536000000 },
  { unit: 'month',  ms: 2592000000  },
  { unit: 'week',   ms: 604800000   },
  { unit: 'day',    ms: 86400000    },
  { unit: 'hour',   ms: 3600000     },
  { unit: 'minute', ms: 60000       },
  { unit: 'second', ms: 1000        },
];

/**
 * RelativeTimeComponent
 *
 * Muestra una fecha como texto relativo ("hace 2 minutos", "en 3 días")
 * usando `Intl.RelativeTimeFormat` con auto-actualización.
 *
 * @example Last login:
 * ```html
 * <app-relative-time [date]="user.lastLoginAt" />
 * <!-- "hace 5 minutos" -->
 * ```
 *
 * @example Expiración futura:
 * ```html
 * <app-relative-time [date]="token.expiresAt" />
 * <!-- "en 2 horas" -->
 * ```
 *
 * @example Bloqueo de cuenta:
 * ```html
 * <app-relative-time
 *   [date]="user.lockedUntil"
 *   [config]="{ format: 'long', updateInterval: 60000 }" />
 * ```
 */
@Component({
  selector: 'app-relative-time',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: inline; }

    .rt-root {
      font-family: 'Montserrat', sans-serif;
      font-size: inherit;
      color: inherit;
      cursor: default;
    }
    .rt-root[title] { cursor: help; text-decoration: underline dotted; text-underline-offset: 2px; }
  `],
  template: `
    <time class="rt-root"
      [class]="cfg.customClass ?? ''"
      [attr.datetime]="isoString"
      [attr.title]="cfg.showTooltip !== false ? absoluteLabel : null">
      {{ relativeLabel }}
    </time>
  `
})
export class RelativeTimeComponent implements OnInit, OnChanges, OnDestroy {
  /** Fecha a mostrar. Acepta Date, ISO string o timestamp numérico. */
  @Input() date!: Date | string | number;
  /** Configuración. */
  @Input() config: RelativeTimeConfig = {};

  relativeLabel = '';
  absoluteLabel = '';
  isoString     = '';

  private intervalId?: ReturnType<typeof setInterval>;

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): RelativeTimeConfig { return this.config; }

  private get dateObj(): Date {
    if (this.date instanceof Date) return this.date;
    return new Date(this.date);
  }

  ngOnInit(): void {
    this.update();
    const ms = this.cfg.updateInterval ?? 30000;
    if (ms > 0) {
      this.intervalId = setInterval(() => {
        this.update();
        this.cdr.markForCheck();
      }, ms);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date'] || changes['config']) {
      this.update();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  private update(): void {
    const d = this.dateObj;
    if (isNaN(d.getTime())) {
      this.relativeLabel = '–';
      this.absoluteLabel = '';
      this.isoString     = '';
      return;
    }

    const locale = this.cfg.locale ?? 'es-MX';
    const style  = this.cfg.format === 'auto' || !this.cfg.format ? 'long' : this.cfg.format;

    this.isoString     = d.toISOString();
    this.relativeLabel = this.buildRelative(d, locale, style as Intl.RelativeTimeFormatStyle);
    this.absoluteLabel = new Intl.DateTimeFormat(locale, this.cfg.tooltipFormat ?? {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(d);
  }

  private buildRelative(d: Date, locale: string, style: Intl.RelativeTimeFormatStyle): string {
    const now    = Date.now();
    const diff   = d.getTime() - now; // positive = futuro, negative = pasado
    const absDiff = Math.abs(diff);

    if (absDiff < 45000) return 'justo ahora';

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style });

    for (const { unit, ms } of UNITS) {
      if (absDiff >= ms) {
        const value = Math.round(diff / ms);
        return rtf.format(value, unit);
      }
    }

    return rtf.format(Math.round(diff / 1000), 'second');
  }
}
