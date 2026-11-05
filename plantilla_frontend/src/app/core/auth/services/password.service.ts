/**
 * PasswordService - Validación local de contraseñas
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PasswordService {

  /**
   * Validación local de requisitos básicos de contraseña
   */
  validatePasswordRequirements(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('La contraseña debe tener al menos 12 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Debe incluir al menos una letra mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Debe incluir al menos una letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Debe incluir al menos un número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Debe incluir al menos un carácter especial');
    }

    const commonPatterns = ['123', '321', 'abc', 'qwerty', 'password', 'admin'];
    const lowercasePassword = password.toLowerCase();
    if (commonPatterns.some(pattern => lowercasePassword.includes(pattern))) {
      errors.push('La contraseña no debe contener patrones comunes');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

