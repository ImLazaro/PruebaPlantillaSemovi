# Button (InstitutionalButtonComponent) · Guía de uso

## Propósito
Renderizar acciones primarias/secundarias con variantes institucionales, estados (`state`) y soporte de íconos.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Necesitas un botón consistente con el design system institucional.
- Requieres estados `loading`, `disabled`, `fullWidth` o botón con ícono.

### ❌ No usar cuando
- El objetivo principal es navegación (preferir `routerLink` o `<a>`).
- Se requiere selección persistente on/off (preferir `Checkbox` o `ToggleSwitch`).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `variant` | `UiVariant \| LegacyButtonVariant` | `'primary'` | No | Variante visual institucional. |
| `size` | `UiSize \| LegacyButtonSize` | `'md'` | No | Tamaño del botón. |
| `state` | `UiState` | `'default'` | No | Estado visual/funcional. |
| `disabled` | `boolean` | `false` | No | Deshabilita interacción. |
| `loading` | `boolean` | `false` | No | Muestra spinner y bloquea clic. |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | No | Tipo HTML del botón. |
| `icon` | `string` | `undefined` | No | Ícono a renderizar. |
| `iconPosition` | `'left' \| 'right' \| 'only'` | `'left'` (si hay ícono) | No | Posición del ícono. |
| `fullWidth` | `boolean` | `false` | No | Ocupa todo el ancho del contenedor. |
| `uiConfig` | `Omit<ButtonConfig, ...>` | `undefined` | No | Opciones avanzadas no cubiertas por inputs directos. |
| `config` | `ButtonConfig` | `{}` | No | API legacy de configuración compacta. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `buttonClick` | `EventEmitter<Event>` | Al hacer clic en el botón habilitado. |

## Estados soportados
- **default**
- **disabled**
- **loading**
- **with-icon** (`left`, `right`, `only`)

## Migración (APIs legacy)
| API legacy | Estado | Reemplazo recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `config` | Deprecated | Inputs explícitos + `uiConfig` | Pendiente por definir |
| `status` (en `ButtonConfig`) | Deprecated | `state` | Pendiente por definir |

## Ejemplos
### Ejemplo mínimo
```html
<app-institutional-button variant="primary" (buttonClick)="onSave($event)">
  Guardar
</app-institutional-button>
```

### Ejemplos visuales por estado
```html
<!-- default -->
<app-institutional-button>Default</app-institutional-button>

<!-- hover / active (se aprecian al interactuar) -->
<app-institutional-button>Hover/Active</app-institutional-button>

<!-- disabled -->
<app-institutional-button [disabled]="true">Disabled</app-institutional-button>

<!-- loading -->
<app-institutional-button [loading]="true">Guardando</app-institutional-button>
```

### Ejemplo avanzado
```html
<app-institutional-button
  variant="secondary"
  size="lg"
  [loading]="saving"
  icon="save"
  iconPosition="left"
  [uiConfig]="{ title: 'Guardar cambios', customWidth: '220px' }"
  (buttonClick)="onSave($event)">
  Guardar cambios
</app-institutional-button>
```

## Notas de accesibilidad (a11y)
- En botones `icon-only`, definir siempre `ariaLabel`.
- Respetar `disabled` cuando no haya acción disponible.
- No depender solo de `title` para comunicar intención/resultado.

## Notas de i18n
- [ ] El texto del botón soporta frases largas sin romper layout.
- [ ] `ariaLabel` también se resuelve desde catálogo i18n.
- [ ] Si hay truncamiento visual, proveer alternativa accesible.
