# Checkbox · Guía de uso

## Propósito
Control booleano reutilizable con soporte para Reactive Forms (ControlValueAccessor) y uso standalone.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Debes capturar una decisión binaria (`true/false`).
- Necesitas compatibilidad con formulario reactivo y binding directo.

### ❌ No usar cuando
- El usuario debe elegir una sola opción entre varias (preferir radio).
- La acción debe ejecutarse inmediatamente y de forma explícita (preferir botón).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `label` | `string` | `''` | No | Texto visible del control. |
| `controlName` | `string` | `''` | No | Nombre del control en `FormGroup`. |
| `disabled` | `boolean` | `false` | No | Estado deshabilitado externo. |
| `size` | `'small' \| 'medium'` | `'medium'` | No | Tamaño visual del checkbox. |
| `variant` | `'default' \| 'indigo'` | `'default'` | No | Variante de color. |
| `extraClasses` | `string` | `''` | No | Clases CSS adicionales. |
| `checked` | `boolean` | `false` | No | Valor en modo standalone. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `change` | `EventEmitter<boolean>` | Al cambiar el estado checked. |

## Estados soportados
- **unchecked**
- **checked**
- **hover/active/focused**
- **disabled**

## Notas de accesibilidad (a11y)
- El label debe expresar claramente la acción/consentimiento.
- Mantener operación por teclado y foco visible.
- No usar solo color para indicar checked/unchecked.

## Ejemplos
### Ejemplo mínimo
```html
<app-checkbox label="Acepto términos" (change)="onAccept($event)"></app-checkbox>
```

### Ejemplo avanzado
```html
<app-checkbox
  controlName="acceptTerms"
  label="Acepto términos y condiciones"
  size="medium"
  variant="default"
  [disabled]="loading"
  (change)="onAccept($event)">
</app-checkbox>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| Uso exclusivo de `checked` en formularios complejos | Soportado (transicional) | Migrar a `FormControl` + `controlName` | Pendiente por definir |
| Manejo manual de clases para estados | Legacy en consumo | Usar `size`, `variant`, `disabled` del componente | Pendiente por definir |

## Notas de i18n
- [ ] Label soporta textos largos y multilínea.
- [ ] Labels dinámicos provienen de i18n.
- [ ] Si hay truncamiento, existe acceso al texto completo.
