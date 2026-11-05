import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstitutionalCardComponent } from '../institutional-card/institutional-card.component';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-feature-state',
  standalone: true,
  imports: [CommonModule, InstitutionalCardComponent, InstitutionalButtonComponent, LoadingSpinnerComponent],
  template: `
    <div class="institutional-content">
      @if (state === 'loading') {
        <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true }">
          <app-loading-spinner [title]="title" [message]="message" [fullHeight]="false"></app-loading-spinner>
        </app-institutional-card>
      } @else {
        <app-institutional-card [config]="{ variant: 'standard', size: 'auto', showShadow: true }">
          <div class="py-10 text-center">
            <span class="material-symbols-outlined text-6xl text-gray-300">{{ icon }}</span>
            <h3 class="mt-4 text-lg font-semibold text-gray-900">{{ title }}</h3>
            <p class="mt-2 text-sm text-gray-500">{{ message }}</p>
            @if (actionLabel) {
              <div class="mt-6 flex justify-center">
                <app-institutional-button
                  [config]="{ variant: 'ghost', icon: 'arrow_back', iconPosition: 'left' }"
                  (clicked)="actionClick.emit()">
                  {{ actionLabel }}
                </app-institutional-button>
              </div>
            }
          </div>
        </app-institutional-card>
      }
    </div>
  `
})
export class FeatureStateComponent {
  @Input() state: 'loading' | 'empty' | 'error' = 'loading';
  @Input() title = 'Cargando';
  @Input() message = 'Por favor espere...';
  @Input() icon = 'info';
  @Input() actionLabel?: string;
  @Output() actionClick = new EventEmitter<void>();
}
