import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar.component';

/**
 * Encabezado de tablero: título del sistema, subtítulo y tarjeta del usuario.
 * Componente genérico: recibe los textos ya resueltos.
 */
@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <header class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-xs text-gray-500">{{ subtitle() }}</p>
        }
      </div>
      @if (userName()) {
        <div class="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
          <app-avatar [name]="userName()" [config]="{ size: 'sm', variant: 'primary' }"></app-avatar>
          <div class="leading-tight">
            <p class="text-sm font-semibold text-gray-900">{{ userTitle() || userName() }}</p>
            @if (userTitle()) {
              <p class="text-xs text-gray-500">{{ userName() }}</p>
            }
          </div>
        </div>
      }
    </header>
  `,
})
export class DashboardHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly userName = input('');
  /** Línea principal de la tarjeta de usuario (p. ej. área). */
  readonly userTitle = input('');
}
