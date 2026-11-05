import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, OnChanges, SimpleChanges,
  AfterViewInit, ViewChild, ElementRef, OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrCodeConfig {
  /** Tamaño en px del canvas. Default: 200 */
  size?: number;
  /** Nivel de corrección de errores. Default: 'M' */
  errorLevel?: QrErrorLevel;
  /** Color del módulo (foreground). Default: '#000000' */
  darkColor?: string;
  /** Color del fondo. Default: '#ffffff' */
  lightColor?: string;
  /** Margen (quiet zone) en módulos. Default: 4 */
  margin?: number;
  /** Muestra botón de descargar. Default: false */
  downloadable?: boolean;
  /** Nombre del archivo descargado. Default: 'qrcode.png' */
  downloadName?: string;
  /** Etiqueta bajo el QR. */
  label?: string;
  /** Muestra un spinner mientras genera. Default: true */
  showLoader?: boolean;
}

/**
 * QrCodeComponent
 *
 * Genera y renderiza un código QR en un canvas HTML usando
 * la librería `qrcode`. Diseñado principalmente para:
 * - Provisioning TOTP (otpauth:// URIs) en el flujo 2FA
 * - Deep links de autorización OAuth
 * - Códigos de verificación
 *
 * @example TOTP setup:
 * ```html
 * <app-qr-code
 *   [value]="otpauthUri"
 *   [config]="{ size: 250, label: 'Escanea con tu app autenticadora' }"
 *   (downloaded)="onQrDownloaded()" />
 * ```
 */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: inline-block; }

    .qr-root {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-12);
      font-family: 'Montserrat', sans-serif;
    }

    .qr-canvas-wrap {
      position: relative;
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.10), 0 0 0 1px #e5e7eb;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    canvas { display: block; }

    /* Overlay de carga */
    .qr-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-spinner {
      width: 2rem;
      height: 2rem;
      border-radius: 9999px;
      border: 3px solid #e5e7eb;
      border-top-color: var(--institucional-primario);
      animation: qr-spin 0.8s linear infinite;
    }
    @keyframes qr-spin {
      to { transform: rotate(360deg); }
    }

    /* Error */
    .qr-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-8);
      color: #ef4444;
      font-size: var(--font-size-xs);
      font-weight: 600;
      padding: var(--space-16);
    }
    .qr-error-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 2rem;
      font-variation-settings: 'FILL' 0, 'wght' 300;
    }

    /* Label */
    .qr-label {
      font-size: var(--font-size-xs);
      color: #6b7280;
      font-weight: 500;
      text-align: center;
      max-width: 220px;
      line-height: 1.4;
    }

    /* Download */
    .qr-download-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-8) var(--space-16);
      border-radius: var(--radius-pill);
      border: 1px solid var(--institucional-primario);
      background: transparent;
      color: var(--institucional-primario);
      font-family: 'Montserrat', sans-serif;
      font-size: var(--font-size-xs);
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .qr-download-btn:hover { background: var(--institucional-primario); color: #fff; }
    .qr-download-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(157,36,73,0.25); }
    .qr-download-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 1rem;
      font-variation-settings: 'FILL' 0, 'wght' 400;
    }
  `],
  template: `
    <div class="qr-root">
      <!-- Canvas -->
      <div class="qr-canvas-wrap"
        [style.width.px]="resolvedSize"
        [style.height.px]="resolvedSize">

        <canvas #qrCanvas></canvas>

        <!-- Spinner -->
        <div *ngIf="loading && cfg.showLoader !== false" class="qr-overlay">
          <div class="qr-spinner"></div>
        </div>

        <!-- Error -->
        <div *ngIf="error && !loading" class="qr-error">
          <span class="qr-error-icon material-symbols-outlined">qr_code_2_add</span>
          <span>No se pudo generar el QR</span>
        </div>
      </div>

      <!-- Label -->
      <span *ngIf="cfg.label" class="qr-label">{{ cfg.label }}</span>

      <!-- Download -->
      <button *ngIf="cfg.downloadable" type="button"
        class="qr-download-btn"
        (click)="download()">
        <span class="qr-download-icon material-symbols-outlined">download</span>
        Descargar QR
      </button>
    </div>
  `
})
export class QrCodeComponent implements OnChanges, AfterViewInit, OnDestroy {
  /** Valor a codificar (URL, otpauth://, texto, etc.). */
  @Input() value = '';
  /** Configuración visual. */
  @Input() config: QrCodeConfig = {};

  /** Emite cuando el canvas estuvo listo y el QR generado. */
  @Output() generated = new EventEmitter<void>();
  /** Emite al descargar. */
  @Output() downloaded = new EventEmitter<void>();
  /** Emite en caso de error de generación. */
  @Output() genError = new EventEmitter<Error>();

  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loading = false;
  error   = false;

  private viewReady = false;

  constructor(private cdr: ChangeDetectorRef) {}

  get cfg(): QrCodeConfig { return this.config; }

  get resolvedSize(): number { return this.cfg.size ?? 200; }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.value) this.generate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['value'] || changes['config']) && this.viewReady) {
      this.generate();
    }
  }

  ngOnDestroy(): void { /* cleanup if needed */ }

  private async generate(): Promise<void> {
    if (!this.canvasRef?.nativeElement || !this.value) return;

    this.loading = true;
    this.error   = false;
    this.cdr.markForCheck();

    try {
      const canvas = this.canvasRef.nativeElement;
      const size   = this.resolvedSize;
      canvas.width  = size;
      canvas.height = size;

      await QRCode.toCanvas(canvas, this.value, {
        width:            size,
        margin:           this.cfg.margin ?? 4,
        errorCorrectionLevel: this.cfg.errorLevel ?? 'M',
        color: {
          dark:  this.cfg.darkColor  ?? '#000000',
          light: this.cfg.lightColor ?? '#ffffff',
        },
      });

      this.loading = false;
      this.generated.emit();
    } catch (err) {
      this.loading = false;
      this.error   = true;
      this.genError.emit(err as Error);
    }

    this.cdr.markForCheck();
  }

  download(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const link      = document.createElement('a');
    link.download   = this.cfg.downloadName ?? 'qrcode.png';
    link.href       = canvas.toDataURL('image/png');
    link.click();
    this.downloaded.emit();
  }
}
