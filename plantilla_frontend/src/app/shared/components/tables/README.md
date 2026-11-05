# Table (InstitutionalTableComponent) · Guía de uso

## Propósito
Renderizar datos tabulares con configuración tipada de columnas, selección, ordenamiento, paginación y acciones reutilizables.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Debes mostrar colecciones de datos con estructura de columnas.
- Requieres capacidades de tabla reutilizables (sort, selección, paginación, filtros y exportación).

### ❌ No usar cuando
- Presentas listas cortas o tarjetas sin relación tabular (preferir `list/cards`).
- El contenido es puramente comparativo visual sin semántica de tabla (preferir layout custom).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `data` | `unknown[]` | `[]` | No | Filas a renderizar. |
| `columns` | `TableColumn[]` | `[]` | No | Definición tipada de columnas. |
| `config` | `TableConfig` | `defaultConfig` | No | Configuración visual/funcional de la tabla. |
| `selectedItems` | `unknown[]` | `[]` | No | Elementos seleccionados externamente. |
| `sortColumn` | `string \| null` | `null` | No | Columna activa de ordenamiento. |
| `sortDirection` | `'asc' \| 'desc' \| null` | `null` | No | Dirección de ordenamiento activa. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `sort` | `EventEmitter<{ column: string; direction: 'asc' \| 'desc' }>` | Al cambiar ordenamiento. |
| `selectionChange` | `EventEmitter<unknown[]>` | Al seleccionar/deseleccionar filas. |
| `rowClick` | `EventEmitter<unknown>` | Al hacer click en una fila. |

## Estados soportados
- **default**
- **hover/active** (filas/acciones)
- **loading** (mientras se resuelven datos)
- **empty** (sin resultados)
- **disabled** (acciones bloqueadas cuando aplique)

## Notas de accesibilidad (a11y)
- Mantener semántica de tabla (`table`, `thead`, `tbody`, `th`, `td`).
- Encabezados deben describir claramente cada columna.
- Asegurar foco/teclado en acciones por fila y controles auxiliares.

## Ejemplos
### Ejemplo mínimo
```html
<app-institutional-table
  [data]="tableData"
  [columns]="tableColumns"
  (rowClick)="onRowClick($event)">
</app-institutional-table>
```

### Ejemplo avanzado
```html
<app-institutional-table
  [data]="tableData"
  [columns]="tableColumns"
  [config]="tableConfig"
  [selectedItems]="selectedItems"
  [sortColumn]="sortColumn"
  [sortDirection]="sortDirection"
  (sort)="onSort($event)"
  (selectionChange)="onSelectionChange($event)"
  (rowClick)="onRowClick($event)">
  <ng-template #actions let-item="$implicit">
    <button (click)="editItem(item)">Editar</button>
  </ng-template>
</app-institutional-table>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| Tablas HTML ad-hoc por pantalla | Legacy en consumo | Migrar a `app-institutional-table` + `columns/config` | Pendiente por definir |
| Lógica de filtros/paginación embebida en páginas | Transicional | Mover a `table-filters`, `table-pagination`, `table-bulk-actions` y `table-export` | Pendiente por definir |

## Notas de i18n
- [ ] Labels de columnas y acciones provienen de i18n.
- [ ] Estados vacíos/carga/errores tienen texto traducible.
- [ ] El truncamiento en celdas conserva alternativa accesible.
