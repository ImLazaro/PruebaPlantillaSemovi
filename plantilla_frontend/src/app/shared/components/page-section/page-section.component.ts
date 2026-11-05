import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .ps {
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-xl);
      background: #fff;
      overflow: hidden;
    }
    .ps-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-10);
      padding: var(--space-14) var(--space-16);
      border-bottom: 1px solid #f3f4f6;
    }
    .ps-title { font-size: var(--font-size-base); font-weight: 800; color: #111827; }
    .ps-subtitle { margin-top: 4px; font-size: var(--font-size-sm); color: #6b7280; }
    .ps-content { padding: var(--space-16); }
  `],
  template: `
    <section class="ps">
      <header class="ps-head" *ngIf="title || subtitle || showActions">
        <div>
          <div class="ps-title" *ngIf="title">{{ title }}</div>
          <div class="ps-subtitle" *ngIf="subtitle">{{ subtitle }}</div>
        </div>
        <div *ngIf="showActions">
          <ng-content select="[section-actions]"></ng-content>
        </div>
      </header>
      <div class="ps-content">
        <ng-content></ng-content>
      </div>
    </section>
  `
})
export class PageSectionComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showActions = false;
}
