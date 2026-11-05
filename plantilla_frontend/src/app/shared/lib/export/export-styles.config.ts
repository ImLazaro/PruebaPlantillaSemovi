// ─────────────────────────────────────────────────────────────────────────────
// Export Styles Config — Valores por defecto del sistema institucional
// Importar en cada reporte y sobreescribir sólo las propiedades necesarias.
// Para crear una config personalizada usa `createExportDocConfig(overrides)`.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ExportHeaderConfig,
  ExportStyleConfig,
  ExportTypographyConfig,
  ExportDocConfig,
} from './export.types';

/**
 * Estilos por defecto alineados al sistema de diseño institucional.
 * Color primario: #9D2449 (Pantone 7421)
 */
export const DEFAULT_EXPORT_STYLE_CONFIG: ExportStyleConfig = {
  // ── Tabla ──────────────────────────────────────────────────────────────────
  tableHeaderBg:    '#9D2449',   // --institucional-primario
  tableHeaderColor: '#FFFFFF',
  zebraColor:       '#FBF0F3',   // rosa muy claro, tono secundario
  borderColor:      '#E5E7EB',   // gray-200
  // ── Página ─────────────────────────────────────────────────────────────────
  pageSize:         'A4',
  orientation:      'portrait',
  margins:          { top: 15, right: 15, bottom: 15, left: 15 },
  columnWidths:     {},          // vacío → auto-calculado por columna
};

/**
 * Config de header por defecto (fecha de generación activada · sin logo).
 */
export const DEFAULT_EXPORT_HEADER_CONFIG: Partial<ExportHeaderConfig> = {
  enabled:           true,
  showGeneratedDate: true,
  // logo: undefined  ← configurable por reporte
};

/**
 * Configuración tipográfica institucional por defecto.
 * Familia: Montserrat (instalada en @fontsource/montserrat). Tamaños diferenciados por nivel del documento.
 */
export const DEFAULT_EXPORT_TYPOGRAPHY_CONFIG: Required<ExportTypographyConfig> = {
  fontFamily:      'Montserrat',
  tableHeaderBold: true,
  titleColor:      '#9D2449',
  subValueColor:   '#555555',
  sizes: {
    reportTitle:       14,
    reportSubtitle:    11,
    reportDescription: 10,
    reportMeta:         9,
    tableHeader:       10,
    tableBody:         10,
    tableSubValue:      9,
  },
};

/**
 * Crea una `ExportDocConfig` completa fusionando los defaults institucionales
 * con los overrides que se especifiquen.
 *
 * Úsala para definir configs reutilizables en distintos reportes:
 * ```ts
 * const CITAS_DOC_CONFIG = createExportDocConfig({
 *   headerConfig: { title: 'Reporte de Citas', subtitle: 'Sucursal Centro' },
 *   typographyConfig: { fontFamily: 'Arial', sizes: { reportTitle: 16 } },
 * });
 * ```
 * Cada nivel se fusiona de forma independiente, por lo que sólo necesitas
 * especificar las propiedades que quieres personalizar.
 */
/**
 * Crea un `ExportHeaderConfig` reutilizable con los defaults institucionales.
 * Úsalo para definir un header una sola vez y compartirlo entre distintos documentos:
 * ```ts
 * export const CITAS_HEADER = createSharedHeader({
 *   title: 'Reporte de Citas',
 *   description: 'Citas registradas en el rango de fechas seleccionado.',
 *   useHtml: false,
 * });
 * // En el componente (partes dinámicas sobreescriben las estáticas):
 * createExportDocConfig({ headerConfig: { ...CITAS_HEADER, subtitle: this.branchLabel } });
 * ```
 */
export function createSharedHeader(
  base: Omit<ExportHeaderConfig, 'enabled'> & { enabled?: boolean }
): ExportHeaderConfig {
  return {
    enabled: true,
    showGeneratedDate: true,
    ...base,
  } as ExportHeaderConfig;
}

export function createExportDocConfig(overrides: Partial<ExportDocConfig> = {}): ExportDocConfig {
  const defTypo = DEFAULT_EXPORT_TYPOGRAPHY_CONFIG;
  return {
    headerConfig: {
      ...DEFAULT_EXPORT_HEADER_CONFIG,
      ...overrides.headerConfig,
    } as ExportHeaderConfig,
    styleConfig: {
      ...DEFAULT_EXPORT_STYLE_CONFIG,
      ...overrides.styleConfig,
    },
    typographyConfig: {
      ...defTypo,
      ...overrides.typographyConfig,
      sizes: {
        ...defTypo.sizes,
        ...overrides.typographyConfig?.sizes,
      },
    },
  };
}
