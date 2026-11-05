# Table (InstitutionalTableComponent) · Guía de uso

## Propósito
Renderizar datos tabulares con ordenamiento, selección, expansión y configuración de columnas para vistas administrativas.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Requieres comparar múltiples registros en formato de columnas.
- Necesitas sort, selección en lote o columnas sticky.

### ❌ No usar cuando
- El contenido no es naturalmente tabular (preferir lista o cards).
- Solo mostrarás 1–2 campos y pocas filas (UI más simple suele ser mejor).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `data` | `unknown[]` | `[]` | No | Datos a renderizar en filas. |
| `columns` | `TableColumn[]` | `[]` | No | Definición de columnas. |
| `config` | `TableConfig` | `{}` | No | Comportamiento visual/funcional. |
| `selectedItems` | `unknown[]` | `[]` | No | Selección externa controlada. |
| `expandedItems` | `unknown[]` | `[]` | No | Filas expandidas controladas. |
| `sortColumn` | `string \| null` | `''` | No | Columna activa de orden. |
| `sortDirection` | `'asc' \| 'desc' \| null` | `null` | No | Dirección de orden actual. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `sort` | `EventEmitter<SortEvent>` | Al cambiar criterio de orden. |
| `selectionChange` | `EventEmitter<SelectionEvent>` | Al seleccionar/deseleccionar filas. |
| `rowClick` | `EventEmitter<{ item: unknown; index: number }>` | Al hacer clic en una fila. |
| `expandToggle` | `EventEmitter<{ item: unknown; expanded: boolean }>` | Al expandir/colapsar fila. |

## Estados soportados
- **default**
- **loading** (`config.loading`)
- **empty** (sin datos)
- **sortable / selectable / expandable**
- **sticky header / sticky columns**

## Migración (APIs legacy)
| API legacy | Estado | Reemplazo recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| Orden remoto implícito sin declarar estrategia | Soportado (transicional) | Declarar `config.localSort` explícitamente | Pendiente por definir |

## Ejemplos
### Ejemplo mínimo
```html
<app-institutional-table
  [data]="rows"
  [columns]="columns"
  [config]="{ hoverable: true }">
</app-institutional-table>
```

### Ejemplo avanzado
```html
<app-institutional-table
  [data]="rows"
  [columns]="columns"
  [config]="{ selectable: true, stickyHeader: true, localSort: true }"
  [selectedItems]="selected"
  [sortColumn]="sort.column"
  [sortDirection]="sort.direction"
  (sort)="onSort($event)"
  (selectionChange)="onSelectionChange($event)"
  (rowClick)="onRowClick($event)">
</app-institutional-table>
```

## Notas de accesibilidad (a11y)
- Mantener estructura semántica `table > thead/tbody`.
- Checkbox de selección debe tener contexto accesible por fila/encabezado.
- Asegurar foco visible en controles interactivos dentro de celdas.

## Notas de i18n
- [ ] Encabezados y estado vacío soportan expansión de texto.
- [ ] Labels de columna se traducen desde catálogo.
- [ ] Celdas truncadas ofrecen alternativa accesible (tooltip/detalle).
