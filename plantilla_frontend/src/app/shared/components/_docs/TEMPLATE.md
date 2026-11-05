# {{ComponentName}} · Guía de uso

## Propósito
Describe el problema que resuelve el componente y su responsabilidad principal dentro del sistema de UI.

## Cuándo usar / cuándo no usar
### ✅ Usar cuando
- Caso de uso ideal 1.
- Caso de uso ideal 2.

### ❌ No usar cuando
- Caso no recomendado 1 (preferir `{{AlternativeComponent}}`).
- Caso no recomendado 2.

## Inputs
| Input | Tipo | Default | Requerido | Descripción |
|---|---|---|---|---|
| `exampleInput` | `string` | `''` | No | Explica para qué sirve. |

## Outputs
| Output | Tipo | Cuándo emite |
|---|---|---|
| `exampleChange` | `EventEmitter<string>` | Cuando cambia el valor principal. |

## Estados soportados
- **default**: estado base.
- **hover/active**: interacción de puntero/teclado.
- **disabled**: no interactivo.
- **loading**: operación asíncrona.
- **error**: con error de validación/proceso (si aplica).

## Notas de accesibilidad (a11y)
- Define nombre accesible (`label`, `aria-label`, `aria-labelledby`).
- Expone estado con `aria-invalid`, `aria-busy` y/o `aria-disabled` cuando aplique.
- Mantiene navegación por teclado y foco visible.
- Evita depender solo de color para comunicar estados.

## Ejemplos
### Ejemplo mínimo
```html
<app-example [exampleInput]="value" (exampleChange)="onChange($event)"></app-example>
```

### Ejemplo avanzado
```html
<app-example [exampleInput]="value" [advancedConfig]="config"></app-example>
```

## Migración legacy → nuevo contrato
Documenta aquí compatibilidad temporal con APIs antiguas y la ruta de migración.

| API legacy | Estado | Nuevo contrato recomendado | Fecha objetivo de retiro |
|---|---|---|---|
| `legacyProp` | Deprecated | `newProp` | `AAAA-MM-DD` |

## Notas de i18n
- [ ] Labels y mensajes soportan expansión de idioma (~30%).
- [ ] Placeholders, ayudas y errores usan sistema de traducciones.
- [ ] Textos truncados tienen alternativa accesible (`title`, tooltip, descripción visible).
