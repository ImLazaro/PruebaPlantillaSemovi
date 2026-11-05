// ─────────────────────────────────────────────────────────────────────────────
// Export Types — Sistema de exportación extendida
// ─────────────────────────────────────────────────────────────────────────────

/** Formatos de exportación soportados. Extender esta unión para añadir más. */
export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

// ─── Header del documento exportado ─────────────────────────────────────────

/** Configuración del encabezado del documento exportado (PDF / Excel). */
export interface ExportHeaderConfig {
  /** Activar / desactivar el bloque de encabezado. */
  enabled: boolean;
  /** URL pública o data:image del logo. Si se omite no se renderiza logo. */
  logo?: string;
  /** Título principal del reporte. Requerido en modo clásico; opcional si se usa `layout`. */
  title?: string;
  /** Subtítulo (ej. nombre de sucursal). */
  subtitle?: string;
  /** Descripción o instrucción adicional. */
  description?: string;
  /** Mostrar fecha de generación. Por defecto: true. */
  showGeneratedDate?: boolean;
  /** Rango de fechas ya formateado, ej: "1 Feb 2026 — 23 Feb 2026". */
  dateRange?: string;
  /** Filtros activos al momento de exportar (se muestran como notas al pie). */
  appliedFilters?: Record<string, unknown>;
  /**
   * Si es true, el contenido de title/subtitle/description se interpreta como HTML
   * inline limitado (<b>, <i>, <em>, <strong>, <span style="color:...">).
   * PDF: renderizado nativo segmento a segmento.
   * Excel: el encabezado completo se captura como imagen via html2canvas.
   * CSV / JSON: las etiquetas se eliminan automáticamente.
   */
  useHtml?: boolean;
  /**
   * En qué páginas mostrar el encabezado del documento.
   * - 'first' (default): solo en la primera página.
   * - 'all': en todas las páginas.
   */
  headerOnPages?: 'first' | 'all';

  /**
   * Layout declarativo de columnas para el encabezado del PDF.
   * Cuando está presente, reemplaza el renderizado clásico (title/subtitle/description)
   * y dibuja nativamente en jsPDF — sin html2canvas, sin HTML.
   *
   * Cada columna tiene un ancho relativo (0-1) y una lista de items
   * (`text`, `image`, `spacer`) que se apilan verticalmente.
   *
   * Ejemplo — tres columnas: institución | título centrado | logo derecha:
   * ```ts
   * layout: [
   *   { width: 0.33, align: 'left',   items: [{ type: 'text', text: 'Institución', bold: true }] },
   *   { width: 0.34, align: 'center', items: [{ type: 'text', text: 'SISTEMA DE CITAS', bold: true, color: '#9D2449' }] },
   *   { width: 0.33, align: 'right',  items: [{ type: 'image', src: '/assets/logo.png', width: 24, height: 12 }] },
   * ]
   * ```
   * Para múltiples filas usa un array de arrays:
   * ```ts
   * layout: [
   *   [ col1, col2, col3 ],   // fila 1
   *   [ fullWidthCol ],       // fila 2
   * ]
   * ```
   */
  layout?: ExportHeaderColumn[][];
}

// ─── Header layout (columnas declarativas) ───────────────────────────────────

/** Una columna del layout de encabezado. */
export interface ExportHeaderColumn {
  /** Fracción del ancho disponible (p.ej. 0.33). Debe sumar ≤ 1. */
  width?: number;
  /** Alineación horizontal del contenido dentro de la columna. */
  align?: 'left' | 'center' | 'right';
  /** Alineación vertical del contenido dentro de la columna. Default: 'top'. */
  valign?: 'top' | 'center' | 'bottom';
  /** Items a renderizar en orden vertical dentro de la columna. */
  items: ExportHeaderItem[];
}

/** Un elemento dentro de una columna de encabezado. */
export type ExportHeaderItem =
  | ExportHeaderTextItem
  | ExportHeaderImageItem
  | ExportHeaderSpacerItem;

/** Texto con estilos, dibujado nativamente en jsPDF. */
export interface ExportHeaderTextItem {
  type: 'text';
  /** Texto a mostrar. */
  text: string;
  /** Tamaño de fuente en pt. Default: 10. */
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  /** Color hex, ej: '#9D2449'. */
  color?: string;
}

/** Imagen (URL pública o base64 PNG/JPEG). */
export interface ExportHeaderImageItem {
  type: 'image';
  /** URL pública accesible desde el navegador (p.ej. '/assets/logo.png') o data:image base64. */
  src: string;
  /** Ancho en mm. Default: 24. */
  width?: number;
  /** Alto en mm. Default: 12. */
  height?: number;
  /** Offset vertical en mm (positivo = abajo, negativo = arriba). Default: 0. */
  offsetY?: number;
}

/** Espacio vertical vacío entre items. */
export interface ExportHeaderSpacerItem {
  type: 'spacer';
  /** Alto en mm. */
  height: number;
}

// ─── Estilos del documento ────────────────────────────────────────────────────

/** Configuración de estilos del documento exportado (Excel y PDF). */
export interface ExportStyleConfig {
  // ── Tabla ──────────────────────────────────────────────────────────────────
  /** Color de fondo del encabezado de la tabla. Default: '#9D2449' */
  tableHeaderBg?: string;
  /** Color de texto del encabezado. Default: '#FFFFFF' */
  tableHeaderColor?: string;
  /** Color de fila alternada (zebra). Default: '#FBF0F3' */
  zebraColor?: string;
  /** Color de bordes de celda. Default: '#E5E7EB' */
  borderColor?: string;
  /** Fuente del documento. Default: 'Helvetica' */
  fontFamily?: string;
  // ── Página ─────────────────────────────────────────────────────────────────
  /** Tamaño de página. Default: 'A4' */
  pageSize?: 'A4' | 'Letter';
  /** Orientación. Default: 'portrait' */
  orientation?: 'portrait' | 'landscape';
  /** Márgenes en mm. Defaults: { top:15, right:15, bottom:15, left:15 } */
  margins?: { top: number; right: number; bottom: number; left: number };
  // ── Columnas ───────────────────────────────────────────────────────────────
  /** Mapa de anchos de columna { key → ancho en caracteres (Excel) / px (PDF) }. */
  columnWidths?: Record<string, number>;
}

// ─── Tipografía del documento ─────────────────────────────────────────────────

/**
 * Configuración tipográfica completamente independiente por documento.
 * Se puede definir una vez y reutilizar en varios reportes usando `createExportDocConfig`.
 */
export interface ExportTypographyConfig {
  /** Familia tipográfica principal. Default: 'Montserrat' */
  fontFamily?: string;

  /**
   * Tamaños de fuente en puntos (Excel) / px (PDF).
   * Cada nivel del documento es configurable de forma independiente.
   */
  sizes?: {
    /** Título principal del reporte. Default: 14 */
    reportTitle?: number;
    /** Subtítulo (ej. nombre de sucursal). Default: 11 */
    reportSubtitle?: number;
    /** Descripción o instrucción adicional. Default: 10 */
    reportDescription?: number;
    /** Metadatos: rango de fechas, fecha de generación, filtros. Default: 9 */
    reportMeta?: number;
    /** Texto de cabecera de columnas en la tabla. Default: 10 */
    tableHeader?: number;
    /** Cuerpo de la tabla (filas de datos). Default: 10 */
    tableBody?: number;
    /** Valores secundarios dentro de una celda (subKeys, segunda línea). Default: 9 */
    tableSubValue?: number;
  };

  /** Aplicar negrita a la cabecera de tabla. Default: true */
  tableHeaderBold?: boolean;

  /**
   * Color del título principal del reporte.
   * Si no se especifica, hereda `styleConfig.tableHeaderBg`.
   */
  titleColor?: string;

  /** Color de los valores secundarios en celdas con subKeys. Default: '#555555' */
  subValueColor?: string;
}

// ─── Config combinada ────────────────────────────────────────────────────────

/**
 * Configuración completa del documento exportado.
 * Cada propiedad es independiente y puede omitirse para usar los defaults.
 * Usa `createExportDocConfig()` para componer configs reutilizables.
 */
export interface ExportDocConfig {
  headerConfig?: ExportHeaderConfig;
  styleConfig?: ExportStyleConfig;
  /** Configuración tipográfica independiente (familia, tamaños, pesos). */
  typographyConfig?: ExportTypographyConfig;
}

// ─── Request de exportación ───────────────────────────────────────────────────

import { ExportColumnDef } from './export.service';

/** Solicitud completa de exportación enviada al EnhancedExportService. */
export interface ExportRequest {
  /** Datos ya filtrados. */
  data: Record<string, unknown>[];
  /** Definición de columnas (fallback si no hay entrada en columnsByFormat). */
  columns: ExportColumnDef[];
  /**
   * Columnas específicas por formato. Si se define para el formato solicitado,
   * tiene prioridad sobre `columns`. Permite tener distintas columnas en Excel vs PDF.
   * Ej: { excel: [...allColumns], pdf: [...reducedColumns] }
   */
  columnsByFormat?: Partial<Record<ExportFormat, ExportColumnDef[]>>;
  /** Nombre base del archivo (sin extensión). */
  filename: string;
  /** Formato de exportación. */
  format: ExportFormat;
  /** Configuración del documento (header + estilos). Opcional. */
  docConfig?: ExportDocConfig;
}

// ─── Result ─────────────────────────────────────────────────────────────────

/** Resultado devuelto por EnhancedExportService.export(). */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  message?: string;
  error?: string;
}

// ─── Descriptores de formato para el dropdown ────────────────────────────────

/** Descriptor visual de un formato para renderizarlo en el menú desplegable. */
export interface ExportFormatDescriptor {
  key: ExportFormat;
  label: string;
  sublabel: string;
  icon: string;
}

/** Catálogo completo de formatos con sus metadatos visuales. */
export const ALL_EXPORT_FORMAT_DESCRIPTORS: ExportFormatDescriptor[] = [
  { key: 'excel', label: 'Excel',  sublabel: 'Hoja de cálculo (.xlsx)',    icon: 'grid_on' },
  { key: 'csv',   label: 'CSV',    sublabel: 'Texto delimitado (.csv)',     icon: 'table_rows' },
  { key: 'json',  label: 'JSON',   sublabel: 'Datos estructurados (.json)', icon: 'code' },
  { key: 'pdf',   label: 'PDF',    sublabel: 'Documento imprimible (.pdf)', icon: 'picture_as_pdf' },
];
