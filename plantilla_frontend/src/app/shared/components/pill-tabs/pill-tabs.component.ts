import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface PillTab {
  id: string;
  label: string;
  disabled?: boolean;
  /** Texto de ayuda (p. ej. "Próximamente" en pestañas deshabilitadas). */
  hint?: string;
}

/**
 * Navegación horizontal en forma de píldoras.
 * Componente genérico: emite el id seleccionado y no navega por sí mismo.
 */
@Component({
  selector: 'app-pill-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bg-white rounded-xl shadow-sm border border-gray-100 p-2" [attr.aria-label]="ariaLabel()">
      <ul class="flex flex-wrap gap-2">
        @for (tab of tabs(); track tab.id) {
          <li>
            <button
              type="button"
              class="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional-guinda disabled:opacity-50 disabled:cursor-not-allowed"
              [class]="tab.id === activeId()
                ? 'bg-institucional-guinda text-white border-institucional-guinda'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
              [attr.aria-current]="tab.id === activeId() ? 'page' : null"
              [disabled]="tab.disabled"
              [title]="tab.hint ?? tab.label"
              (click)="tabChange.emit(tab.id)">
              {{ tab.label }}
            </button>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class PillTabsComponent {
  readonly tabs = input<PillTab[]>([]);
  readonly activeId = input('');
  readonly ariaLabel = input('Secciones');
  readonly tabChange = output<string>();
}
