import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';

@Component({
  selector: 'app-async-state-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EmptyStateComponent, SkeletonLoaderComponent, InstitutionalButtonComponent],
  styles: [`
    :host { display: block; }
    .asw-error {
      border: 1px solid #fecaca;
      background: #fff1f2;
      color: #9f1239;
      border-radius: var(--radius-lg);
      padding: var(--space-16);
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
      align-items: flex-start;
    }
    .asw-error-title { font-weight: 700; font-size: var(--font-size-sm); }
    .asw-error-msg { font-size: var(--font-size-sm); color: #9f1239; }
  `],
  template: `
    <ng-container *ngIf="loading">
      <app-skeleton-loader [config]="{ variant: skeletonVariant, tableRows: 5, rows: 3 }"></app-skeleton-loader>
    </ng-container>

    <ng-container *ngIf="!loading && hasError">
      <div class="asw-error">
        <div class="asw-error-title">{{ errorTitle }}</div>
        <div class="asw-error-msg">{{ errorMessage }}</div>
        <app-institutional-button
          *ngIf="retryable"
          [config]="{ variant: 'danger', size: 'sm', icon: 'refresh', iconPosition: 'left' }"
          (clicked)="retry.emit()">
          Reintentar
        </app-institutional-button>
      </div>
    </ng-container>

    <ng-container *ngIf="!loading && !hasError && empty">
      <app-empty-state
        [icon]="emptyIcon"
        [title]="emptyTitle"
        [subtitle]="emptySubtitle"
        [config]="{ card: true, size: 'lg' }">
      </app-empty-state>
    </ng-container>

    <ng-container *ngIf="!loading && !hasError && !empty">
      <ng-content></ng-content>
    </ng-container>
  `
})
export class AsyncStateWrapperComponent {
  @Input() loading = false;
  @Input() hasError = false;
  @Input() errorTitle = 'No se pudo cargar la informacion';
  @Input() errorMessage = 'Intenta de nuevo en unos segundos.';
  @Input() retryable = true;

  @Input() empty = false;
  @Input() emptyIcon = 'inbox';
  @Input() emptyTitle = 'Sin resultados';
  @Input() emptySubtitle = 'No hay elementos para mostrar.';

  @Input() skeletonVariant: 'text' | 'card' | 'table' = 'card';

  @Output() retry = new EventEmitter<void>();
}
