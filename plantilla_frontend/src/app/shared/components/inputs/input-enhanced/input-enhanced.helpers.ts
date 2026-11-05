import { ValidationErrorMessages } from '../../../lib/services/custom-validators.service';

export interface InputValidationSpecLike {
  maxLength?: number;
  required?: boolean;
  minLength?: number;
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  email?: boolean;
  rfc?: boolean;
  curp?: boolean;
  nss?: boolean;
  mexicanPhone?: boolean;
  postalCode?: boolean;
  creditCard?: boolean;
  strongPassword?: boolean;
  positiveNumber?: boolean;
  negativeNumber?: boolean;
  integer?: boolean;
  alphanumeric?: boolean;
  onlyLetters?: boolean;
  onlyNumbers?: boolean;
  noSpaces?: boolean;
  url?: boolean;
  futureDate?: boolean;
  pastDate?: boolean;
  ageRange?: { min: number; max: number };
  passwordMatch?: string;
  custom?: unknown;
  messages?: ValidationErrorMessages;
}

const FLOATING_UNSUPPORTED_TYPES = new Set(['range', 'file', 'color']);
const TEXT_RENDERER_TYPES = new Set(['text', 'email', 'number']);

export function supportsFloatingType(type: string): boolean {
  return !FLOATING_UNSUPPORTED_TYPES.has(type);
}

export function isTextRendererType(type: string): boolean {
  return TEXT_RENDERER_TYPES.has(type);
}

export function isPasswordRendererType(type: string): boolean {
  return type === 'password';
}

export function isTextareaRendererType(type: string): boolean {
  return type === 'textarea';
}

export function resolveEffectiveInputType(type: string, passwordVisible: boolean): string {
  return type === 'password' && passwordVisible ? 'text' : type;
}

export function resolveMaxLength(rfc: boolean | undefined, spec?: InputValidationSpecLike): number | null {
  if (rfc) return 13;
  return spec?.maxLength ?? null;
}

export function normalizeErrorKey(key: string): string {
  if (key === 'minLength') return 'minlength';
  if (key === 'maxLength') return 'maxlength';
  return key;
}

export function formatMessageWithErrorData(message: string, errorObj: unknown): string {
  if (!errorObj || typeof errorObj !== 'object') return message;

  return Object.entries(errorObj as Record<string, unknown>).reduce((acc, [k, value]) => {
    return acc.replace(`{${k}}`, String(value));
  }, message);
}

export function splitErrorMessage(message: string): string[] {
  if (!message.includes('\n')) return [message];
  return message
    .split('\n')
    .map(part => part.trim())
    .filter(Boolean);
}

export function expandStrongPasswordErrors(errorObj: unknown): string[] | null {
  if (!errorObj || typeof errorObj !== 'object') return null;
  const maybeMissing = (errorObj as { missing?: unknown }).missing;
  if (!Array.isArray(maybeMissing)) return null;
  return maybeMissing.filter((item): item is string => typeof item === 'string');
}

export function buildWrapperClasses(params: {
  fullWidth: boolean;
  floating: boolean;
  invalidTouched: boolean;
  isFocused: boolean;
  readonly: boolean;
}): Record<string, boolean> {
  return {
    'w-full': params.fullWidth,
    'input-wrapper--floating': params.floating,
    'input-wrapper--error': params.invalidTouched,
    'input-wrapper--focused': params.isFocused,
    'input-wrapper--readonly': params.readonly
  };
}

export function buildInputStateClasses(params: {
  invalidTouched: boolean;
  validTouched: boolean;
  readonly: boolean;
}): Record<string, boolean> {
  return {
    'border-red-500 ring-red-500': params.invalidTouched,
    'success': params.validTouched,
    'bg-gray-50': params.readonly
  };
}

export function buildContainerClasses(readonly: boolean): Record<string, boolean> {
  return {
    'opacity-50': readonly
  };
}

export function resolveActiveErrorMessages(args: {
  errors: Record<string, unknown> | null | undefined;
  resolveMessage: (key: string) => string | undefined;
}): string[] {
  if (!args.errors) return [];

  const messages: string[] = [];
  for (const key of Object.keys(args.errors)) {
    const message = args.resolveMessage(key);
    if (!message) continue;

    const strongPasswordErrors = key === 'strongPassword' ? expandStrongPasswordErrors(args.errors[key]) : null;
    if (strongPasswordErrors?.length) {
      messages.push(...strongPasswordErrors);
      continue;
    }

    const parts = splitErrorMessage(message);
    messages.push(...parts);
  }

  return messages;
}
