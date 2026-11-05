# Equivalencias contrato legacy → nuevo contrato UI

## Tipos base compartidos

| Legacy | Nuevo |
|---|---|
| `UiStatus` | `UiState` |
| `ButtonSize: 'small'\|'medium'\|'large'\|'extra-large'` | `UiSize: 'sm'\|'md'\|'lg'` |
| Variantes extendidas (`info`, `light`, `dark`, `link`, `ghost`, `modal-close`) | `UiVariant` (`primary`, `secondary`, `success`, `warning`, `danger`) |

## `app-institutional-button`

| Entrada legacy | Nuevo contrato | Regla de mapeo |
|---|---|---|
| `variant='info'\|'light'\|'dark'\|'link'\|'ghost'\|'modal-close'` | `variant='secondary'` | Fallback visual seguro a variante secundaria. |
| `size='small'` | `size='sm'` | Equivalencia 1:1 semántica. |
| `size='medium'` | `size='md'` | Equivalencia 1:1 semántica. |
| `size='large'\|'extra-large'` | `size='lg'` | Se normaliza al tamaño grande. |
| `status='danger'` | `state='error'` | Estado de error homologado. |
| `status='disabled'\|'loading'` | `state='disabled'\|'loading'` | Se conserva semántica. |

## `app-input-enhanced`

| Entrada legacy | Nuevo contrato | Regla de mapeo |
|---|---|---|
| `uiConfig.variant='filled'` | `uiConfig.variant='secondary'` o `success` | `secondary/success` mapean a estilo `filled`. |
| `uiConfig.variant='outlined'` | `uiConfig.variant='primary'\|'warning'\|'danger'` | `primary/warning/danger` mapean a `outlined`. |
| `uiConfig.status='danger'` | `uiConfig.state='error'` | Estado de error homologado. |
| `uiConfig.status='disabled'\|'loading'` | `uiConfig.state='disabled'\|'loading'` | Se conserva semántica. |

## `app-select`

| Entrada legacy | Nuevo contrato | Regla de mapeo |
|---|---|---|
| `uiConfig.variant='filled'` | `uiConfig.variant='secondary'\|'success'` | Se representa como estilo `filled`. |
| `uiConfig.variant='outlined'` | `uiConfig.variant='primary'` | Se representa como estilo `outlined`. |
| `uiConfig.variant='underlined'` | `uiConfig.variant='warning'\|'danger'` | `warning/danger` mapean a `underlined`. |
| `uiConfig.status='danger'` | `uiConfig.state='error'` | Estado de error homologado. |
| `uiConfig.status='disabled'` | `uiConfig.state='disabled'` | Además deshabilita el `FormControl` si existe. |

## `app-modal`

| Entrada legacy | Nuevo contrato | Regla de mapeo |
|---|---|---|
| `size='xl'\|'2xl'` | `size='lg'` | Normalización a tamaño grande. |
| `size='fullscreen'` | `size='fullscreen'` (legacy soportado) | Se mantiene compatibilidad en runtime. |
| `status='danger'` | `state='error'` | Estado de error homologado. |
| `status='disabled'\|'loading'` | `state='disabled'\|'loading'` | Se conserva semántica. |
