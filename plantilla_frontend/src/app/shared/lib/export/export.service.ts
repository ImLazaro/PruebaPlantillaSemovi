import { Injectable } from '@angular/core';

/** Definición de columna para exportación */
export interface ExportColumnDef {
  key: string;
  header: string;
  /**
   * Claves adicionales del registro para renderizar en líneas separadas
   * dentro de la misma celda. Ej: ['customerPhone', 'customerEmail']
   * Si se define, `key` se usa solo como identificador de columna.
   */
  subKeys?: string[];
  /**
   * Ancho mínimo de la columna en milímetros (solo para PDF).
   * Si no se especifica, el servicio calcula automáticamente basado en contenido.
   */
  minWidth?: number;
}

@Injectable({ providedIn: 'root' })
export class ExportService {

  // ─── CSV ────────────────────────────────────────────────────────────────────

  toCsv(data: Record<string, unknown>[], columns: ExportColumnDef[], filename: string): void {
    if (!data.length) return;

    const headers = columns.map(c => this.escapeCsv(c.header));
    const rows = data.map(row =>
      columns.map(c => this.escapeCsv(this.getCellValue(row, c.key)))
    );

    const content = [headers, ...rows].map(r => r.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${filename}.csv`);
  }

  // ─── Excel ──────────────────────────────────────────────────────────────────

  async toXlsx(data: Record<string, unknown>[], columns: ExportColumnDef[], filename: string): Promise<void> {
    if (!data.length) return;

    // Lazy-load exceljs para no aumentar el bundle inicial
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Citas');

    worksheet.columns = columns.map(c => ({
      header: c.header,
      key: c.key,
      width: Math.max(c.header.length + 2, 14),
    }));

    worksheet.addRows(
      data.map(row =>
        Object.fromEntries(
          columns.map(c => [c.key, this.sanitizeSpreadsheetValue(this.getCellValue(row, c.key))]),
        ),
      ),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.triggerDownload(blob, `${filename}.xlsx`);
  }

  // ─── JSON ────────────────────────────────────────────────────────────────────

  toJson(data: Record<string, unknown>[], columns: ExportColumnDef[], filename: string): void {
    if (!data.length) return;
    const exportData = data.map(row =>
      Object.fromEntries(columns.map(c => [c.header, this.getCellValue(row, c.key)]))
    );
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    this.triggerDownload(blob, `${filename}.json`);
  }

  // ─── Descarga ────────────────────────────────────────────────────────────────

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private getCellValue(row: Record<string, unknown>, key: string): string {
    if (!key || row == null) return '';
    // Soporte para rutas anidadas: "service.name"
    const val = key.split('.').reduce<unknown>((obj, k) => (obj != null && typeof obj === 'object') ? (obj as Record<string, unknown>)[k] : undefined, row);
    if (val == null) return '';
    return String(val);
  }

  private escapeCsv(value: string): string {
    if (value == null) return '';
    const str = this.sanitizeSpreadsheetValue(String(value));
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private sanitizeSpreadsheetValue(value: string): string {
    return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  }
}
