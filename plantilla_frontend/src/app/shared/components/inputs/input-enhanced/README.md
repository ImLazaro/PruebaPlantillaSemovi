# InputEnhanced · Guía de uso

## Propósito
Entrada avanzada para formularios con validación, floating label, helpers, íconos y render `input`/`textarea`.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Requieres validación visual homogénea y mensajes de error estandarizados.
- Necesitas configuración visual avanzada consolidada en `uiConfig`.

### ❌ No usar cuando
- Solo capturas texto simple sin validación (input nativo puede ser suficiente).
- Necesitas selección de opciones discretas (preferir `Select` o `Checkbox`).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `controlName` | `string` | `''` | No | Nombre del control en formulario. |
| `control` | `AbstractControl \| FormControl \| null` | `undefined` | No | Control reactivo explícito. |
| `label` | `string` | `''` | No | Etiqueta principal. |
| `placeholder` | `string` | `''` | No | Placeholder del control. |
| `type` | `string` | `'text'` | No | Tipo de entrada (`text`, `email`, `password`, etc.). |
| `required` | `boolean` | `false` | No | Marca de requerido. |
| `readonly` | `boolean` | `false` | No | Bloquea edición manteniendo lectura. |
| `disabled` | `boolean` | `false` | No | Deshabilita control. |
| `state` | `UiState` | `'default'` | No | Estado visual/semántico. |
| `uiConfig` | `InputEnhancedUiConfig` | `undefined` | No | Config visual avanzada. |
| `helperText` | `string` | `undefined` | No | Texto de ayuda contextual. |
| `showCharCount` | `boolean` | `false` | No | Muestra contador de caracteres. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `change` | `EventEmitter<unknown>` | Al cambiar valor (CVA). |
| `focus` | `EventEmitter<Event>` | Al enfocar el control. |
| `blur` | `EventEmitter<Event>` | Al perder foco. |
| `keydown` | `EventEmitter<KeyboardEvent>` | En eventos de teclado (down). |
| `keyup` | `EventEmitter<KeyboardEvent>` | En eventos de teclado (up). |
| `buttonClick` | `EventEmitter<void>` | Al usar botón integrado (si existe). |

## Estados soportados
- **default**
- **hover/active/focused**
- **error** (`invalid-touched` o `state='error'`)
- **disabled/readonly**
- **loading**

## Notas de accesibilidad (a11y)
- Asocia correctamente `label` con `id` del control.
- Usa `aria-invalid` y `aria-describedby` para errores y ayudas.
- Botones auxiliares (clear/toggle) deben ser operables por teclado.

## Ejemplos
### Ejemplo mínimo
```html
<app-input-enhanced
  controlName="email"
  [control]="form.controls.email"
  label="Correo"
  type="email">
</app-input-enhanced>
```

### Ejemplo avanzado
```html
<app-input-enhanced
  controlName="password"
  [control]="form.controls.password"
  label="Contraseña"
  type="password"
  [required]="true"
  [showPasswordToggle]="true"
  [uiConfig]="{ variant: 'outlined', size: 'md', floating: true, iconLeft: 'lock' }"
  helperText="Mínimo 8 caracteres">
</app-input-enhanced>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `variant`, `size`, `floating`, `iconLeft`, `iconRight`, `helperPosition` directos | Deprecated | Consolidar en `uiConfig` | Pendiente por definir |
| `status` (dentro de `InputEnhancedUiConfig`) | Deprecated | `state` | Pendiente por definir |

## Notas de i18n
- [ ] Labels/errores/placeholders provienen de i18n.
- [ ] Mensajes largos no rompen layout en mobile.
- [ ] Truncamiento conserva acceso al texto completo.
