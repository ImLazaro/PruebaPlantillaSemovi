# Modal · Guía de uso

## Propósito
Contenedor modal reutilizable para confirmar acciones, alojar formularios o mostrar detalle sin abandonar la vista actual.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Necesitas foco temporal en una tarea específica.
- Requieres estructura consistente (header, contenido y cierre controlado).

### ❌ No usar cuando
- El contenido es navegación principal/persistente (preferir vista dedicada).
- La interacción debe ser no bloqueante (preferir toast o panel lateral).

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `isOpen` | `boolean` | `false` | No | Controla apertura/cierre del modal. |
| `modalId` | `string` | aleatorio | No | Id único para atributos ARIA y DOM. |
| `title` | `string` | `undefined` | No | Título principal del modal. |
| `subtitle` | `string` | `undefined` | No | Subtítulo descriptivo opcional. |
| `showHeader` | `boolean` | `true` | No | Muestra/oculta encabezado. |
| `showCloseButton` | `boolean` | `true` | No | Muestra/oculta botón cerrar. |
| `padding` | `boolean` | `true` | No | Padding interno de contenido. |
| `size` | `UiSize \| ModalSize` | `'md'` | No | Tamaño visual (`sm`, `md`, `lg`, `fullscreen`). |
| `state` | `UiState` | `'default'` | No | Estado semántico visual. |
| `uiConfig` | `Omit<ModalConfig, ...>` | `undefined` | No | Config avanzada. |
| `config` | `ModalConfig` | objeto base | No | API legacy de configuración compacta. |
| `closeOnEscape` | `boolean` | `true` | No | Permite cierre con tecla Escape. |
| `trapFocus` | `boolean` | `false` | No | Mantiene el foco dentro del modal. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `modalOpen` | `EventEmitter<void>` | Al abrirse el modal. |
| `modalClose` | `EventEmitter<void>` | Al cerrarse el modal. |

## Estados soportados
- **closed**
- **open**
- **hover/active** (interacción con capa/contenedor)
- **disabled**
- **loading**

## Notas de accesibilidad (a11y)
- Mantener foco inicial dentro del modal al abrir.
- Si `trapFocus` está activo, no permitir fuga de foco con `Tab`.
- Asegurar nombre accesible vía `title`/`aria-labelledby`.

## Ejemplos
### Ejemplo mínimo
```html
<app-modal [isOpen]="isOpen" title="Confirmar" (modalClose)="onClose()">
  <p>Contenido del modal</p>
</app-modal>
```

### Ejemplo avanzado
```html
<app-modal
  [isOpen]="isOpen"
  title="Editar registro"
  subtitle="Completa los campos requeridos"
  size="lg"
  [trapFocus]="true"
  [closeOnEscape]="true"
  [uiConfig]="{ showCloseButton: true }"
  (modalOpen)="onOpened()"
  (modalClose)="onClosed()">
  <app-user-form></app-user-form>
</app-modal>
```

## Migración legacy → nuevo contrato
| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `config` | Deprecated | Inputs explícitos + `uiConfig` | Pendiente por definir |
| `status` (en `ModalConfig`) | Deprecated | `state` | Pendiente por definir |

## Notas de i18n
- [ ] Títulos y subtítulos largos hacen wrap sin recorte.
- [ ] Textos de acciones del modal provienen de i18n.
- [ ] Mensajes dinámicos mantienen contexto en todos los idiomas.
