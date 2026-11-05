import { Component, Input, Output, EventEmitter, HostListener, ViewEncapsulation, OnChanges, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiDensity, UiSize, UiState, UiStatus } from '../../_ui-types';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen';

export interface ModalConfig {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showCloseButton?: boolean;
  backgroundColor?: string;
  padding?: boolean;
  size?: ModalSize;
  state?: UiState;
  /** @deprecated Use `state`. */
  status?: UiStatus;
  density?: UiDensity;
}

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./modal.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div *ngIf="isOpen" class="institutional-modal-overlay entering" role="dialog" aria-modal="true"
         [attr.aria-labelledby]="'fs-modal-title-' + modalId" [attr.aria-describedby]="'fs-modal-desc-' + modalId"
         (click)="resolvedConfig.showCloseButton !== false ? close() : null">

       <div #modalContainer
         class="institutional-modal-container entering overflow-hidden bg-white"
         [ngClass]="[sizeClass, getModalStateClasses()]"
         tabindex="-1"
         (click)="$event.stopPropagation()">

        <div *ngIf="resolvedConfig.showHeader !== false" class="bg-gradient-institucional p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 *ngIf="resolvedConfig.title" [id]="'fs-modal-title-' + modalId" class="text-2xl md:text-3xl font-bold text-white">{{ resolvedConfig.title }}</h3>
              <p *ngIf="resolvedConfig.subtitle" [id]="'fs-modal-desc-' + modalId" class="text-white opacity-90 mt-1">{{ resolvedConfig.subtitle }}</p>
            </div>

            <div class="flex items-center gap-4">
              <ng-content select="[slot=header-actions]"></ng-content>
              <button *ngIf="resolvedConfig.showCloseButton !== false"
                      type="button"
                      class="text-white p-2 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#621132]"
                      aria-label="Cerrar modal"
                      (click)="close()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-auto" [class.p-8]="resolvedConfig.padding !== false">
          <div class="relative">
            <ng-content></ng-content>
          </div>
        </div>

        <div class="bg-gray-50 border-t border-gray-100 p-4">
          <ng-content select="[slot=footer]"></ng-content>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .size-2xl {
      width: 100%;
      max-width: 1536px;
      margin-left: auto;
      margin-right: auto;
    }
  `]
})
export class ModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() modalId: string = Math.random().toString(36).slice(2);

  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() showHeader?: boolean;
  @Input() showCloseButton?: boolean;
  @Input() padding?: boolean;
  @Input() size?: UiSize | ModalSize;
  @Input() state?: UiState;

  @Input() uiConfig?: Omit<ModalConfig, 'title' | 'subtitle' | 'showHeader' | 'showCloseButton' | 'padding' | 'size' | 'state'>;

  /** @deprecated Usar inputs explícitos + `uiConfig` para opciones avanzadas. */
  @Input() config: ModalConfig = {
      showHeader: true,
      showCloseButton: true,
      padding: true,
      size: 'md',
      state: 'default'
  };
  @Input() closeOnEscape = true;
  @Input() trapFocus = false;
  @Input() restoreFocusOnClose = true;
  @Input() initialFocusSelector?: string;

  @Output() closed = new EventEmitter<void>();
  /** @deprecated Use `closed`. */
  @Output() modalClose = this.closed;
  @Output() opened = new EventEmitter<void>();
  /** @deprecated Use `opened`. */
  @Output() modalOpen = this.opened;

  resolvedConfig: ModalConfig = {};
  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLElement>;
  private previousFocusedElement: HTMLElement | null = null;
  private wasOpen = false;

  ngOnInit(): void {
    this.resolveConfig();
  }

  ngOnChanges(): void {
    this.resolveConfig();

    if (this.isOpen && !this.wasOpen) {
      this.previousFocusedElement = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      setTimeout(() => this.focusModalInitialElement(), 0);
    }

    if (!this.isOpen && this.wasOpen) {
      document.body.style.overflow = '';
      this.restoreFocus();
    }

    this.wasOpen = this.isOpen;
  }

  private resolveConfig(): void {
    const legacy = this.config || {};
    const advanced = this.uiConfig || {};

    this.resolvedConfig = {
      ...legacy,
      ...advanced,
      title: this.title ?? legacy.title,
      subtitle: this.subtitle ?? legacy.subtitle,
      showHeader: this.showHeader ?? legacy.showHeader ?? true,
      showCloseButton: this.showCloseButton ?? legacy.showCloseButton ?? true,
      padding: this.padding ?? legacy.padding ?? true,
      size: this.normalizeSize(this.size ?? legacy.size),
      state: this.state ?? legacy.state ?? this.mapStatusToState(advanced.status ?? legacy.status) ?? 'default'
    };
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) {
      return;
    }

    if (event.key === 'Escape' && this.closeOnEscape) {
      event.preventDefault();
      this.close();
      return;
    }

    this.handleRoleKeyboardSupport(event);

    if (event.key === 'Tab' && this.trapFocus) {
      this.maintainFocusTrap(event);
    }
  }

  open(): void {
    this.previousFocusedElement = document.activeElement as HTMLElement | null;
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.focusModalInitialElement(), 0);
    this.wasOpen = true;
    this.opened.emit();
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.restoreFocus();
    this.wasOpen = false;
    this.closed.emit();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getModalStateClasses(): string {
    const classes = ['ui-state-default'];
    if (this.resolvedConfig.state === 'loading') classes.push('ui-state-loading');
    if (this.resolvedConfig.state === 'disabled') classes.push('ui-state-disabled');
    return classes.join(' ');
  }

  get sizeClass(): string {
    const s = this.resolvedConfig?.size || 'md';
    switch (s) {
      case 'sm':
        return 'size-sm';
      case 'md':
        return 'size-md';
      case 'xl':
        return 'size-xl';
      case '2xl':
        return 'size-2xl';
      case 'lg':
        return 'size-lg';
      case 'fullscreen':
      default:
        return 'size-full';
    }
  }

  private normalizeSize(size?: UiSize | ModalSize): ModalSize {
    switch (size) {
      case 'sm':
      case 'md':
      case 'lg':
      case 'xl':
      case '2xl':
        return size;
      case 'fullscreen':
        return 'fullscreen';
      default:
        return 'md';
    }
  }

  private mapStatusToState(status?: UiStatus): UiState | undefined {
    if (status === 'disabled' || status === 'loading' || status === 'error') {
      return status;
    }
    return undefined;
  }

  private focusModalInitialElement(): void {
    const container = this.modalContainer?.nativeElement;
    if (!container) {
      return;
    }

    if (this.initialFocusSelector) {
      const selectedTarget = container.querySelector<HTMLElement>(this.initialFocusSelector);
      if (selectedTarget && typeof selectedTarget.focus === 'function') {
        selectedTarget.focus();
        return;
      }
    }

    const focusable = this.getFocusableElements(container);
    const target = focusable[0] ?? container;
    target.focus();
  }

  private restoreFocus(): void {
    if (!this.restoreFocusOnClose) {
      this.previousFocusedElement = null;
      return;
    }

    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
      this.previousFocusedElement.focus();
    }
    this.previousFocusedElement = null;
  }

  private handleRoleKeyboardSupport(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const role = target.getAttribute('role');

    if ((event.key === 'Enter' || event.key === ' ') && (role === 'button' || role === 'menuitem')) {
      event.preventDefault();
      target.click();
      return;
    }

    if ((role === 'tab' || role === 'option') && ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      this.focusSiblingByRole(target, role, direction);
      event.preventDefault();
    }
  }

  private focusSiblingByRole(current: HTMLElement, role: string, direction: -1 | 1): void {
    const group = Array.from(
      (this.modalContainer?.nativeElement ?? document).querySelectorAll<HTMLElement>(`[role="${role}"]`)
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0);

    if (!group.length) {
      return;
    }

    const currentIndex = group.indexOf(current);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = (currentIndex + direction + group.length) % group.length;
    group[nextIndex].focus();
  }

  private maintainFocusTrap(event: KeyboardEvent): void {
    const container = this.modalContainer?.nativeElement;
    if (!container) {
      return;
    }

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getFocusableElements(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0);
  }
}
