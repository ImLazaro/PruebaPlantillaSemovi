import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, SimpleChanges,
  HostBinding, Renderer2, inject, ViewEncapsulation, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSize, UiState, UiVariant } from '../../_ui-types';

export type IconPosition = 'left' | 'right' | 'only';

export type ButtonShape = 'rounded' | 'square' | 'circle';

export interface ButtonConfig {
  variant?: UiVariant;
  size?: UiSize;
  state?: UiState;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: IconPosition;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  title?: string;
  customClass?: string;
  customWidth?: string;
  customHeight?: string;
  customFontSize?: string;
  shape?: ButtonShape;
}

@Component({
  selector: 'app-institutional-button',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./institutional-button.component.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <span
      class="institutional-btn-wrapper"
      [class.institutional-btn-wrapper-full]="resolvedConfig.fullWidth"
      (mouseenter)="showTooltip($event)"
      (mouseleave)="hideTooltip()">

      <button
        [type]="resolvedConfig.type || 'button'"
        [class]="getButtonClasses()"
        [style]="getCustomStyles()"
        [disabled]="resolvedConfig.disabled || resolvedConfig.loading"
        [attr.aria-label]="resolvedConfig.ariaLabel || resolvedConfig.title || null"
        (mouseenter)="isHovered = true"
        (mouseleave)="onMouseLeave()"
        (mousedown)="isActivePress = true"
        (mouseup)="isActivePress = false"
        (click)="onClick($event)">

        <span
          *ngIf="resolvedConfig.loading"
          class="institutional-btn-spinner"
          aria-hidden="true">
        </span>

        <span
          *ngIf="resolvedConfig.icon && resolvedConfig.iconPosition === 'left' && !resolvedConfig.loading"
          class="material-symbols-outlined institutional-btn-icon-left"
          aria-hidden="true">
          {{ resolvedConfig.icon }}
        </span>

        <span
          *ngIf="resolvedConfig.iconPosition !== 'only'"
          class="institutional-btn-text"
          [class.institutional-btn-text-loading]="resolvedConfig.loading">
          <ng-content></ng-content>
        </span>

        <span
          *ngIf="resolvedConfig.icon && resolvedConfig.iconPosition === 'right' && !resolvedConfig.loading"
          class="material-symbols-outlined institutional-btn-icon-right"
          aria-hidden="true">
          {{ resolvedConfig.icon }}
        </span>

        <span
          *ngIf="resolvedConfig.icon && resolvedConfig.iconPosition === 'only' && !resolvedConfig.loading"
          class="material-symbols-outlined institutional-btn-icon-only"
          aria-hidden="true">
          {{ resolvedConfig.icon }}
        </span>
      </button>

    </span>
  `,
  styles: [`
    .institutional-btn-wrapper {
      position: relative;
      display: inline-flex;
      align-items: stretch;
    }
    .institutional-btn-wrapper-full {
      width: 100%;
    }
    .institutional-btn-wrapper-full button {
      width: 100%;
    }

    .institutional-btn-spinner {
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: institutional-btn-spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes institutional-btn-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .institutional-btn-icon-left {
      margin-right: 0.5rem;
    }

    .institutional-btn-icon-right {
      margin-left: 0.5rem;
    }

    .institutional-btn-icon-only {
      margin: 0;
    }

    .institutional-btn-text-loading {
      margin-left: 0.5rem;
    }
  `]
})
export class InstitutionalButtonComponent implements OnInit, OnChanges, OnDestroy {
  @Input() variant?: UiVariant;
  @Input() size?: UiSize;
  @Input() state?: UiState;
  @Input() disabled?: boolean;
  @Input() loading?: boolean;
  @Input() type?: 'button' | 'submit' | 'reset';

  @Input() icon?: string;
  @Input() iconPosition?: IconPosition;
  @Input() fullWidth?: boolean;

  @Input() uiConfig?: Omit<ButtonConfig, 'variant' | 'size' | 'state' | 'disabled' | 'loading' | 'type' | 'icon' | 'iconPosition' | 'fullWidth'>;

  @Input() config: ButtonConfig = {};

  @Output() clicked = new EventEmitter<Event>();
  @Output() buttonClick = this.clicked;

  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  resolvedConfig: ButtonConfig = {};
  isHovered = false;
  isActivePress = false;

  private tooltipEl: HTMLElement | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  showTooltip(event: MouseEvent): void {
    if (!this.resolvedConfig.title) return;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this.tooltipEl) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    const el = this.renderer.createElement('span') as HTMLElement;
    el.className = 'institutional-btn-tooltip-portal';
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    el.textContent = this.resolvedConfig.title;

    const arrow = this.renderer.createElement('span') as HTMLElement;
    arrow.className = 'institutional-btn-tooltip-portal-arrow';
    el.appendChild(arrow);

    el.style.cssText = [
      'position:fixed',
      `left:${rect.left + rect.width / 2}px`,
      `top:${rect.top - 8}px`,
      'transform:translateX(-50%) translateY(-100%)',
      'background:linear-gradient(135deg,#621132 0%,#9D2449 100%)',
      'color:#fff',
      'font-size:11px',
      'font-weight:600',
      'line-height:1.4',
      'padding:5px 10px',
      'border-radius:6px',
      'white-space:nowrap',
      'pointer-events:none',
      'z-index:99999',
      'box-shadow:0 4px 12px rgba(98,17,50,0.35),0 1px 3px rgba(0,0,0,0.2)',
      'animation:institutional-tooltip-in 0.15s ease forwards',
    ].join(';');

    this.renderer.appendChild(document.body, el);
    this.tooltipEl = el;
  }

  hideTooltip(): void {
    this.hideTimer = setTimeout(() => this.removeTooltip(), 80);
  }

  private removeTooltip(): void {
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
    this.hideTimer = null;
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.isActivePress = false;
  }

  ngOnDestroy(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.removeTooltip();
  }

  @HostBinding('class.full-width')
  get isFullWidth(): boolean {
    return this.resolvedConfig.fullWidth ?? false;
  }

  ngOnInit(): void {
    this.resolveConfig();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.resolveConfig();
  }

  private resolveConfig(): void {
    const cfg = this.config || {};
    const advanced = this.uiConfig || {};

    const state = this.resolveState();

    const nativeTitle = (this.el.nativeElement as HTMLElement).getAttribute('title') ?? undefined;
    const nativeAriaLabel = (this.el.nativeElement as HTMLElement).getAttribute('aria-label') ?? undefined;

    this.resolvedConfig = {
      ...cfg,
      ...advanced,
      variant: this.variant ?? cfg.variant ?? 'secondary',
      size: this.size ?? cfg.size ?? 'md',
      state,
      fullWidth: this.fullWidth ?? cfg.fullWidth ?? false,
      disabled: (state === 'disabled') || (this.disabled ?? cfg.disabled ?? false),
      loading: (state === 'loading') || (this.loading ?? cfg.loading ?? false),
      icon: this.icon ?? cfg.icon,
      iconPosition: this.iconPosition ?? cfg.iconPosition ?? (cfg.icon ? 'left' : undefined),
      type: this.type ?? cfg.type ?? 'button',
      title: cfg.title ?? nativeTitle,
      ariaLabel: cfg.ariaLabel ?? advanced.ariaLabel ?? nativeAriaLabel,
    };

    this.assertAccessibleNameContract();
  }

  onClick(event: Event): void {
    if (!this.resolvedConfig.disabled && !this.resolvedConfig.loading) {
      this.clicked.emit(event);
    }
  }

  getButtonClasses(): string {
    const classes = ['institutional-btn'];

    if (this.resolvedConfig.variant) {
      classes.push(`institutional-btn-${this.resolvedConfig.variant}`);
    }

    if (this.resolvedConfig.size) {
      classes.push(`institutional-btn-${this.resolvedConfig.size}`);
    }

    if (this.resolvedConfig.fullWidth) {
      classes.push('institutional-btn-full-width');
    }

    if (this.resolvedConfig.disabled) {
      classes.push('institutional-btn-disabled');
    }

    if (this.resolvedConfig.loading) {
      classes.push('institutional-btn-loading');
    }

    if (!this.resolvedConfig.disabled && !this.resolvedConfig.loading) {
      classes.push('institutional-btn-state-default');
      if (this.isHovered) {
        classes.push('institutional-btn-state-hover');
      }
      if (this.isActivePress) {
        classes.push('institutional-btn-state-active');
      }
    }

    if (this.resolvedConfig.iconPosition === 'only') {
      classes.push('institutional-btn-icon-only-container');
    }

    if (this.resolvedConfig.shape === 'square') {
      classes.push('institutional-btn-square');
    } else if (this.resolvedConfig.shape === 'circle') {
      classes.push('institutional-btn-circle');
    }

    if (this.resolvedConfig.customClass) {
      classes.push(this.resolvedConfig.customClass);
    }

    return classes.join(' ');
  }

  getCustomStyles(): Record<string, unknown> {
    const styles: Record<string, unknown> = {};

    if (this.resolvedConfig.customWidth) {
      styles['width'] = this.resolvedConfig.customWidth;
    }

    if (this.resolvedConfig.customHeight) {
      styles['height'] = this.resolvedConfig.customHeight;
    }

    if (this.resolvedConfig.customFontSize) {
      styles['fontSize'] = this.resolvedConfig.customFontSize;
    }

    return styles;
  }

  private assertAccessibleNameContract(): void {
    const isIconOnly = this.resolvedConfig.iconPosition === 'only';
    const hasAccessibleName = !!(this.resolvedConfig.ariaLabel || this.resolvedConfig.title);
    if (isIconOnly && !hasAccessibleName) {
      throw new Error('[app-institutional-button] Los botones sin texto visible requieren `ariaLabel` o `title`.');
    }
  }

  private resolveState(): UiState {
    if (this.state) return this.state;
    const cfg = this.config || {};
    if ((this.loading ?? cfg.loading) === true) return 'loading';
    if ((this.disabled ?? cfg.disabled) === true) return 'disabled';
    return 'default';
  }
}
