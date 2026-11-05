# Checklist **obligatorio** de accesibilidad de componentes compartidos

Este checklist define el contrato **mínimo y bloqueante** de accesibilidad para componentes interactivos en `shared/components`.
Toda PR que agregue o modifique componentes interactivos debe cumplirlo.

## ✅ 1) Nombre accesible obligatorio

- [ ] Todo control interactivo tiene nombre accesible.
- [ ] Si no existe texto visible asociado, **se exige `ariaLabel`** (o `aria-label` equivalente en DOM).
- [ ] En componentes *icon-only* (`iconPosition="only"`, botones de cerrar, etc.) `ariaLabel` es obligatorio (no sustituible por `title`).

## ✅ 2) Focus visible consistente

- [ ] Los controles interactivos implementan `:focus-visible` con anillo perceptible y consistente.
- [ ] No se elimina el foco nativo sin reemplazo equivalente.
- [ ] El indicador de foco es distinguible sobre fondos claros y oscuros.
- [ ] Tamaño interactivo mínimo recomendado: ~44px en alto/ancho para objetivos táctiles.

## ✅ 3) Soporte de teclado por rol

- [ ] Botón / trigger interactivo: `Enter` y `Space` activan.
- [ ] Dialog/modal: `Escape` cierra (si está habilitado).
- [ ] Combobox/listbox: `ArrowUp`/`ArrowDown` navegan opciones; `Enter` selecciona; `Escape` cierra.
- [ ] Componentes no nativos con rol interactivo son focusables (`tabindex="0"`).

## ✅ 4) Modal

- [ ] Al abrir, se mueve el foco al contenedor del modal o primer foco interno.
- [ ] Al cerrar, se restaura el foco al elemento disparador.
- [ ] Soporte opcional de *focus trap* configurable por input (`trapFocus`).

## ✅ 5) Select / Combobox

- [ ] Trigger/input expone `role="combobox"`.
- [ ] Se informa estado con `aria-expanded`.
- [ ] `aria-controls` apunta al `id` del listbox.
- [ ] `aria-activedescendant` referencia la opción resaltada.
- [ ] `role="listbox"` y `role="option"` + `aria-selected` en opciones.
- [ ] IDs de opciones/listbox son estables por instancia (sin depender solo de índice mutable).

## ✅ 6) Pruebas mínimas sugeridas en componentes críticos

- [ ] Presencia de atributos ARIA clave.
- [ ] Flujo base de teclado por rol.
- [ ] Foco inicial y restauración de foco en modal.

> Las pruebas deben validar el contrato de accesibilidad, no estilos cosméticos.
