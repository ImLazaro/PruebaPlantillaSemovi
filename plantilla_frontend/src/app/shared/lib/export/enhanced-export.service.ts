// ─────────────────────────────────────────────────────────────────────────────
// EnhancedExportService — Exportación a CSV, Excel (exceljs), JSON y PDF
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable } from '@angular/core';
import type { Worksheet as ExcelWorksheet, CellRichTextValue, RichText } from 'exceljs';
import type { jsPDF } from 'jspdf';
import { ExportColumnDef } from './export.service';
import {
  ExportRequest,
  ExportResult,
  ExportHeaderConfig,
  ExportHeaderColumn,
  ExportHeaderItem,
  ExportHeaderTextItem,
  ExportStyleConfig,
  ExportTypographyConfig,
  ExportFormat,
} from './export.types';
import {
  DEFAULT_EXPORT_STYLE_CONFIG,
  DEFAULT_EXPORT_HEADER_CONFIG,
  DEFAULT_EXPORT_TYPOGRAPHY_CONFIG,
} from './export-styles.config';

@Injectable({ providedIn: 'root' })
export class EnhancedExportService {

  // ─── Orquestador ─────────────────────────────────────────────────────────

  async export(req: ExportRequest): Promise<ExportResult> {
    if (!req.data.length) {
      return { success: false, format: req.format, error: 'No hay datos para exportar.' };
    }
    try {
      switch (req.format) {
        case 'csv':   return this.exportCsv(req);
        case 'json':  return this.exportJson(req);
        case 'excel': return await this.exportExcel(req);
        case 'pdf':   return await this.exportPdf(req);
        default:
          return { success: false, format: req.format, error: 'Formato no soportado.' };
      }
    } catch (err) {
      //console.error('[EnhancedExportService] Error al exportar:', err);
      const msg = err instanceof Error ? err.message : String(err) ?? 'Error desconocido';
      return { success: false, format: req.format, error: msg };
    }
  }

  // ─── CSV ─────────────────────────────────────────────────────────────────

  private exportCsv(req: ExportRequest): ExportResult {
    const { data, columns, filename } = req;
    const headers = columns.map(c => this.escapeCsv(c.header));
    const rows = data.map(row =>
      columns.map(c => this.escapeCsv(this.formatExportValue(c.key, this.getCellValue(row, c.key))))
    );
    const content = [headers, ...rows].map(r => r.join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `${filename}.csv`);
    return { success: true, format: 'csv', message: `${filename}.csv descargado.` };
  }

  // ─── JSON ──────────────────────────────────────────────────────────────────

  private exportJson(req: ExportRequest): ExportResult {
    const { data, columns, filename, docConfig } = req;
    const header = docConfig?.headerConfig;
    const rows = data.map(row =>
      Object.fromEntries(columns.map(c => [c.header, this.formatExportValue(c.key, this.getCellValue(row, c.key))]))
    );
    const payload: Record<string, unknown> = { data: rows };
    if (header?.enabled) {
      payload['meta'] = {
        title: header.title,
        subtitle: header.subtitle,
        dateRange: header.dateRange,
        generatedAt: header.showGeneratedDate !== false ? new Date().toISOString() : undefined,
        appliedFilters: header.appliedFilters,
      };
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    this.triggerDownload(blob, `${filename}.json`);
    return { success: true, format: 'json', message: `${filename}.json descargado.` };
  }

  // ─── Excel (exceljs) ─────────────────────────────────────────────────────

  /**
   * Estima el número de líneas necesarias para envolver un texto dado el ancho de celda.
   * Aproximación: suponemos ~11-13 caracteres por unidad de ancho en Excel (fuente Montserrat).
   */
  private estimateWrappedLines(text: string, cellWidthUnits: number, fontSize: number = 9): number {
    if (!text || cellWidthUnits <= 0) return 1;
    
    // Caracteres por unidad de ancho (aproximación para Montserrat a 9pt)
    const charsPerUnit = Math.max(2, 12 - (fontSize - 9) * 0.5);
    const availableChars = Math.max(1, Math.floor(cellWidthUnits * charsPerUnit));
    
    // Dividir el texto en líneas y calcular cuántas líneas se necesitan
    const lines = text.split('\n');
    let totalLines = 0;
    
    lines.forEach(line => {
      // Cada línea puede necesitar múltiples filas si es muy larga
      const wrappedLines = Math.ceil(line.length / availableChars) || 1;
      totalLines += wrappedLines;
    });
    
    return Math.max(1, totalLines);
  }

  /**
   * Renderiza el layout de header directamente en celdas Excel (sin html2canvas).
   * Interpreta cada fila del layout y las dibuja como filas/columnas en el worksheet.
   */
  private renderHeaderLayoutToExcel(
    ws: ExcelWorksheet,
    layout: ExportHeaderColumn[][] | undefined,
    startRow: number,
    columnCount: number,
    typo: Required<ExportTypographyConfig>
  ): number {
    if (!layout || layout.length === 0) return startRow;

    const titleColor = '#9D2449';
    let currentRow = startRow;

    layout.forEach((row) => {
      // Calcular la altura máxima de esta fila basada en el contenido real
      let maxRowHeight = 18; // Altura mínima en puntos Excel

      // Mergear columnas según widths y dibujar items
      let colStart = 1;
      row.forEach((col) => {
        const colWidth = col.width || 0;
        const colSpan = Math.max(1, Math.round(colWidth * columnCount));
        const colEnd = Math.min(columnCount, colStart + colSpan - 1);

        // Mergear celdas para esta columna
        if (colSpan > 1) {
          ws.mergeCells(currentRow, colStart, currentRow, colEnd);
        }

        // Recolectar texto e información de fuente
        const textParts: string[] = [];
        let maxFontSize = 9;
        let hasLargeFontSize = false;

        col.items?.forEach((item) => {
          if (item.type === 'text') {
            const textItem = item as ExportHeaderTextItem;
            textParts.push(textItem.text);
            if (textItem.fontSize) {
              if (textItem.fontSize > 10) hasLargeFontSize = true;
              maxFontSize = Math.max(maxFontSize, textItem.fontSize);
            }
          }
        });

        // Calcular altura basada en el contenido real y el ancho disponible
        if (textParts.length > 0) {
          const fullText = textParts.join('\n');
          
          // Estimar líneas envueltas
          const cellWidthUnits = (colSpan * 10); // Aproximadamente 10 unidades por columna
          const wrappedLines = this.estimateWrappedLines(fullText, cellWidthUnits, maxFontSize);
          
          // Altura = líneas * (tamaño de fuente * 1.3 para espacio entre líneas) + padding
          const lineHeight = maxFontSize * 1.3;
          const cellHeight = wrappedLines * lineHeight + 2;
          
          maxRowHeight = Math.max(maxRowHeight, cellHeight);

          const cell = ws.getCell(currentRow, colStart);
          cell.value = fullText;
          cell.alignment = {
            horizontal: (col.align || 'left') as 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed',
            vertical: 'top',
            wrapText: true,
          };

          const isTitle = textParts.some(t=> t.includes('CITAS') || t.includes('Reporte'));
          const isBold = textParts.some(t=> t.includes('Código') || t.includes('SISTEMAS'));
          
          cell.font = {
            name: typo.fontFamily || 'Montserrat',
            size: isTitle ? 13 : 9,
            bold: isBold,
            color: { argb: 'FF' + titleColor.replace('#', '') },
          };
        }

        colStart = colEnd + 1;
      });

      // Asignar la altura calculada a la fila (redondeada hacia arriba)
      ws.getRow(currentRow).height = Math.ceil(maxRowHeight);
      currentRow++;

      // Fila de espaciado entre header rows
      ws.getRow(currentRow).height = 4;
      currentRow++;
    });

    return currentRow;
  }

  private async exportExcel(req: ExportRequest): Promise<ExportResult> {
    const { data, filename, docConfig } = req;
    const columns = this.getColumnsForFormat(req, 'excel');
    const style  = { ...DEFAULT_EXPORT_STYLE_CONFIG, ...docConfig?.styleConfig };
    const header = docConfig?.headerConfig;
    const typo   = this.resolveTypography(docConfig);

    // Lazy-load exceljs para no aumentar el bundle inicial
    let ExcelJSModule: { Workbook: new () => import('exceljs').Workbook; default?: { Workbook: new () => import('exceljs').Workbook } } | undefined;
    try {
      ExcelJSModule = await import('exceljs') as unknown as typeof ExcelJSModule;
    } catch (e) {
      //console.error('[EnhancedExportService] Failed dynamic import exceljs:', e);
      // Fallback inmediato a CSV para evitar romper la experiencia en producción
      return this.exportCsv(req);
    }

    // Compatible con distintos empaquetados: preferir default si existe
    const ExcelJS = ExcelJSModule?.default ?? ExcelJSModule;

    if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
      //console.error('[EnhancedExportService] exceljs module shape unexpected:', Object.keys(ExcelJSModule || {}));
      // Si la forma del módulo no es la esperada, volver a CSV
      return this.exportCsv(req);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator    = 'QR360';
    wb.created    = new Date();

    const ws = wb.addWorksheet('Reporte', {
      pageSetup: {
        paperSize:   style.pageSize === 'Letter' ? 5 : 9,
        orientation: style.orientation ?? 'portrait',
        margins: {
          left:   this.mmToInch(style.margins?.left   ?? 15),
          right:  this.mmToInch(style.margins?.right  ?? 15),
          top:    this.mmToInch(style.margins?.top    ?? 15),
          bottom: this.mmToInch(style.margins?.bottom ?? 15),
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    let currentRow = 1;

    // ── Bloque de encabezado de reporte ──────────────────────────────────────
    if (header?.enabled) {
      // ── Prioridad 1: Layout (native cells) ────────────────────────────────
      if (header.layout && header.layout.length > 0) {
        currentRow = this.renderHeaderLayoutToExcel(ws, header.layout, currentRow, columns.length, typo);
      }
      // ── Prioridad 2: Modo HTML: capturar encabezado como imagen via html2canvas ─────────
      // ── Prioridad 2: Modo HTML: capturar encabezado como imagen via html2canvas ─────────
      else if (header.useHtml) {
        let useHtmlRendered = false;
        try {
          const html2canvasLib = await import('html2canvas');
          const h2c = html2canvasLib.default;
          const container = document.createElement('div');
          container.style.cssText =
            'position:fixed;left:-9999px;top:0;width:720px;padding:20px 20px 12px;' +
            'background:#fff;font-family:Montserrat,sans-serif;';
          container.innerHTML = this.buildHeaderHtml(header, docConfig?.styleConfig, typo);
          document.body.appendChild(container);
          const canvas = await h2c(container, { scale: 2, useCORS: true, logging: false });
          document.body.removeChild(container);
          const imgData = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
          const imgId  = wb.addImage({ base64: imgData, extension: 'png' });
          const cssH   = canvas.height / 2;
          const cssW   = canvas.width  / 2;
          const targetW = 600;
          const targetH = Math.round(cssH * (targetW / cssW));
          const rowsNeeded = Math.max(1, Math.ceil(targetH / 15));
          ws.addImage(imgId, {
            tl:  { col: 0, row: currentRow - 1 },
            ext: { width: targetW, height: targetH },
          });
          for (let ri = 0; ri < rowsNeeded; ri++) ws.getRow(currentRow + ri).height = 15;
          currentRow += rowsNeeded + 1;
          useHtmlRendered = true;
        } catch (e) {
        }

        // ── Prioridad 3: Fallback a texto si html2canvas falló ──────────────
        if (!useHtmlRendered) {
      // Logo (si aplica)
      if (header.logo) {
        try {
          const logoId = wb.addImage({ base64: header.logo, extension: 'png' });
          ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 80, height: 40 } });
          currentRow += 3;
        } catch (_) { /* ignorar si no se puede cargar el logo */ }
      }

      // Título
      const titleRow = ws.getRow(currentRow);
      ws.mergeCells(currentRow, 1, currentRow, columns.length);
      titleRow.getCell(1).value = header.title;
      titleRow.getCell(1).font  = { name: typo.fontFamily, bold: true, size: typo.sizes.reportTitle, color: { argb: 'FF' + (typo.titleColor ?? style.tableHeaderBg ?? '#9D2449').replace('#', '') } };
      titleRow.height = 22;
      currentRow++;

      // Subtítulo
      if (header.subtitle) {
        ws.mergeCells(currentRow, 1, currentRow, columns.length);
        const subRow = ws.getRow(currentRow);
        subRow.getCell(1).value = header.subtitle;
        subRow.getCell(1).font  = { name: typo.fontFamily, bold: false, size: typo.sizes.reportSubtitle, color: { argb: 'FF555555' } };
        subRow.height = 18;
        currentRow++;
      }

      // Descripción
      if (header.description) {
        ws.mergeCells(currentRow, 1, currentRow, columns.length);
        const descRow = ws.getRow(currentRow);
        descRow.getCell(1).value = header.description;
        descRow.getCell(1).font  = { name: typo.fontFamily, italic: true, size: typo.sizes.reportDescription, color: { argb: 'FF888888' } };
        descRow.height = 16;
        currentRow++;
      }

      // Metadatos (rango de fechas, fecha de generación)
      const metaParts: string[] = [];
      if (header.dateRange)            metaParts.push(`Rango: ${header.dateRange}`);
      if (header.showGeneratedDate !== false) metaParts.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
      if (metaParts.length) {
        ws.mergeCells(currentRow, 1, currentRow, columns.length);
        const metaRow = ws.getRow(currentRow);
        metaRow.getCell(1).value = metaParts.join('   |   ');
        metaRow.getCell(1).font  = { name: typo.fontFamily, size: typo.sizes.reportMeta, color: { argb: 'FF999999' } };
        metaRow.height = 14;
        currentRow++;
      }

      // Filtros aplicados
      const filters = header.appliedFilters;
      if (filters) {
        const active = Object.entries(filters).filter(([, v]) => v != null && v !== '');
        if (active.length) {
          const filterText = 'Filtros: ' + active.map(([k, v]) => `${k}: ${v}`).join(' | ');
          ws.mergeCells(currentRow, 1, currentRow, columns.length);
          const fRow = ws.getRow(currentRow);
          fRow.getCell(1).value = filterText;
          fRow.getCell(1).font  = { name: typo.fontFamily, size: typo.sizes.reportMeta, italic: true, color: { argb: 'FFAAAAAA' } };
          fRow.height = 14;
          currentRow++;
        }
      }

      // Separador en blanco
      ws.getRow(currentRow).height = 6;
      currentRow++;
        } // end !useHtmlRendered fallback
      } // end else if (header.useHtml)
    } // end if (header?.enabled)

    // ── Fila de cabeceras de tabla ────────────────────────────────────────────
    const headerFill    = 'FF' + (style.tableHeaderBg    ?? '#9D2449').replace('#', '');
    const headerTextClr = 'FF' + (style.tableHeaderColor ?? '#FFFFFF').replace('#', '');
    const borderClr     = 'FF' + (style.borderColor      ?? '#E5E7EB').replace('#', '');
    const zebraClr      = 'FF' + (style.zebraColor       ?? '#FBF0F3').replace('#', '');

    const thinBorder = (color: string): { style: 'thin'; color: { argb: string } } => ({ style: 'thin', color: { argb: color } });
    const allBorders = (color: string) => ({
      top: thinBorder(color), left: thinBorder(color),
      bottom: thinBorder(color), right: thinBorder(color),
    });

    const hdrRow = ws.getRow(currentRow);
    hdrRow.height = 20;
      columns.forEach((col, i) => {
      const cell = hdrRow.getCell(i + 1);
      cell.value = col.header;
      cell.font  = { name: typo.fontFamily, bold: typo.tableHeaderBold, size: typo.sizes.tableHeader, color: { argb: headerTextClr } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.border = allBorders(borderClr);
    });
    currentRow++;

    // ── Filas de datos ────────────────────────────────────────────────────────
    data.forEach((row, rowIdx) => {
      const dataRow = ws.getRow(currentRow);
      dataRow.height = 14;  // Altura base más compacta
      const isZebra = rowIdx % 2 === 1;
      columns.forEach((col, i) => {
        const cell  = dataRow.getCell(i + 1);
        // Support subKeys: resolve raw values and format each (dates/times)
        const rawValues = (col.subKeys && col.subKeys.length)
          ? col.subKeys.map(k => this.getCellValue(row, k)).filter(v => v !== '')
          : [this.getCellValue(row, col.key)].filter(v => v !== '');
        const values = rawValues.map((v, idx) => {
          // determine source key for formatting when subKeys present
          const sourceKey = (col.subKeys && col.subKeys.length) ? col.subKeys[idx] : col.key;
          return this.formatExportValue(sourceKey, v);
        });
        const shouldWrap = values.length > 1;
        if (values.length > 1) {
          // Rich text: cada línea con su propio tamaño configurado
          const subFontSize = typo.sizes.tableSubValue ?? typo.sizes.tableBody ?? 9;
          cell.value = {
            richText: values.map((v, vi) => ({
              font: {
                name: typo.fontFamily,
                size: vi === 0 ? (typo.sizes.tableBody ?? 10) : subFontSize,
                color: vi === 0 ? { argb: 'FF111111' } : { argb: 'FF888888' },
              },
              text: vi < values.length - 1 ? v + '\n' : v,
            })),
          } as CellRichTextValue;
        } else {
          cell.value = values[0] ?? '';
          cell.font  = { name: typo.fontFamily, size: typo.sizes.tableBody };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: shouldWrap };
        if (shouldWrap) dataRow.height = Math.max(dataRow.height as number ?? 14, values.length * 12 + 2);  // Incremento mínimo
        cell.border = allBorders(borderClr);
        if (isZebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraClr } };
        }
      });
      currentRow++;
    });

    // ── Anchos de columna ─────────────────────────────────────────────────────
    ws.columns = columns.map((col) => {
      const customW = style.columnWidths?.[col.key];
      const autoW   = Math.max(
        col.header.length,
        ...data.slice(0, 50).map(r => {
          const vals = this.getSubKeyValues(r, col);
          return Math.max(...vals.map(v => v.length));
        })
      );
      return { width: customW ?? Math.min(Math.max(autoW + 2, 10), 40) };
    });

    // ── Descargar ─────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.triggerDownload(blob, `${filename}.xlsx`);
    return { success: true, format: 'excel', message: `${filename}.xlsx descargado.` };
  }

  // ─── PDF (jspdf — rendering vectorial, sin html2canvas) ─────────────────

  private async exportPdf(req: ExportRequest): Promise<ExportResult> {
    const { data, filename, docConfig } = req;
    const columns = this.getColumnsForFormat(req, 'pdf');
    const style  = { ...DEFAULT_EXPORT_STYLE_CONFIG, ...docConfig?.styleConfig };
    const header = { ...DEFAULT_EXPORT_HEADER_CONFIG, ...docConfig?.headerConfig } as ExportHeaderConfig;
    let typo   = this.resolveTypography(docConfig);

    const { default: jsPDF } = await import('jspdf');

    const isLandscape = style.orientation === 'landscape';
    const pageW  = isLandscape ? 297 : 210;
    const pageH  = isLandscape ? 210 : 297;
    const margin = style.margins?.left ?? 15;
    const tableW = pageW - margin * 2;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit:   'mm',
      format: style.pageSize?.toLowerCase() ?? 'a4',
    });

    // ── Registrar Montserrat si está disponible en assets ─────────────────
    const pdfFont = await this.tryRegisterMontserrat(doc, typo.fontFamily);
    // Sobreescribir fontFamily con la fuente efectivamente registrada
    typo = { ...typo, fontFamily: pdfFont };

    // ── Helpers de color hex → [r,g,b] ────────────────────────────────────
    const hexRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      const full = h.length === 3
        ? h.split('').map(c => c + c).join('')
        : h;
      return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
      ];
    };

    // ── Tamaños de fuente en pt (los configs vienen en px, 1px ≈ 0.75pt) ──
    const px2pt = (px: number | undefined, fallback: number) =>
      Math.round((px ?? fallback) * 0.75 * 10) / 10;

    const bodyPt    = px2pt(typo.sizes.tableBody,    10);
    const subPt     = px2pt(typo.sizes.tableSubValue, 8);
    const hdrPt     = px2pt(typo.sizes.tableHeader,  10);
    const titlePt   = px2pt(typo.sizes.reportTitle,  14);
    const subtitlePt = px2pt(typo.sizes.reportSubtitle, 10);
    const descPt    = px2pt(typo.sizes.reportDescription, 9);
    const metaPt    = px2pt(typo.sizes.reportMeta,    8);

    // ── Alturas de fila derivadas del tamaño de fuente ─────────────────────
    const LINE_H   = bodyPt * 0.45;   // mm por línea (≈ 1.4 interlineado)
    const CELL_PAD = 1.5;             // mm padding vertical por lado
    const ROW_H    = LINE_H + CELL_PAD * 2;          // fila sin subvalor
    const ROW_H2   = ROW_H + subPt * 0.45 + 1;       // fila con subvalor (2 líneas)
    const THEAD_H  = hdrPt * 0.45 + CELL_PAD * 2;

    // Detectar si alguna columna tiene subKeys (para ROW_H fijo)
    const hasSubKeys = columns.some(c => c.subKeys && c.subKeys.length > 0);
    const effectiveRowH = hasSubKeys ? ROW_H2 : ROW_H;

    // ── Calcular anchos de columna proporcionales ─────────────────────────
    // Cada columna puede tener un minWidth definido en ExportColumnDef
    const AUTO_CHAR_W = bodyPt * 0.5;   // mm por carácter aproximado
    const colRawW = columns.map(col => {
      const headerLen = col.header.length;
      const dataLen = data.slice(0, 30).reduce((mx, row) => {
        const vals = this.getSubKeyValues(row, col);
        return Math.max(mx, ...vals.map(v => v.length));
      }, 0);
      return Math.max(headerLen, dataLen) * AUTO_CHAR_W;
    });
    
    // Aplicar minWidth si está definido en ExportColumnDef; sino usar automático
    const colWidthsBeforeScale = colRawW.map((w, i) => {
      const minW = columns[i].minWidth;
      return minW != null ? Math.max(minW, w) : w;
    });
    
    // Escalar si la suma excede tableW
    const totalBeforeScale = colWidthsBeforeScale.reduce((s, w) => s + w, 0);
    const colWidths = totalBeforeScale > tableW
      ? colWidthsBeforeScale.map(w => (w / totalBeforeScale) * tableW)
      : colWidthsBeforeScale;

    // ── Calcular espacio disponible y número de filas por página ──────────
    const footerH = 8;   // mm reservados al pie
    const usableH = pageH - margin * 2 - footerH;

    // Calcular altura del bloque de encabezado del reporte (primera página)
    let reportHeaderH = 0;
    if (header?.enabled) {
      if (header.layout) {
        // Sumar la altura de todas las filas del layout
        reportHeaderH = header.layout.reduce((totalH: number, row: ExportHeaderColumn[]) => {
          const rowH = row.reduce((maxH: number, col: ExportHeaderColumn) => {
            const colH = col.items.reduce((sum: number, item: ExportHeaderItem) => {
              if (item.type === 'text') return sum + (item.fontSize ?? 10) * 0.45 + 2;
              if (item.type === 'image') return sum + (item.height ?? 12) + 3;
              if (item.type === 'spacer') return sum + item.height;
              return sum;
            }, 0);
            return Math.max(maxH, colH);
          }, 0);
          return totalH + rowH + 2; // +2mm entre filas
        }, 0) + 6; // +6 separador
      } else {
        if (header.logo)        reportHeaderH += 14;
        reportHeaderH += titlePt * 0.45 + 3;
        if (header.subtitle)    reportHeaderH += subtitlePt * 0.45 + 2;
        if (header.description) reportHeaderH += descPt * 0.45 + 2;
        const hasMeta = header.dateRange || header.showGeneratedDate !== false;
        if (hasMeta) reportHeaderH += metaPt * 0.45 + 2;
        const hasFilters = header.appliedFilters &&
          Object.values(header.appliedFilters).some(v => v != null && v !== '');
        if (hasFilters) reportHeaderH += metaPt * 0.45 + 2;
        reportHeaderH += 6; // separador
      }
    }

    const maxRowsFirstPage  = Math.max(1, Math.floor((usableH - reportHeaderH - THEAD_H) / effectiveRowH));
    // Si el encabezado se muestra en todas las páginas, descontar su altura también en páginas siguientes
    const maxRowsOtherPages = (header?.enabled && header?.headerOnPages === 'all')
      ? Math.max(1, Math.floor((usableH - reportHeaderH - THEAD_H) / effectiveRowH))
      : Math.max(1, Math.floor((usableH - THEAD_H) / effectiveRowH));

    // ── Calcular total de páginas (para el pie) ────────────────────────────
    let totalPages = 0;
    {
      let remaining = data.length;
      remaining -= maxRowsFirstPage;
      totalPages++;
      while (remaining > 0) {
        remaining -= maxRowsOtherPages;
        totalPages++;
      }
      if (data.length === 0) totalPages = 1;
    }

    // ── Colores ────────────────────────────────────────────────────────────
    const hdrBgRgb    = hexRgb(style.tableHeaderBg    ?? '#9D2449');
    const hdrTextRgb  = hexRgb(style.tableHeaderColor ?? '#FFFFFF');
    const zebraRgb    = hexRgb(style.zebraColor       ?? '#FBF0F3');
    const borderRgb   = hexRgb(style.borderColor      ?? '#E5E7EB');
    const titleRgb    = hexRgb(typo.titleColor        ?? style.tableHeaderBg ?? '#9D2449');
    const subValRgb   = hexRgb(typo.subValueColor     ?? '#999999');

    // ── Dibujar página ─────────────────────────────────────────────────────
    const drawPage = (pageNum: number, rowSlice: Record<string, unknown>[]): void => {
      let curY = margin;

      // ── Bloque encabezado del reporte (pág. 1 o todas según headerOnPages) ──────────
      if (header?.enabled && (pageNum === 1 || header.headerOnPages === 'all')) {

        // ── Layout declarativo de columnas (sin html2canvas) ──────────────
        if (header.layout) {
          curY = this.drawHeaderLayout(doc, header.layout, margin, tableW, curY, borderRgb, typo);
        } else {
          // ── Renderizado clásico ─────────────────────────────────────────
          if (header.logo) {
            try {
              doc.addImage(header.logo, 'PNG', margin, curY, 24, 12);
            } catch { /* ignorar logo si falla */ }
            curY += 14;
          }

          // Título
          if (header.useHtml) {
            this.drawHtmlLine(doc, header.title ?? '', margin, curY, titlePt, titleRgb, tableW, typo);
          } else {
            doc.setFontSize(titlePt);
            doc.setTextColor(...titleRgb);
            doc.setFont(typo.fontFamily || 'helvetica', 'bold');
            doc.text(header.title ?? '', margin, curY);
          }
          curY += titlePt * 0.45 + 2;

          // Subtítulo
          if (header.subtitle) {
            if (header.useHtml) {
              this.drawHtmlLine(doc, header.subtitle, margin, curY, subtitlePt, [60, 60, 60], tableW, typo);
            } else {
              doc.setFontSize(subtitlePt);
              doc.setTextColor(60, 60, 60);
              doc.setFont(typo.fontFamily || 'helvetica', 'normal');
              doc.text(header.subtitle, margin, curY);
            }
            curY += subtitlePt * 0.45 + 2;
          }

          // Descripción
          if (header.description) {
            if (header.useHtml) {
              this.drawHtmlLine(doc, header.description, margin, curY, descPt, [120, 120, 120], tableW, typo);
            } else {
              doc.setFontSize(descPt);
              doc.setTextColor(120, 120, 120);
              doc.setFont(typo.fontFamily || 'helvetica', 'italic');
              doc.text(header.description, margin, curY);
            }
            curY += descPt * 0.45 + 2;
            doc.setFont(typo.fontFamily || 'helvetica', 'normal');
          }

          // Meta (rango + fecha generación)
          const metaPartsClassic: string[] = [];
          if (header.dateRange) metaPartsClassic.push(`Rango: ${header.dateRange}`);
          if (header.showGeneratedDate !== false) metaPartsClassic.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
          if (metaPartsClassic.length) {
            doc.setFontSize(metaPt);
            doc.setTextColor(150, 150, 150);
            doc.text(metaPartsClassic.join('   ·   '), margin, curY);
            curY += metaPt * 0.45 + 2;
          }

          // Filtros activos
          const filtersClassic = header.appliedFilters;
          if (filtersClassic) {
            const active = Object.entries(filtersClassic).filter(([, v]) => v != null && v !== '');
            if (active.length) {
              doc.setFontSize(metaPt);
              doc.setTextColor(160, 160, 160);
              doc.text('Filtros: ' + active.map(([k, v]) => `${k}: ${v}`).join(' | '), margin, curY);
              curY += metaPt * 0.45 + 2;
            }
          }
        } // fin renderizado clásico

        // ── Meta y filtros comunes (también aplica al layout) ──────────────
        const metaParts: string[] = [];
        if (header.layout) {
          if (header.dateRange) metaParts.push(`Rango: ${header.dateRange}`);
          if (header.showGeneratedDate !== false) metaParts.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
          if (metaParts.length) {
            doc.setFontSize(metaPt);
            doc.setTextColor(150, 150, 150);
            doc.setFont(typo.fontFamily || 'helvetica', 'normal');
            doc.text(metaParts.join('   ·   '), margin, curY);
            curY += metaPt * 0.45 + 2;
          }
          const filters = header.appliedFilters;
          if (filters) {
            const active = Object.entries(filters).filter(([, v]) => v != null && v !== '');
            if (active.length) {
              doc.setFontSize(metaPt);
              doc.setTextColor(160, 160, 160);
              doc.text('Filtros: ' + active.map(([k, v]) => `${k}: ${v}`).join(' | '), margin, curY);
              curY += metaPt * 0.45 + 2;
            }
          }
        }

        // Separador
        doc.setDrawColor(...borderRgb);
        doc.setLineWidth(0.5);
        doc.line(margin, curY, margin + tableW, curY);
        curY += 4;
      }

      // ── Encabezados de tabla ──────────────────────────────────────────
      let x = margin;
      doc.setFillColor(...hdrBgRgb);
      doc.setTextColor(...hdrTextRgb);
      doc.setFontSize(hdrPt);
      doc.setFont(typo.fontFamily || 'helvetica', 'bold');

      columns.forEach((col, ci) => {
        const w = colWidths[ci];
        doc.setFillColor(...hdrBgRgb);
        doc.setDrawColor(...borderRgb);
        doc.setLineWidth(0.2);
        doc.rect(x, curY, w, THEAD_H, 'FD');
        doc.setTextColor(...hdrTextRgb);
        const textY = curY + THEAD_H / 2 + hdrPt * 0.18;
        doc.text(col.header, x + 1.5, textY, { maxWidth: w - 3 });
        x += w;
      });
      curY += THEAD_H;

      // ── Filas de datos ────────────────────────────────────────────────
      doc.setFont(typo.fontFamily || 'helvetica', 'normal');
      rowSlice.forEach((row, relIdx) => {
        const isZebra = relIdx % 2 === 1;
        x = margin;

        columns.forEach((col, ci) => {
          const w = colWidths[ci];
          const rawValues = (col.subKeys && col.subKeys.length)
            ? col.subKeys.map(k => this.getCellValue(row, k)).filter(v => v !== '')
            : [this.getCellValue(row, col.key)].filter(v => v !== '');
          const values = rawValues.map((v, idxVal) => {
            const sourceKey = (col.subKeys && col.subKeys.length) ? col.subKeys[idxVal] : col.key;
            return this.formatExportValue(sourceKey, v);
          });

          // Fondo
          if (isZebra) {
            doc.setFillColor(...zebraRgb);
            doc.setDrawColor(...borderRgb);
            doc.setLineWidth(0.2);
            doc.rect(x, curY, w, effectiveRowH, 'FD');
          } else {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...borderRgb);
            doc.setLineWidth(0.2);
            doc.rect(x, curY, w, effectiveRowH, 'FD');
          }

          // Texto principal
          doc.setFontSize(bodyPt);
          doc.setTextColor(30, 30, 30);
          const mainY = curY + CELL_PAD + bodyPt * 0.35;
          doc.text(values[0] ?? '', x + 1.5, mainY, { maxWidth: w - 3 });

          // Sub-valor (segunda línea)
          if (values.length > 1) {
            doc.setFontSize(subPt);
            doc.setTextColor(...subValRgb);
            const subY = mainY + LINE_H + 0.8;
            doc.text(values.slice(1).join(' · '), x + 1.5, subY, { maxWidth: w - 3 });
          }

          x += w;
        });

        curY += effectiveRowH;
      });

      // ── Pie de página ─────────────────────────────────────────────────
      const footerText = `Página ${pageNum} de ${totalPages}`;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      const tw = doc.getTextWidth(footerText);
      doc.text(footerText, (pageW - tw) / 2, pageH - margin / 2);
    };

    // ── Paginar y renderizar ───────────────────────────────────────────────
    let rowStart = 0;
    let pageNum  = 1;

    while (rowStart < data.length || pageNum === 1) {
      const maxRows = pageNum === 1 ? maxRowsFirstPage : maxRowsOtherPages;
      const rowEnd  = Math.min(rowStart + maxRows, data.length);
      const rowSlice = data.slice(rowStart, rowEnd);

      if (pageNum > 1) doc.addPage();
      drawPage(pageNum, rowSlice);

      rowStart = rowEnd;
      pageNum++;
      if (rowStart >= data.length) break;
    }

    doc.save(`${filename}.pdf`);
    return { success: true, format: 'pdf', message: `${filename}.pdf descargado.` };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Intenta registrar Montserrat en jsPDF cargando los archivos TTF/WOFF desde assets.
   * Si los archivos no existen, devuelve 'helvetica' como fallback.
   */
  private async tryRegisterMontserrat(doc: jsPDF, requestedFont: string): Promise<string> {
    const fontName = requestedFont || 'helvetica';
    if (fontName.toLowerCase() !== 'montserrat') return fontName;

    try {
      const toBase64 = async (url: string): Promise<string> => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
      };

      const [regularB64, boldB64] = await Promise.all([
        toBase64('/assets/fonts/Montserrat-Regular.ttf'),
        toBase64('/assets/fonts/Montserrat-Bold.ttf'),
      ]);

      doc.addFileToVFS('Montserrat-Regular.ttf', regularB64);
      doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');

      doc.addFileToVFS('Montserrat-Bold.ttf', boldB64);
      doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');

      return 'Montserrat';
    } catch {
      return 'helvetica';
    }
  }

  // ── HTML rendering helpers ─────────────────────────────────────────

  /**
   * Dibuja un layout declarativo de columnas en jsPDF sin html2canvas.
   * @returns El nuevo curY tras dibujar todas las columnas (máximo de todas).
   */
  /**
   * Dibuja un layout declarativo de filas+columnas en jsPDF.
   * Cada fila es un ExportHeaderColumn[]; las filas se apilan verticalmente.
   * @returns El nuevo curY tras dibujar todas las filas.
   */
  private drawHeaderLayout(
    doc: jsPDF,
    rows: ExportHeaderColumn[][],
    margin: number,
    tableW: number,
    startY: number,
    borderRgb: [number, number, number],
    typo: Required<ExportTypographyConfig>
  ): number {
    const hexRgbLocal = (hex: string): [number, number, number] => {
      const h = (hex ?? '#000000').replace('#', '');
      const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      return [parseInt(f.slice(0,2),16), parseInt(f.slice(2,4),16), parseInt(f.slice(4,6),16)];
    };

    const calculateItemHeight = (item: ExportHeaderItem, colW: number): number => {
      if (item.type === 'spacer') return item.height;
      if (item.type === 'image') return (item.height ?? 12) + 2;
      if (item.type === 'text') {
        const fontSize = item.fontSize ?? 10;
        const lineH = fontSize * 0.35;
        const lines = doc.splitTextToSize(item.text, colW - 2);
        return lines.length * lineH + 0.3;
      }
      return 0;
    };

    /** Dibuja una sola fila de columnas y devuelve el Y final de esa fila. */
    const drawRow = (columns: ExportHeaderColumn[], rowStartY: number): number => {
      const totalFraction = columns.reduce((s, c) => s + (c.width ?? (1 / columns.length)), 0);
      const colWidthsMm = columns.map(c => ((c.width ?? (1 / columns.length)) / totalFraction) * tableW);

      const colHeights = columns.map((col, ci) => {
        let h = 0;
        for (const item of col.items) h += calculateItemHeight(item, colWidthsMm[ci]);
        return h;
      });

      const maxRowHeight = Math.max(...colHeights);
      let colStartX = margin;

      columns.forEach((col, ci) => {
        const colW   = colWidthsMm[ci];
        const colH   = colHeights[ci];
        const valign = col.valign ?? 'top';

        let colStartY = rowStartY;
        if (valign === 'center') colStartY = rowStartY + (maxRowHeight - colH) / 2;
        else if (valign === 'bottom') colStartY = rowStartY + (maxRowHeight - colH);

        let curY  = colStartY;
        const align = col.align ?? 'left';

        for (const item of col.items) {
          if (item.type === 'spacer') { curY += item.height; continue; }

          if (item.type === 'image') {
            const imgW = item.width ?? 24;
            const imgH = item.height ?? 12;
            const offsetY = item.offsetY ?? 0;
            const imgX = align === 'right'  ? colStartX + colW - imgW :
                         align === 'center' ? colStartX + (colW - imgW) / 2 :
                         colStartX;
            try {
              const fmt = item.src.toLowerCase().includes('jpeg') || item.src.toLowerCase().includes('jpg') ? 'JPEG' : 'PNG';
              doc.addImage(item.src, fmt, imgX, curY + offsetY, imgW, imgH);
            } catch { /* ignorar si no carga */ }
            curY += imgH + 2;
            continue;
          }

          if (item.type === 'text') {
            const fontSize = item.fontSize ?? 10;
            const style = item.bold && item.italic ? 'bolditalic' : item.bold ? 'bold' : item.italic ? 'italic' : 'normal';
            const rgb = item.color ? hexRgbLocal(item.color) : [30, 30, 30] as [number, number, number];
            doc.setFontSize(fontSize);
            doc.setFont(typo.fontFamily || 'helvetica', style);
            doc.setTextColor(...rgb);
            const lineH  = fontSize * 0.35;
            const lines: string[] = doc.splitTextToSize(item.text, colW - 2);
            lines.forEach((line: string) => {
              const textW = doc.getTextWidth(line);
              const textX = align === 'right'  ? colStartX + colW - textW - 1 :
                            align === 'center' ? colStartX + (colW - textW) / 2 :
                            colStartX + 1;
              doc.text(line, textX, curY);
              curY += lineH;
            });
            curY += 0.3;
          }
        }

        colStartX += colW;
      });

      return rowStartY + maxRowHeight;
    };

    // Dibujar todas las filas secuencialmente
    let curY = startY;
    for (const row of rows) {
      curY = drawRow(row, curY) + 2; // +2mm entre filas
    }

    doc.setFont(typo.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    return curY + 1; // +1mm antes del separador
  }

  /** Elimina etiquetas HTML de una cadena. */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Tokeniza HTML inline limitado (<b>, <strong>, <i>, <em>, <span style="color:...">) en
   * segmentos decorados. Sólo etiquetas de nivel de carácter; bloques ignorados.
   */
  private parseHtmlSegments(html: string): Array<{
    text: string;
    bold: boolean;
    italic: boolean;
    color?: [number, number, number];
  }> {
    const segments: Array<{
      text: string;
      bold: boolean;
      italic: boolean;
      color?: [number, number, number];
    }> = [];
    const tokens = html.split(/(<[^>]+>)/g);
    let bold = false;
    let italic = false;
    let color: [number, number, number] | undefined = undefined;
    const colorStack: ([number, number, number] | undefined)[] = [];

    for (const token of tokens) {
      if (!token) continue;
      if (token.startsWith('<')) {
        const tag = token.toLowerCase().trim();
        if (/^<(b|strong)(\s|>)/.test(tag))          { bold = true; }
        else if (/^<\/(b|strong)>/.test(tag))        { bold = false; }
        else if (/^<(i|em)(\s|>)/.test(tag))         { italic = true; }
        else if (/^<\/(i|em)>/.test(tag))            { italic = false; }
        else if (/^<span(\s|>)/.test(tag)) {
          colorStack.push(color);
          const m = token.match(/color\s*:\s*([#\w()%,.\s]+)/i);
          if (m) {
            const raw = m[1].trim().replace('#', '');
            const full = raw.length === 3
              ? raw.split('').map(c => c + c).join('')
              : raw;
            if (/^[0-9a-fA-F]{6}$/.test(full)) {
              color = [
                parseInt(full.slice(0, 2), 16),
                parseInt(full.slice(2, 4), 16),
                parseInt(full.slice(4, 6), 16),
              ];
            }
          }
        }
        else if (/^<\/span>/.test(tag)) {
          color = colorStack.pop();
        }
        // demás etiquetas ignoradas
      } else {
        const text = token
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ');
        if (text) segments.push({ text, bold, italic, color });
      }
    }
    return segments;
  }

  /**
   * Dibuja una línea de texto HTML inline en jsPDF y restaura el estado del doc.
   * @param doc        Instancia jsPDF
   * @param html       Cadena con HTML inline limitado
   * @param x          Posición X inicial en mm
   * @param y          Posición Y en mm
   * @param fontSize   Tamaño de fuente en pt
   * @param defaultRgb Color RGB por defecto [r,g,b]
   * @param maxWidth   Ancho máximo disponible en mm
   */
  private drawHtmlLine(
    doc: jsPDF,
    html: string,
    x: number,
    y: number,
    fontSize: number,
    defaultRgb: [number, number, number],
    maxWidth: number,
    typo: Required<ExportTypographyConfig>
  ): void {
    const segments = this.parseHtmlSegments(html);
    let curX = x;
    doc.setFontSize(fontSize);
    for (const seg of segments) {
      const style =
        seg.bold && seg.italic ? 'bolditalic' :
        seg.bold               ? 'bold'       :
        seg.italic             ? 'italic'     :
                                 'normal';
      doc.setFont(typo.fontFamily || 'helvetica', style);
      doc.setTextColor(...(seg.color ?? defaultRgb));
      const remaining = maxWidth - (curX - x);
      if (remaining <= 0) break;
      doc.text(seg.text, curX, y, { maxWidth: remaining });
      curX += doc.getTextWidth(seg.text);
    }
    // Restaurar estado
    doc.setFont(typo.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(...defaultRgb);
  }

  /**
   * Escapa caracteres especiales HTML para prevenir inyección XSS.
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (c) => map[c]);
  }

  /**
   * Construye el HTML del bloque de encabezado para la captura con html2canvas (Excel).
   */
  private buildHeaderHtml(
    header: ExportHeaderConfig,
    styleConfig: ExportStyleConfig | undefined,
    typo: Required<ExportTypographyConfig>
  ): string {
    const titleColor = typo.titleColor ?? styleConfig?.tableHeaderBg ?? '#9D2449';
    const ff = typo.fontFamily ?? 'Montserrat';
    const parts: string[] = [];

    // Si el título incluye el placeholder __LOGO__, sustituirlo inline por la imagen
    let titleHtml = this.escapeHtml(header.title ?? '');
    if (titleHtml && titleHtml.indexOf('__LOGO__') !== -1) {
      const imgTag = header.logo ? `<img src="${this.escapeHtml(header.logo)}" style="height:40px;display:block;" />` : '';
      titleHtml = titleHtml.replace(/__LOGO__/g, imgTag);
    } else {
      // Si no hay placeholder, mantener el comportamiento previo y colocar logo encima
      if (header.logo) {
        parts.push(`<img src="${this.escapeHtml(header.logo)}" style="height:40px;margin-bottom:8px;display:block;" />`);
      }
    }

    parts.push(
      `<div style="font-size:${typo.sizes.reportTitle}pt;font-weight:bold;` +
      `color:${titleColor};font-family:${ff};margin-bottom:4px;">${titleHtml}</div>`
    );
    if (header.subtitle) {
      parts.push(
        `<div style="font-size:${typo.sizes.reportSubtitle}pt;color:#555;` +
        `font-family:${ff};margin-bottom:3px;">${this.escapeHtml(header.subtitle)}</div>`
      );
    }
    if (header.description) {
      parts.push(
        `<div style="font-size:${typo.sizes.reportDescription}pt;color:#888;font-style:italic;` +
        `font-family:${ff};margin-bottom:3px;">${this.escapeHtml(header.description)}</div>`
      );
    }
    const metaParts: string[] = [];
    if (header.dateRange) metaParts.push(`Rango: ${this.escapeHtml(header.dateRange)}`);
    if (header.showGeneratedDate !== false)
      metaParts.push(`Generado: ${new Date().toLocaleString('es-MX')}`);
    if (metaParts.length) {
      parts.push(
        `<div style="font-size:${typo.sizes.reportMeta}pt;color:#999;` +
        `font-family:${ff};margin-bottom:2px;">${metaParts.join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</div>`
      );
    }
    const filters = header.appliedFilters;
    if (filters) {
      const active = Object.entries(filters).filter(([, v]) => v != null && v !== '');
      if (active.length) {
        const txt = 'Filtros: ' + active.map(([k, v]) => `${this.escapeHtml(String(k))}: ${this.escapeHtml(String(v))}`).join(' | ');
        parts.push(
          `<div style="font-size:${typo.sizes.reportMeta}pt;color:#aaa;font-style:italic;` +
          `font-family:${ff};">${txt}</div>`
        );
      }
    }
    return parts.join('\n');
  }

  // ── Typography / data helpers ──────────────────────────────────────────

  /**
   * Resuelve la configuración tipográfica fusionando los defaults con los overrides
   * definidos en `docConfig.typographyConfig`. Siempre devuelve un objeto completo.
   */
  private resolveTypography(docConfig?: { typographyConfig?: ExportTypographyConfig }): Required<ExportTypographyConfig> {
    const def = DEFAULT_EXPORT_TYPOGRAPHY_CONFIG;
    const ov  = docConfig?.typographyConfig ?? {};
    return {
      fontFamily:      ov.fontFamily      ?? def.fontFamily,
      tableHeaderBold: ov.tableHeaderBold ?? def.tableHeaderBold,
      titleColor:      ov.titleColor      ?? def.titleColor,
      subValueColor:   ov.subValueColor   ?? def.subValueColor,
      sizes: { ...def.sizes, ...ov.sizes },
    };
  }

  /**
   * Formatea valores para exportación: fechas -> dd/mm/yyyy, horas -> HH:mm.
   * Para datetimes devuelve `dd/mm/yyyy HH:mm`.
   */
  private formatExportValue(key: string, raw: string): string {
    if (raw == null) return '';
    const s = String(raw).trim();
    if (!s) return '';

    // Preserve values already prepared by the app (keys starting with '_')
    if (key && key.startsWith('_')) return s;

    // Normalize name fields to Title Case (ej: "juan pérez" -> "Juan Pérez")
    const keyLower = (key ?? '').toLowerCase();
    const nameKeyRe = /(\bname\b|\bnombre\b|customername|fullname|firstName|lastName)/i;
    if (nameKeyRe.test(keyLower)) {
      return s
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : '')
        .join(' ');
    }

    // Phone number formatting: normalize to groups (e.g. "123 456 7890")
    const phoneKeyRe = /(phone|telefono|tel|mobile|cel|cell|whatsapp)/i;
    if (phoneKeyRe.test(keyLower)) {
      const digits = s.replace(/\D/g, '');
      if (digits.length === 10) {
        return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
      }
      if (digits.length === 11 && digits.startsWith('1')) {
        return `${digits[0]} ${digits.slice(1,4)} ${digits.slice(4,7)} ${digits.slice(7)}`;
      }
      if (digits.length === 7) {
        return `${digits.slice(0,3)} ${digits.slice(3)}`;
      }
      // Fallback: if contains plus and country code, keep as-is but ensure spacing
      if (/^\+/.test(s)) {
        const rest = s.replace(/[^+\d]/g, '');
        // naive split after country code (1-3 digits)
        const m = rest.match(/^(\+\d{1,3})(\d{3,})(\d{3,})$/);
        if (m) return `${m[1]} ${m[2]} ${m[3]}`;
      }
      return s;
    }

    // Time-only like "14:30" or "9:05:00"
    const timeOnly = /^\d{1,2}:\d{2}(:\d{2})?$/;
    if (timeOnly.test(s)) {
      const parts = s.split(':');
      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      return `${hh}:${mm}`;
    }

    // Try parse as date/time
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      // If original contains time component, include time
      // Determine if column name implies date-only or time-only
      const keyLower = (key ?? '').toLowerCase();
      const dateKeyRe = /(date|fecha|day)/;
      const timeKeyRe = /(time|hora|hour|min|scheduled)/;
      const isDateKey = dateKeyRe.test(keyLower);
      const isTimeKey = timeKeyRe.test(keyLower);

      // If key indicates date-only, return only date
      if (isDateKey && !isTimeKey) return `${day}/${month}/${year}`;
      // If key indicates time-only, return only time
      if (isTimeKey && !isDateKey) return `${hh}:${mm}`;

      // Fallback: include time if original had a time component
      const hasTimeComponent = /\d{1,2}:\d{2}/.test(s) || s.includes('T');
      if (hasTimeComponent) return `${day}/${month}/${year} ${hh}:${mm}`;
      return `${day}/${month}/${year}`;
    }

    return s;
  }

  /**
   * Returns the columns to use for a specific format.
   * If `req.columnsByFormat[format]` is defined, it takes priority over `req.columns`.
   */
  private getColumnsForFormat(req: ExportRequest, format: ExportFormat): ExportColumnDef[] {
    return req.columnsByFormat?.[format] ?? req.columns;
  }

  /**
   * Returns an array of string values for a cell.
   * If `col.subKeys` is defined, resolves each key separately.
   * Otherwise returns single value from `col.key`.
   */
  private getSubKeyValues(row: Record<string, unknown>, col: ExportColumnDef): string[] {
    if (col.subKeys && col.subKeys.length > 0) {
      return col.subKeys.map(k => this.getCellValue(row, k)).filter(v => v !== '');
    }
    return [this.getCellValue(row, col.key)].filter(v => v !== '');
  }

  private getCellValue(row: Record<string, unknown>, key: string): string {
    if (!key || row == null) return '';
    const val = key.split('.').reduce((obj: Record<string, unknown> | unknown, k) => (obj as Record<string, unknown>)?.[k], row as unknown);
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

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** mm → pulgadas para exceljs */
  private mmToInch(mm: number): number {
    return Math.round((mm / 25.4) * 100) / 100;
  }
}
