import { TemplateRef } from '@angular/core';

// Componentes de inputs
export * from './inputs';

// Componentes de formularios
export * from './forms';

// Componentes de selección de fechas
export * from './date-pickers';

// Componentes de badges
export * from './badge';

// Componentes de cartas institucionales
export * from './institutional-card/institutional-card.component';

// Componentes de tablas institucionales
export * from './tables/institutional-table/institutional-table.component';
export * from './tables/table-pagination/table-pagination.component';
export * from './tables/table-filters/table-filters.component';
export * from './tables/table-bulk-actions/table-bulk-actions.component';
export * from './tables/table-export/table-export.component';

// Otros componentes compartidos
export * from './loading-spinner/loading-spinner.component';
export * from './notification/notification.component';
export * from './page-header/page-header.component';
export * from './sidebar/sidebar.component';
export * from './universal-icon/universal-icon.component';
export * from './universal-metric/universal-metric.component';
export * from './file-upload/file-upload.component';
export * from './alert-card/alert-card.component';
export * from './metric-card/metric-card.component';
export * from './tooltip/tooltip.component';
export * from './tab-menu/tab-menu.component';
export * from './feature-state/feature-state.component';

// Nuevos componentes de UI
export * from './copy-to-clipboard/copy-to-clipboard.component';
export * from './avatar/avatar.component';
export * from './key-value-list/key-value-list.component';
export * from './timeline/timeline.component';
export * from './accordion/accordion.component';
export * from './countdown-timer/countdown-timer.component';
export * from './info-banner/info-banner.component';
export * from './step-indicator/step-indicator.component';
export * from './empty-state/empty-state.component';
export * from './skeleton-loader/skeleton-loader.component';
export * from './code-viewer/code-viewer.component';
export * from './qr-code/qr-code.component';
export * from './relative-time/relative-time.component';
export * from './user-cell/user-cell.component';
export * from './hierarchy-tree/hierarchy-tree.component';
export * from './progress-bar/progress-bar.component';
export * from './color-swatch/color-swatch.component';
export * from './tag-input/tag-input.component';
export * from './json-viewer/json-viewer.component';
export * from './stat-grid/stat-grid.component';
export * from './async-state-wrapper/async-state-wrapper.component';
export * from './data-filters-bar/data-filters-bar.component';
export * from './bulk-actions-toolbar/bulk-actions-toolbar.component';
export * from './confirm-action-button/confirm-action-button.component';
export * from './entity-status-pill/entity-status-pill.component';
export * from './page-section/page-section.component';
export * from './key-metrics-header/key-metrics-header.component';
export * from './form-hint-panel/form-hint-panel.component';
export * from './audit-trail/audit-trail.component';
export * from './diff-viewer/diff-viewer.component';
export * from './permission-matrix-lite/permission-matrix-lite.component';
export * from './data-export-menu/data-export-menu.component';

// Interfaces y tipos para tablas
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  template?: TemplateRef<unknown> | null;
  /** Pin column during horizontal scroll. Use 'left' or 'right' to pin to that side. */
  pin?: 'left' | 'right';
}

export interface TableConfig {
  variant?: 'default' | 'compact' | 'dense' | 'spacious';
  striped?: boolean;
  hoverable?: boolean;
  responsive?: boolean;
  fixedHeader?: boolean;
  stickyHeader?: boolean;
  selectable?: boolean;
  expandable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
}

export interface SortEvent {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

export interface SelectionEvent {
  selectedItems: Record<string, unknown>[];
  allSelected: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'boolean';
  placeholder?: string;
  options?: { value: unknown; label: string }[];
  multiple?: boolean;
  width?: string;
}

export interface FilterValue {
  [key: string]: unknown;
}

export interface PaginationConfig {
  pageSize: number;
  totalItems: number;
  currentPage: number;
  pageSizeOptions?: number[];
  showInfo?: boolean;
  showPageSizeSelector?: boolean;
  maxVisiblePages?: number;
}

export interface PageChangeEvent {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkAction {
  key: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface BulkActionEvent {
  action: string;
  selectedItems: Record<string, unknown>[];
}

export interface ExportFormat {
  key: string;
  label: string;
  icon: string;
  extension: string;
  mimeType: string;
}

export interface ExportConfig {
  filename?: string;
  includeHeaders?: boolean;
  selectedOnly?: boolean;
  formats?: ExportFormat[];
}

export interface ExportEvent {
  format: string;
  config: ExportConfig;
  data: Record<string, unknown>[];
}
