import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ViewChild, ElementRef,
  AfterViewInit, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type CodeLanguage = 'json' | 'text' | 'jwt' | 'url' | 'bash' | 'yaml' | 'xml' | 'html';
export type CodeTheme    = 'light' | 'dark' | 'institutional';

export interface CodeViewerConfig {
  /** Lenguaje para syntax highlighting. Default: 'text' */
  language?: CodeLanguage;
  /** Tema visual. Default: 'light' */
  theme?: CodeTheme;
  /** Muestra números de línea. Default: false */
  lineNumbers?: boolean;
  /** Muestra botón de copiar. Default: true */
  copyButton?: boolean;
  /** Muestra etiqueta del lenguaje. Default: true */
  showLanguageLabel?: boolean;
  /** Alto máximo con scroll (ej. '300px'). Default: sin límite */
  maxHeight?: string;
  /** Texto monoespacio sin wrapping. Default: true */
  nowrap?: boolean;
  /** Etiqueta personalizada de la sección. */
  label?: string;
  /** Modo secreto: muestra puntos hasta que se hace hover. */
  masked?: boolean;
  /** Clase adicional. */
  customClass?: string;
}

/** Palabras clave por lenguaje para coloreado simple sin librerías externas. */
const JSON_HIGHLIGHT = (code: string): string => {
  // Escapa HTML primero
  let s = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Colorea strings, números, booleanos, null, keys
  s = s.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'cv-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'cv-key' : 'cv-str';
      } else if (/true|false/.test(match)) {
        cls = 'cv-bool';
      } else if (/null/.test(match)) {
        cls = 'cv-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
  return s;
};

const JWT_HIGHLIGHT = (code: string): string => {
  const parts = code.split('.');
  if (parts.length === 3) {
    return [
      `<span class="cv-jwt-header">${parts[0]}</span>`,
      `<span class="cv-punct">.</span>`,
      `<span class="cv-jwt-payload">${parts[1]}</span>`,
      `<span class="cv-punct">.</span>`,
      `<span class="cv-jwt-sig">${parts[2]}</span>`,
    ].join('');
  }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/**
 * CodeViewerComponent
 *
 * Bloque de código con syntax highlighting CSS, copiar al portapapeles,
 * modo secreto (masked) y soporte para JWT/JSON/URL/texto.
 *
 * @example Client ID:
 * ```html
 * <app-code-viewer
 *   [code]="application.clientId"
 *   [config]="{ language: 'text', label: 'Client ID', copyButton: true }" />
 * ```
 *
 * @example JWT:
 * ```html
 * <app-code-viewer
 *   [code]="accessToken"
 *   [config]="{ language: 'jwt', masked: true, maxHeight: '200px' }" />
 * ```
 *
 * @example JSON formateado:
 * ```html
 * <app-code-viewer
 *   [code]="jwksJson"
 *   [config]="{ language: 'json', lineNumbers: true, theme: 'dark' }" />
 * ```
 */
@Component({
  selector: 'app-code-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .cv-root {
      font-family: 'Montserrat', sans-serif;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    /* ── Header ── */
    .cv-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-8) var(--space-12);
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      gap: var(--space-8);
    }
    .cv-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: #374151;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cv-lang-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #9ca3af;
      padding: 2px 6px;
      background: #f3f4f6;
      border-radius: var(--radius-sm);
    }
    .cv-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      cursor: pointer;
      color: #6b7280;
      padding: 3px 8px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .cv-copy-btn:hover { border-color: var(--institucional-primario); color: var(--institucional-primario); }
    .cv-copy-btn.copied { border-color: #10b981; color: #10b981; }
    .cv-copy-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(157,36,73,0.25); }
    .cv-copy-icon { font-size: 0.85rem; font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400; }

    /* ── Code body ── */
    .cv-body {
      overflow: auto;
      position: relative;
    }

    .cv-pre {
      margin: 0;
      padding: var(--space-12) var(--space-16);
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.8125rem;
      line-height: 1.65;
      overflow: auto;
    }
    .cv-nowrap .cv-pre { white-space: pre; }
    .cv-wrap .cv-pre { white-space: pre-wrap; word-break: break-all; }

    /* ── Masked ── */
    .cv-masked .cv-code-content { filter: blur(4px); user-select: none; transition: filter 0.2s ease; }
    .cv-masked:hover .cv-code-content { filter: none; }

    /* ── Themes ── */
    /* Light (default) */
    .cv-theme-light { background: #fff; }
    .cv-theme-light .cv-pre { color: #374151; }
    .cv-theme-light .cv-key   { color: #9D2449; }
    .cv-theme-light .cv-str   { color: #16a34a; }
    .cv-theme-light .cv-num   { color: #d97706; }
    .cv-theme-light .cv-bool  { color: #7c3aed; }
    .cv-theme-light .cv-null  { color: #6b7280; font-style: italic; }
    .cv-theme-light .cv-punct { color: #6b7280; }
    .cv-theme-light .cv-jwt-header  { color: #9D2449; font-weight: 600; }
    .cv-theme-light .cv-jwt-payload { color: #2563eb; font-weight: 600; }
    .cv-theme-light .cv-jwt-sig     { color: #dc2626; font-weight: 600; }

    /* Dark */
    .cv-theme-dark { background: #1e1e1e; border-color: #333; }
    .cv-theme-dark .cv-header { background: #2d2d2d; border-color: #3e3e3e; }
    .cv-theme-dark .cv-label  { color: #d4d4d4; }
    .cv-theme-dark .cv-pre    { color: #d4d4d4; }
    .cv-theme-dark .cv-key    { color: #9cdcfe; }
    .cv-theme-dark .cv-str    { color: #ce9178; }
    .cv-theme-dark .cv-num    { color: #b5cea8; }
    .cv-theme-dark .cv-bool   { color: #569cd6; }
    .cv-theme-dark .cv-null   { color: #808080; font-style: italic; }
    .cv-theme-dark .cv-punct  { color: #808080; }
    .cv-theme-dark .cv-jwt-header  { color: #ff6b6b; }
    .cv-theme-dark .cv-jwt-payload { color: #4fc3f7; }
    .cv-theme-dark .cv-jwt-sig     { color: #ff9800; }

    /* Institutional (guinda) */
    .cv-theme-institutional { background: rgba(157,36,73,0.03); border-color: rgba(157,36,73,0.2); }
    .cv-theme-institutional .cv-header { background: linear-gradient(135deg, var(--institucional-primario), var(--institucional-secundario)); border: none; }
    .cv-theme-institutional .cv-label  { color: #fff; }
    .cv-theme-institutional .cv-lang-badge { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }
    .cv-theme-institutional .cv-copy-btn { border-color: rgba(255,255,255,0.3); color: #fff; }
    .cv-theme-institutional .cv-copy-btn:hover { background: rgba(255,255,255,0.15); border-color: #fff; }
    .cv-theme-institutional .cv-pre { color: #374151; }
    .cv-theme-institutional .cv-key  { color: #9D2449; }
    .cv-theme-institutional .cv-str  { color: #16a34a; }
    .cv-theme-institutional .cv-num  { color: #d97706; }
    .cv-theme-institutional .cv-bool { color: #7c3aed; }
    .cv-theme-institutional .cv-null { color: #6b7280; font-style: italic; }
    .cv-theme-institutional .cv-jwt-header  { color: #9D2449; }
    .cv-theme-institutional .cv-jwt-payload { color: #2563eb; }
    .cv-theme-institutional .cv-jwt-sig     { color: #dc2626; }

    /* ── Line numbers ── */
    .cv-gutter {
      display: inline-block;
      width: 2.5em;
      padding-right: 1em;
      color: #9ca3af;
      text-align: right;
      user-select: none;
      border-right: 1px solid #e5e7eb;
      margin-right: 1em;
      font-size: 0.75em;
    }
    .cv-theme-dark .cv-gutter { border-color: #3e3e3e; color: #555; }
  `],
  template: `
    <div class="cv-root"
      [class]="'cv-theme-' + resolvedTheme"
      [class.cv-masked]="cfg.masked && !revealed"
      [class.cv-nowrap]="cfg.nowrap !== false"
      [class.cv-wrap]="cfg.nowrap === false"
      [class]="cfg.customClass ?? ''">

      <!-- Header -->
      <div *ngIf="cfg.label || cfg.showLanguageLabel !== false || cfg.copyButton !== false"
        class="cv-header">
        <span *ngIf="cfg.label" class="cv-label">{{ cfg.label }}</span>
        <span *ngIf="!cfg.label && cfg.showLanguageLabel !== false" class="cv-lang-badge">
          {{ cfg.language ?? 'text' }}
        </span>
        <span *ngIf="cfg.label && cfg.showLanguageLabel !== false" class="cv-lang-badge">
          {{ cfg.language ?? 'text' }}
        </span>

        <!-- Reveal (masked) -->
        <button *ngIf="cfg.masked" type="button" class="cv-copy-btn"
          (click)="toggleReveal()">
          <span class="cv-copy-icon">{{ revealed ? 'visibility_off' : 'visibility' }}</span>
          {{ revealed ? 'Ocultar' : 'Mostrar' }}
        </button>

        <!-- Copy -->
        <button *ngIf="cfg.copyButton !== false" type="button"
          class="cv-copy-btn" [class.copied]="copied"
          (click)="copyCode()">
          <span class="cv-copy-icon">{{ copied ? 'check' : 'content_copy' }}</span>
          {{ copied ? 'Copiado' : 'Copiar' }}
        </button>
      </div>

      <!-- Code body -->
      <div class="cv-body" [style.maxHeight]="cfg.maxHeight">
        <pre class="cv-pre"><code
            class="cv-code-content"
            [innerHTML]="highlighted"></code></pre>
      </div>
    </div>
  `
})
export class CodeViewerComponent implements OnChanges {
  /** Código a mostrar. */
  @Input() code = '';
  /** Configuración. */
  @Input() config: CodeViewerConfig = {};

  /** Emite al copiar. */
  @Output() codeCopied = new EventEmitter<string>();

  copied  = false;
  revealed = false;
  highlighted = '';

  private copyTimer?: ReturnType<typeof setTimeout>;

  get cfg(): CodeViewerConfig { return this.config; }

  get resolvedTheme(): CodeTheme { return this.cfg.theme ?? 'light'; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['code'] || changes['config']) {
      this.buildHighlighted();
    }
  }

  private buildHighlighted(): void {
    const raw = this.code ?? '';
    const lang = this.cfg.language ?? 'text';

    let body: string;

    if (lang === 'json') {
      try {
        const parsed  = JSON.parse(raw);
        const pretty  = JSON.stringify(parsed, null, 2);
        body = JSON_HIGHLIGHT(pretty);
      } catch {
        body = JSON_HIGHLIGHT(raw);
      }
    } else if (lang === 'jwt') {
      body = JWT_HIGHLIGHT(raw);
    } else {
      // Plain escape
      body = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    if (this.cfg.lineNumbers) {
      const lines = body.split('\n');
      body = lines
        .map((l, i) => `<span class="cv-gutter">${i + 1}</span>${l}`)
        .join('\n');
    }

    this.highlighted = body;
  }

  toggleReveal(): void {
    this.revealed = !this.revealed;
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code ?? '');
      this.copied = true;
      this.codeCopied.emit(this.code);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => { this.copied = false; }, 2000);
    } catch { /* clipboard not available */ }
  }

  ngOnDestroy(): void {
    clearTimeout(this.copyTimer);
  }
}
