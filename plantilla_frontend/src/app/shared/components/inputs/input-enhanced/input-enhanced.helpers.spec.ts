import {
  buildContainerClasses,
  buildInputStateClasses,
  buildWrapperClasses,
  expandStrongPasswordErrors,
  formatMessageWithErrorData,
  isPasswordRendererType,
  isTextRendererType,
  isTextareaRendererType,
  normalizeErrorKey,
  resolveActiveErrorMessages,
  resolveEffectiveInputType,
  resolveMaxLength,
  splitErrorMessage,
  supportsFloatingType
} from './input-enhanced.helpers';

describe('input-enhanced.helpers', () => {
  it('resuelve renderers por tipo', () => {
    expect(isTextRendererType('text')).toBeTrue();
    expect(isPasswordRendererType('password')).toBeTrue();
    expect(isTextRendererType('password')).toBeFalse();
    expect(isTextareaRendererType('textarea')).toBeTrue();
    expect(isTextRendererType('textarea')).toBeFalse();
  });

  it('resuelve tipo efectivo de password', () => {
    expect(resolveEffectiveInputType('password', true)).toBe('text');
    expect(resolveEffectiveInputType('password', false)).toBe('password');
    expect(resolveEffectiveInputType('email', true)).toBe('email');
  });

  it('controla floating y maxlength con RFC', () => {
    expect(supportsFloatingType('text')).toBeTrue();
    expect(supportsFloatingType('range')).toBeFalse();
    expect(resolveMaxLength(true, { maxLength: 20 })).toBe(13);
    expect(resolveMaxLength(false, { maxLength: 20 })).toBe(20);
  });

  it('normaliza y formatea errores', () => {
    expect(normalizeErrorKey('minLength')).toBe('minlength');
    expect(formatMessageWithErrorData('Mínimo {requiredLength}', { requiredLength: 5 })).toBe('Mínimo 5');
    expect(splitErrorMessage('a\nb')).toEqual(['a', 'b']);
    expect(expandStrongPasswordErrors({ missing: ['Mayúscula', 'Número'] })).toEqual(['Mayúscula', 'Número']);
  });

  it('resuelve helpers de clases y errores activos', () => {
    expect(buildWrapperClasses({
      fullWidth: true,
      floating: true,
      invalidTouched: false,
      isFocused: true,
      readonly: false
    })).toEqual({
      'w-full': true,
      'input-wrapper--floating': true,
      'input-wrapper--error': false,
      'input-wrapper--focused': true,
      'input-wrapper--readonly': false
    });

    expect(buildInputStateClasses({ invalidTouched: true, validTouched: false, readonly: true })).toEqual({
      'border-red-500 ring-red-500': true,
      'success': false,
      'bg-gray-50': true
    });

    expect(buildContainerClasses(true)).toEqual({ 'opacity-50': true });

    const messages = resolveActiveErrorMessages({
      errors: { required: true, strongPassword: { missing: ['Mayúscula'] } },
      resolveMessage: (key) => key === 'required' ? 'Requerido' : 'Línea 1\nLínea 2'
    });

    expect(messages).toEqual(['Requerido', 'Mayúscula']);
  });
});
