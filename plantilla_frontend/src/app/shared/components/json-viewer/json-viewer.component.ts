import {
  Component, Input,
  ChangeDetectionStrategy, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface JsonViewerConfig {
  /** Profundidad inicial de nodos abiertos. Default: 2 */
  expandDepth?: number;
  /** Alto máximo con scroll. Default: sin límite */
  maxHeight?: string;
  /** Muestra el número de keys/items de cada objeto/array. Default: true */
  showCount?: boolean;
  /** Muestra el tipo de dato. Default: false */
  showTypes?: boolean;
  /** Tamaño de fuente. Default: '0.8125rem' */
  fontSize?: string;
  /** Tema. Default: 'light' */
  theme?: 'light' | 'dark';
  /** Clase adicional. */
  customClass?: string;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];

/**
 * JsonViewerComponent
 *
 * Visor interactivo de JSON con nodos colapsables, syntax
 * highlighting y conteo de keys. Sin dependencias externas.
 * Ideal para mostrar payloads de tokens, claims OIDC,
 * respuestas de endpoints OAuth y configuración JWKS.
 *
 * @example Token claims:
 * ```html
 * <app-json-viewer [data]="decodedToken" [config]="{ expandDepth: 3 }" />
 * ```
 *
 * @example String JSON:
 * ```html
 * <app-json-viewer [json]="rawJsonString" [config]="{ theme: 'dark', maxHeight: '400px' }" />
 * ```
 */
@Component({
  selector: 'app-json-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .jv-root {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      border-radius: var(--radius-lg);
      overflow: auto;
      border: 1px solid #e5e7eb;
      padding: var(--space-12) var(--space-16);
    }

    /* Light */
    .jv-light { background: #fff; color: #374151; }
    .jv-light .jv-key     { color: #9D2449; font-weight: 600; }
    .jv-light .jv-str     { color: #16a34a; }
    .jv-light .jv-num     { color: #d97706; }
    .jv-light .jv-bool    { color: #7c3aed; }
    .jv-light .jv-null    { color: #9ca3af; font-style: italic; }
    .jv-light .jv-punct   { color: #9ca3af; }
    .jv-light .jv-count   { color: #c4b5fd; font-size: 0.7em; margin-left: 4px; }
    .jv-light .jv-expand  { color: #6b7280; }
    .jv-light .jv-toggle  { color: var(--institucional-primario); }

    /* Dark */
    .jv-dark { background: #1e1e1e; color: #d4d4d4; border-color: #333; }
    .jv-dark .jv-key     { color: #9cdcfe; font-weight: 600; }
    .jv-dark .jv-str     { color: #ce9178; }
    .jv-dark .jv-num     { color: #b5cea8; }
    .jv-dark .jv-bool    { color: #569cd6; }
    .jv-dark .jv-null    { color: #808080; font-style: italic; }
    .jv-dark .jv-punct   { color: #569cd6; }
    .jv-dark .jv-count   { color: #555; font-size: 0.7em; margin-left: 4px; }
    .jv-dark .jv-expand  { color: #555; }
    .jv-dark .jv-toggle  { color: #4fc3f7; }

    /* ── Node ── */
    .jv-node { line-height: 1.6; }
    .jv-line { display: flex; align-items: baseline; gap: 4px; }
    .jv-children { padding-left: 1.4em; border-left: 1.5px solid #e5e7eb; margin-left: 4px; }
    .jv-dark .jv-children { border-color: #333; }

    /* Toggle button */
    .jv-toggle-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0 2px;
      font-family: 'Consolas', monospace;
      font-size: inherit;
      line-height: 1;
      border-radius: 2px;
      transition: background 0.1s ease;
    }
    .jv-toggle-btn:hover { background: rgba(0,0,0,0.06); }
    .jv-dark .jv-toggle-btn:hover { background: rgba(255,255,255,0.08); }
    .jv-toggle-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(157,36,73,0.3); }
  `],
  template: `
    <div class="jv-root"
      [class]="'jv-' + resolvedTheme"
      [style.fontSize]="cfg.fontSize ?? '0.8125rem'"
      [style.maxHeight]="cfg.maxHeight"
      [class]="cfg.customClass ?? ''">

      <div class="jv-node">
        <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: parsed, depth: 0, key: null }"></ng-container>
      </div>
    </div>

    <!-- ── Recursive node template ── -->
    <ng-template #nodeTemplate let-val let-depth="depth" let-key="key">

      <!-- NULL -->
      <span *ngIf="val === null" class="jv-line">
        <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
        <span class="jv-null">null</span>
      </span>

      <!-- BOOLEAN -->
      <span *ngIf="isBool(val)" class="jv-line">
        <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
        <span class="jv-bool">{{ val }}</span>
      </span>

      <!-- NUMBER -->
      <span *ngIf="isNum(val)" class="jv-line">
        <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
        <span class="jv-num">{{ val }}</span>
      </span>

      <!-- STRING -->
      <span *ngIf="isStr(val)" class="jv-line">
        <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
        <span class="jv-str">"{{ val }}"</span>
      </span>

      <!-- ARRAY -->
      <div *ngIf="isArray(val)">
        <div class="jv-line">
          <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
          <button type="button" class="jv-toggle-btn jv-toggle"
            (click)="toggle(getNodeId(key, depth))">
            {{ isOpen(getNodeId(key, depth)) ? '▾' : '▸' }}
          </button>
          <span class="jv-punct">[</span>
          <span *ngIf="!isOpen(getNodeId(key, depth))">
            <span class="jv-expand">…</span>
            <span class="jv-punct">]</span>
            <span *ngIf="cfg.showCount !== false" class="jv-count">// {{ asArray(val).length }} items</span>
          </span>
        </div>
        <div *ngIf="isOpen(getNodeId(key, depth))" class="jv-children">
          <div *ngFor="let item of asArray(val); let i = index">
            <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: item, depth: depth+1, key: i }"></ng-container>
          </div>
          <span class="jv-punct">]</span>
        </div>
      </div>

      <!-- OBJECT -->
      <div *ngIf="isObj(val)">
        <div class="jv-line">
          <span *ngIf="key !== null"><span class="jv-key">"{{ key }}"</span><span class="jv-punct">: </span></span>
          <button type="button" class="jv-toggle-btn jv-toggle"
            (click)="toggle(getNodeId(key, depth))">
            {{ isOpen(getNodeId(key, depth)) ? '▾' : '▸' }}
          </button>
          <span class="jv-punct">&#123;</span>
          <span *ngIf="!isOpen(getNodeId(key, depth))">
            <span class="jv-expand">…</span>
            <span class="jv-punct">&#125;</span>
            <span *ngIf="cfg.showCount !== false" class="jv-count">// {{ objectKeys(val).length }} keys</span>
          </span>
        </div>
        <div *ngIf="isOpen(getNodeId(key, depth))" class="jv-children">
          <div *ngFor="let k of objectKeys(val)">
            <ng-container *ngTemplateOutlet="nodeTemplate; context: { $implicit: asObj(val)[k], depth: depth+1, key: k }"></ng-container>
          </div>
          <span class="jv-punct">&#125;</span>
        </div>
      </div>

    </ng-template>
  `
})
export class JsonViewerComponent implements OnChanges {
  /** Objeto JavaScript a mostrar directamente. */
  @Input() data?: unknown;
  /** Cadena JSON a parsear y mostrar. */
  @Input() json?: string;
  /** Configuración visual. */
  @Input() config: JsonViewerConfig = {};

  parsed: JsonValue = null;

  /** Map de nodeId → abierto/cerrado */
  private openMap = new Map<string, boolean>();
  /** Contador para IDs únicos de nodo */
  private nodeSeq = 0;
  private nodeIds = new Map<string, string>();

  get cfg(): JsonViewerConfig { return this.config; }
  get resolvedTheme(): string { return this.cfg.theme ?? 'light'; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['json']) {
      this.openMap.clear();
      this.nodeSeq = 0;
      this.nodeIds.clear();
      if (this.data !== undefined && this.data !== null) {
        this.parsed = this.data as JsonValue;
      } else if (this.json) {
        try { this.parsed = JSON.parse(this.json); }
        catch { this.parsed = { error: 'JSON inválido', raw: this.json }; }
      } else {
        this.parsed = null;
      }
    }
  }

  getNodeId(key: string | number | null, depth: number): string {
    const k = `${depth}__${key}`;
    if (!this.nodeIds.has(k)) {
      this.nodeIds.set(k, `n${this.nodeSeq++}`);
    }
    return this.nodeIds.get(k)!;
  }

  isOpen(nodeId: string): boolean {
    if (!this.openMap.has(nodeId)) {
      // Default abierto hasta expandDepth
      const depth = parseInt(nodeId.replace(/^n(\d+)$/, '$1') ?? '0');
      // Usamos un heurístico: abrir si nodeSeq es pequeño o expandDepth
      const open = this.openMap.size < Math.pow(2, this.cfg.expandDepth ?? 2);
      this.openMap.set(nodeId, open);
    }
    return this.openMap.get(nodeId) ?? false;
  }

  toggle(nodeId: string): void {
    this.openMap.set(nodeId, !this.isOpen(nodeId));
  }

  // Type guards
  isNull(v: unknown):  v is null    { return v === null; }
  isBool(v: unknown):  v is boolean { return typeof v === 'boolean'; }
  isNum(v: unknown):   v is number  { return typeof v === 'number'; }
  isStr(v: unknown):   v is string  { return typeof v === 'string'; }
  isArray(v: unknown): v is JsonArray   { return Array.isArray(v); }
  isObj(v: unknown):   v is JsonObject  {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  asArray(v: unknown): JsonArray  { return v as JsonArray; }
  asObj(v: unknown):   JsonObject { return v as JsonObject; }
  objectKeys(v: unknown): string[] { return Object.keys(v as object); }
}
