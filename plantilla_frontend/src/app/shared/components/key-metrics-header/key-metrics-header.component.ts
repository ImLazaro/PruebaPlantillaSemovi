import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatGridComponent, StatItem } from '../stat-grid/stat-grid.component';

@Component({
  selector: 'app-key-metrics-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, StatGridComponent],
  template: `
    <app-stat-grid
      [stats]="stats"
      [config]="{ columns: columns, variant: variant, size: size, clickable: clickable }"
      (statClicked)="metricClick.emit($event)">
    </app-stat-grid>
  `
})
export class KeyMetricsHeaderComponent {
  @Input() stats: StatItem[] = [];
  @Input() columns: 2 | 3 | 4 = 4;
  @Input() variant: 'default' | 'gradient' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() clickable = false;

  @Output() metricClick = new EventEmitter<{ stat: StatItem; index: number }>();
}
