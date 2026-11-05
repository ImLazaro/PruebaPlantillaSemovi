# Matriz de estados por componente interactivo

| Componente | default | hover | active | disabled | error | loading | Notas |
|---|---|---|---|---|---|---|---|
| `InstitutionalButtonComponent` | ✅ `institutional-btn-state-default` | ✅ `institutional-btn-state-hover` | ✅ `institutional-btn-state-active` | ✅ `institutional-btn-disabled` + atributo `disabled` | N/A | ✅ `institutional-btn-loading` + spinner | Hover/active solo cuando no está `disabled/loading`. |
| `InputComponent` (`app-input-enhanced`) | ✅ `ui-state-default` | ✅ `ui-state-hover` | ✅ `ui-state-active` | ✅ `ui-state-disabled` + atributo `disabled` | ✅ `ui-state-error` (validación o `state='error'`) | ✅ `ui-state-loading` + spinner | `loading` también bloquea interacción. |
| `SelectComponent` | ✅ `ui-state-default` | ✅ `ui-state-hover` | ✅ `ui-state-active` | ✅ `ui-state-disabled` + `aria-disabled` | ✅ `ui-state-error` (validación o `state='error'`) | ✅ `ui-state-loading` (`state='loading'`) | `toggle/open` ignora interacción en disabled/loading. |
| `ModalComponent` | ✅ `ui-state-default` | ✅ `ui-state-hover` | ✅ `ui-state-active` | ✅ `ui-state-disabled` | N/A | ✅ `ui-state-loading` | Estado aplicado al contenedor modal. |

## Criterios de implementación
- **default:** el componente inicia en reposo sin flags de error/disabled/loading.
- **hover / active:** se actualizan mediante eventos de puntero (`mouseenter`/`mouseleave` y `mousedown`/`mouseup`).
- **disabled:** bloquea interacción y aplica clase visual explícita.
- **error (inputs):** depende de validación (`invalidTouched`) o `state='error'`.
- **loading:** aplica clase visual y, cuando corresponde, bloquea interacción.
