import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Tono visual de una celda; la feature decide qué significa cada uno. */
export type WeekStatusTone = 'success' | 'primary' | 'danger' | 'warning' | 'neutral';

export interface WeekStatusCell {
  week: number;
  tone: WeekStatusTone;
  /** Texto accesible y de ayuda (p. ej. "Semana 39 · Vencida"). */
  description: string;
  /** Si es `true`, la celda no es seleccionable. */
  disabled?: boolean;
}

/** Clases Tailwind por tono (compartidas con la leyenda). */
export const WEEK_STATUS_TONE_CLASS: Record<WeekStatusTone, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  primary: 'bg-institucional-guinda text-white border-institucional-guinda',
  danger: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  neutral: 'bg-gray-50 text-gray-400 border-gray-200',
};

/**
 * Cuadrícula de semanas del año coloreadas por estatus.
 * Componente genérico: recibe celdas ya resueltas y emite la semana elegida.
 */
@Component({
  selector: 'app-week-status-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="grid grid-cols-7 sm:grid-cols-13 gap-1.5" [attr.aria-label]="ariaLabel()">
      @for (cell of cells(); track cell.week) {
        <li>
          <button
            type="button"
            class="w-full aspect-square rounded-md border text-xs font-semibold transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-institucional-guinda enabled:hover:scale-105 disabled:cursor-default"
            [class]="toneClass[cell.tone]"
            [class.ring-2]="cell.week === highlightWeek()"
            [class.ring-institucional-guinda]="cell.week === highlightWeek()"
            [disabled]="cell.disabled"
            [title]="cell.description"
            [attr.aria-label]="cell.description"
            [attr.aria-current]="cell.week === highlightWeek() ? 'date' : null"
            (click)="weekSelected.emit(cell.week)">
            {{ cell.week }}
          </button>
        </li>
      }
    </ul>
  `,
  styles: [`
    @media (min-width: 640px) {
      .sm\\:grid-cols-13 { grid-template-columns: repeat(13, minmax(0, 1fr)); }
    }
  `],
})
export class WeekStatusGridComponent {
  readonly cells = input<WeekStatusCell[]>([]);
  /** Semana a resaltar (p. ej. la activa). */
  readonly highlightWeek = input<number | null>(null);
  readonly ariaLabel = input('Semanas del año');
  readonly weekSelected = output<number>();

  protected readonly toneClass = WEEK_STATUS_TONE_CLASS;
}
