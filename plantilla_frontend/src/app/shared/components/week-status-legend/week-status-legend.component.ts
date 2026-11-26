import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WEEK_STATUS_TONE_CLASS, WeekStatusTone } from '../week-status-grid/week-status-grid.component';

export interface WeekStatusLegendItem {
  tone: WeekStatusTone;
  label: string;
  /** Cantidad opcional a mostrar junto a la etiqueta. */
  count?: number;
}

/** Simbología de colores para `app-week-status-grid`. */
@Component({
  selector: 'app-week-status-legend',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-700" aria-label="Simbología de semanas">
      @for (item of items(); track item.label) {
        <li class="flex items-center gap-2">
          <span class="inline-block w-3.5 h-3.5 rounded border" [class]="toneClass[item.tone]" aria-hidden="true"></span>
          <span>{{ item.label }}@if (item.count !== undefined) { <strong class="ml-1">({{ item.count }})</strong> }</span>
        </li>
      }
    </ul>
  `,
})
export class WeekStatusLegendComponent {
  readonly items = input<WeekStatusLegendItem[]>([]);

  protected readonly toneClass = WEEK_STATUS_TONE_CLASS;
}
