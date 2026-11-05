# Button (InstitutionalButtonComponent) · Guía de uso

## Propósito
Proveer un botón institucional reutilizable y consistente para acciones primarias/secundarias con soporte de estados, iconografía y accesibilidad.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Necesitas una acción clara (guardar, continuar, cancelar, eliminar) con estilo institucional.
- Requieres variantes (`primary`, `secondary`, `danger`, etc.) y estado `loading` en una sola API.

### ❌ No usar cuando
- El usuario debe alternar un estado booleano persistente (preferir `Checkbox`).
- Necesitas navegar entre vistas usando enlaces semánticos (preferir enlace/router-link cuando aplique).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `config` | `ButtonConfig` | `{ variant: 'primary', size: 'medium' }` | No | Configuración visual/funcional del botón. |
| `config.variant` | `ButtonVariant` | `'primary'` | No | Variante visual (`primary`, `secondary`, `success`, `warning`, `danger`, `info`, `light`, `dark`, `link`, `ghost`). |
| `config.size` | `ButtonSize` | `'medium'` | No | Tamaño del botón (`small`, `medium`, `large`, `extra-large`). |
| `config.disabled` | `boolean` | `false` | No | Deshabilita interacción. |
| `config.loading` | `boolean` | `false` | No | Muestra estado de carga y bloquea interacción. |
| `config.icon` | `string` | `undefined` | No | Nombre del ícono Material Symbols. |
| `config.iconPosition` | `'left' \| 'right' \| 'only'` | `'left'` | No | Posición del ícono. |
| `config.type` | `'button' \| 'submit' \| 'reset'` | `'button'` | No | Tipo HTML del botón. |
| `config.ariaLabel` | `string` | `undefined` | No | Nombre accesible adicional/alternativo. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `buttonClick` | `EventEmitter<void>` | Al activarse por click/teclado cuando no está `disabled/loading`. |

## Estados soportados
- **default**
- **hover/active**
- **disabled**
- **loading**

## Notas de accesibilidad (a11y)
- Usa `ariaLabel` cuando el botón no tiene texto visible (ej. icon-only).
- Respeta activación por teclado (`Enter`/`Space`) y foco visible.
- En `disabled/loading`, evita eventos de activación.

## Ejemplos
### Ejemplo mínimo
```html
<app-institutional-button [config]="{ variant: 'primary' }" (buttonClick)="guardar()">
  Guardar
</app-institutional-button>
```

### Ejemplo avanzado
```html
<app-institutional-button
  [config]="{
    variant: 'danger',
    size: 'large',
    icon: 'delete',
    iconPosition: 'left',
    loading: deleting,
    ariaLabel: 'Eliminar registro',
    type: 'button'
  }"
  (buttonClick)="eliminar()">
  Eliminar
</app-institutional-button>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| Clases CSS ad-hoc para botones por pantalla | Legacy en consumo | Usar `app-institutional-button` + `config.variant/size` | Pendiente por definir |
| Flags sueltos (`isLoading`, `isDisabled`) sin objeto unificado | Transicional | Consolidar en `config.loading` y `config.disabled` | Pendiente por definir |

## Notas de i18n
- [ ] El texto del botón proviene de i18n.
- [ ] `ariaLabel` se traduce cuando sea distinto al texto visible.
- [ ] Etiquetas largas mantienen legibilidad en móviles.
