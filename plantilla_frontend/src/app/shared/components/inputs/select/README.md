# Select · Guía de uso

## Propósito
Selector tipado de opción única para formularios reactivos con comportamiento visual consistente.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- El usuario debe elegir una opción de un conjunto cerrado.
- Necesitas integración con `FormControl` y validación de formulario.

### ❌ No usar cuando
- Debes filtrar catálogos grandes en remoto (preferir `SelectSearch`).
- Se requiere texto libre (preferir `InputEnhanced`).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `controlName` | `string` | `''` | No | Nombre del control en formulario. |
| `control` | `FormControl` | `undefined` | No | Control reactivo explícito. |
| `label` | `string` | `''` | No | Etiqueta del campo. |
| `placeholder` | `string` | `'Seleccionar...'` | No | Placeholder del select. |
| `options` | `SelectOption[]` | `[]` | No | Catálogo de opciones. |
| `required` | `boolean` | `false` | No | Marca requerido. |
| `allowEmpty` | `boolean` | `true` | No | Permite opción vacía. |
| `state` | `UiState` | `'default'` | No | Estado visual/semántico. |
| `uiConfig` | `SelectUiConfig` | `undefined` | No | Config visual avanzada. |
| `ariaLabel` | `string` | `''` | No | Etiqueta accesible alternativa/complementaria. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `change` | `EventEmitter<unknown>` | Al cambiar opción seleccionada. |

## Estados soportados
- **default**
- **hover/active/focused/open**
- **disabled**
- **error** (`invalid-touched` o `state='error'`)
- **loading** (`state='loading'`)

## Notas de accesibilidad (a11y)
- Mantener etiqueta asociada al control (`label`/`ariaLabel`).
- Exponer estado inválido al usuario asistivo cuando aplique.
- Garantizar navegación por teclado en apertura y selección.

## Ejemplos
### Ejemplo mínimo
```html
<app-select
  controlName="status"
  [control]="form.controls.status"
  label="Estado"
  [options]="statusOptions">
</app-select>
```

### Ejemplo avanzado
```html
<app-select
  controlName="role"
  [control]="form.controls.role"
  label="Rol"
  [required]="true"
  [options]="roleOptions"
  [uiConfig]="{ variant: 'outlined', size: 'md', floating: true }"
  [allowEmpty]="false"
  ariaLabel="Selecciona un rol">
</app-select>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `variant`, `size`, `floating`, `icon*` directos | Deprecated | Consolidar en `uiConfig` | Pendiente por definir |
| `status` (en `SelectUiConfig`) | Deprecated | `state` | Pendiente por definir |

## Notas de i18n
- [ ] Opciones y placeholder salen de catálogos traducibles.
- [ ] Labels largos no rompen layout en pantallas pequeñas.
- [ ] Si hay truncamiento, incluir alternativa accesible.
