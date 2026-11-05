# SelectSearch · Guía de uso

## Propósito
Permitir búsqueda y selección de opciones remotas/locales con experiencia de combobox accesible.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Necesitas seleccionar una opción desde un catálogo grande.
- Requieres búsqueda debounced contra endpoint y valor seleccionado tipado.

### ❌ No usar cuando
- El catálogo es corto y fijo (preferir `Select`).
- Se requiere entrada libre no acotada por opciones (preferir `InputEnhanced`).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `endpoint` | `string` | — | Sí | Endpoint para búsqueda remota. |
| `controlName` | `string` | `''` | No | Nombre del control en formulario reactivo. |
| `control` | `FormControl` | `undefined` | No | Control reactivo explícito. |
| `label` | `string` | `''` | No* | Etiqueta visible del campo. |
| `ariaLabel` | `string` | `''` | No* | Alternativa accesible cuando no hay label. |
| `placeholder` | `string` | `'Buscar...'` | No | Placeholder del input de búsqueda. |
| `required` | `boolean` | `false` | No | Marca de requerido visual/validación. |
| `disabled` | `boolean` | `false` | No | Deshabilita interacción. |
| `minSearchLength` | `number` | `1` | No | Longitud mínima para disparar búsqueda. |
| `debounceTime` | `number` | `300` | No | Debounce en ms para búsqueda. |
| `additionalParams` | `SelectSearchParams` | `{}` | No | Parámetros adicionales al endpoint. |
| `requireAdditionalParams` | `boolean` | `false` | No | Fuerza params extra antes de consultar. |
| `displayWith` | `(option) => string` | `option.label` | No | Formatea texto visible de opción. |
| `trackBy` | `(index, option) => unknown` | `option.value` | No | Identificador estable de opciones. |
| `floating` | `boolean` | `false` | No | Modo visual floating label. |
| `clearable` | `boolean` | `false` | No | Permite limpiar selección. |
| `searchable` | `boolean` | `true` | No | Habilita/oculta input de búsqueda. |
| `localSearchOnly` | `boolean` | `false` | No | Evita llamadas remotas y filtra localmente. |
| `helperText` | `string` | `''` | No | Texto de ayuda contextual. |

\* Debes definir `label` o `ariaLabel`.

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `selectionChange` | `EventEmitter<SelectDataItem \| null>` | Al seleccionar o limpiar opción. |
| `searchChange` | `EventEmitter<string>` | Al cambiar el término de búsqueda. |
| `open` | `EventEmitter<void>` | Al abrir el dropdown. |
| `close` | `EventEmitter<void>` | Al cerrar el dropdown. |

## Estados soportados
- **idle**
- **open/closed**
- **loading**
- **error**
- **disabled**

## Notas de accesibilidad (a11y)
- Componente exige `label` visible o `ariaLabel`.
- Usa roles `combobox`, `listbox` y `option` con `aria-expanded`/`aria-activedescendant`.
- Mantener operación por teclado (`ArrowUp/Down`, `Enter`, `Escape`).

## Ejemplos
### Ejemplo mínimo
```html
<app-select-search
  endpoint="/api/catalogs/users"
  label="Usuario"
  (selectionChange)="onUserSelected($event)">
</app-select-search>
```

### Ejemplo avanzado
```html
<app-select-search
  endpoint="/api/catalogs/facilities"
  [control]="form.controls.facility"
  label="Centro"
  [minSearchLength]="2"
  [debounceTime]="400"
  [additionalParams]="{ active: true }"
  [requireAdditionalParams]="true"
  [localSearchOnly]="false"
  (searchChange)="onSearch($event)"
  (selectionChange)="onFacilityChange($event)">
</app-select-search>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `app-select` con listas extensas y filtros manuales | Legacy en consumo | Migrar a `app-select-search` | Pendiente por definir |
| Wrapper `app-select-search` monolítico | Transicional | Separar responsabilidades: `app-select-search-ui` + `app-select-search-data` | Pendiente por definir |

## Notas de i18n
- [ ] Placeholder, mensajes de estado y errores se traducen por catálogo.
- [ ] Opciones con labels largos conservan legibilidad o truncado accesible.
- [ ] `displayWith` contempla formatos regionales cuando aplique.
