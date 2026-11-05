import { Component, Input, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, DoCheck, Optional, ViewChild, ElementRef, Output, EventEmitter, ChangeDetectorRef, HostBinding, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, ControlContainer, FormControl, ValidatorFn, Validators, AbstractControl, ValidationErrors, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UniversalIconComponent } from '../../universal-icon/universal-icon.component';
import { ValidatorsService, ValidatorSpec } from '../../../lib/services/custom-validators.service';
import { UiDensity, UiIconType, UiSize, UiState, UiStatus, UiVariant } from '../../_ui-types';
import {
  buildContainerClasses,
  buildInputStateClasses,
  buildWrapperClasses,
  formatMessageWithErrorData,
  isPasswordRendererType,
  isTextRendererType,
  isTextareaRendererType,
  normalizeErrorKey,
  resolveActiveErrorMessages,
  resolveEffectiveInputType,
  resolveMaxLength,
  supportsFloatingType
} from './input-enhanced.helpers';

export interface InputEnhancedUiConfig {
  variant?: UiVariant;
  size?: UiSize;
  state?: UiState;
  floating?: boolean;
  iconLeft?: string;
  iconRight?: string;
  iconLeftType?: UiIconType;
  iconRightType?: UiIconType;
  helperPosition?: 'top' | 'bottom';
  /** @deprecated Use `state`. */
  status?: UiStatus;
  density?: UiDensity;
}


@Component({
  selector: 'app-input-enhanced',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UniversalIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'style': 'display: block' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputEnhancedComponent),
      multi: true
    }
  ],
  template: `
    <div [class]="wrapperClass + ' input-wrapper'" [ngClass]="getWrapperClasses()" [style.marginBottom]="noMargin ? '0' : null" [attr.data-group]="groupPosition !== 'alone' ? groupPosition : null">
      
      <!-- Helper text superior -->
      <div *ngIf="helperText && helperPosition === 'top'" 
           class="helper-text mb-1 flex items-center">
        <svg *ngIf="helperIcon" class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        {{ helperText }}
      </div>

      <!-- Floating layout -->
      <div *ngIf="isFloatingTrue(); else nonFloatingTemplate" 
           class="relative"
           [class.password-group-container]="shouldShowPasswordToggle()"
           [class.integrated-button-container]="integratedButton"
           [class.flex]="integratedButton"
           [class.items-stretch]="integratedButton">
        <div class="password-group-input-wrapper" [class.has-password-toggle]="shouldShowPasswordToggle()" [class.flex-1]="integratedButton" [class.min-w-0]="integratedButton">
          <!-- Icono izquierdo -->
          <span *ngIf="iconLeft"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                [ngClass]="getIconClasses('left')">
            <app-universal-icon *ngIf="iconLeftType === 'material' || iconLeftType === 'bootstrap'"
              [name]="iconLeft"
              [size]="20"
              customClass="text-gray-500">
            </app-universal-icon>
            <span *ngIf="iconLeftType !== 'material' && iconLeftType !== 'bootstrap'">{{ iconLeft }}</span>
          </span>

          <!-- Input principal optimizado -->
          <ng-container>
            <!-- Input de texto -->
            <input *ngIf="isTextOrPasswordRenderer()"
                [id]="controlId"
                [type]="getEffectiveType()"
                [attr.maxlength]="getMaxLength() || null"
                [attr.min]="min"
                [attr.max]="max"
                [attr.step]="step"
                class="peer floating-input"
                [class]="inputClass"
                [class.password-input-grouped]="shouldShowPasswordToggle()"
                [ngClass]="getInputStateClasses()"
                [style.width]="getComputedWidth()"
                [style.height]="getComputedHeight()"
                [style.paddingLeft.px]="getLeftPadding()"
                [style.paddingRight.px]="shouldShowPasswordToggle() ? 12 : getRightPadding()"
                [style.paddingTop.px]="14"
                [style.paddingBottom.px]="14"
                [placeholder]="' '"
                [readonly]="readonly"
                [disabled]="disabled || isDisabled"
                [attr.aria-invalid]="invalidTouched"
                [attr.aria-describedby]="getAriaDescribedBy()"
                [value]="value || ''"
                (focus)="onFocus()" 
                (blur)="onBlur()"
                (input)="onInput($event)"
                (paste)="onPaste($event)"
                (keydown)="onKeyDown($event)"
                (keyup)="onKeyUp($event)">

            <!-- Textarea -->
            <textarea *ngIf="isTextareaInputRenderer()"
                [id]="controlId"
                class="peer floating-input resize-none"
                [attr.maxlength]="getMaxLength() || null"
                [class]="inputClass"
                [ngClass]="getInputStateClasses()"
                [style.width]="getComputedWidth()"
                [style.height]="getComputedHeight()"
                [style.paddingLeft.px]="getLeftPadding()"
                [style.paddingRight.px]="getRightPadding()"
                [style.paddingTop.px]="14"
                [style.paddingBottom.px]="14"
                [placeholder]="' '"
                [attr.rows]="rows"
                [readonly]="readonly"
                [disabled]="disabled || isDisabled"
                [attr.aria-invalid]="invalidTouched"
                [attr.aria-describedby]="getAriaDescribedBy()"
                [value]="value || ''"
                (focus)="onFocus()" 
                (blur)="onBlur()"
                (input)="onInput($event)"
                (paste)="onPaste($event)"
                (keydown)="onKeyDown($event)"
                (keyup)="onKeyUp($event)">
            </textarea>
          </ng-container>

          <!-- Botón clear -->
          <button *ngIf="clear && value && !readonly && !shouldShowPasswordToggle()" 
                  type="button" 
                  (click)="clearValue(); $event.stopPropagation()"
                  class="clear-button absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  [ngClass]="getClearButtonClasses()"
                  title="Limpiar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <!-- Icono derecho (solo si no hay password toggle) -->
          <span *ngIf="iconRight && !shouldShowPasswordToggle()"
                class="absolute top-1/2 transform -translate-y-1/2 pointer-events-none"
                [ngClass]="getIconClasses('right')"
                [style.right.px]="getRightIconPosition()">
            <app-universal-icon *ngIf="iconRightType === 'material' || iconRightType === 'bootstrap'"
                [name]="iconRight"
                [size]="20"
                customClass="text-gray-500">
            </app-universal-icon>
            <span *ngIf="iconRightType !== 'material' && iconRightType !== 'bootstrap'">{{ iconRight }}</span>
          </span>

          <!-- Prefix text -->
          <span #prefixEl *ngIf="prefix"
            class="absolute left-px top-px bottom-px flex items-center pl-3 pr-3 text-sm font-medium text-gray-500  border-r border-gray-200 pointer-events-none select-none z-10 rounded-l-lg">
            {{ prefix }}
          </span>

          <!-- Label flotante -->
          <label
            [for]="controlId"
            [style.left.px]="labelShifted && prefix ? 8 : getLeftPadding()"
            class="floating-label absolute text-gray-500 pointer-events-none transition-all duration-200 ease-out bg-white px-1 z-20"
            [class.label--shifted]="labelShifted"
            [class.label--focused]="isFocused"
            [ngClass]="getLabelClasses()">
            {{ label }} 
            <span *ngIf="isRequired" class="text-red-500 ml-1">*</span>
            <span *ngIf="optional && !isRequired" class="text-gray-400 text-xs ml-1">(opcional)</span>
          </label>
        </div>
        
        <!-- Botón toggle password integrado -->
        <button *ngIf="shouldShowPasswordToggle()" 
                type="button" 
                (click)="togglePasswordVisibility(); $event.stopPropagation()"
                class="password-toggle-integrated"
                [ngClass]="{ 'focused': isFocused, 'invalid-touched': invalidTouched, 'valid-touched': control?.valid && control?.touched }"
                [title]="passwordVisible ? 'Ocultar' : 'Mostrar'"
                [attr.aria-label]="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'">
          <span class="material-symbols-outlined">{{ passwordVisible ? 'visibility_off' : 'visibility' }}</span>
        </button>

        <!-- Botón integrado -->
        <button *ngIf="integratedButton"
                type="button"
                (click)="onIntegratedButtonClick(); $event.stopPropagation()"
                [disabled]="buttonDisabled"
                class="inline-flex items-center gap-1.5 rounded-r-lg border border-l-0 font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 px-4"
                [ngClass]="{
                  'text-xs': buttonSize === 'small',
                  'text-sm': buttonSize === 'medium',
                  'text-base': buttonSize === 'large',
                  'bg-institucional-primario text-white border-institucional-primario hover:bg-institucional-primario/90': buttonVariant === 'primary' && !buttonDisabled,
                  'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100': buttonVariant === 'secondary' && !buttonDisabled,
                  'opacity-50 cursor-not-allowed': buttonDisabled
                }">
          <span *ngIf="buttonIcon" class="material-symbols-outlined text-base leading-none">{{ buttonIcon }}</span>
          <span *ngIf="buttonText">{{ buttonText }}</span>
        </button>
      </div>

      <!-- Non-floating template -->
      <ng-template #nonFloatingTemplate>
        <label *ngIf="label" [for]="controlId" class="form-label block text-sm font-medium text-gray-700 mb-1" [ngClass]="getLabelClasses()">
          {{ label }}
          <span *ngIf="isRequired" class="text-red-500 ml-1">*</span>
          <span *ngIf="optional && !isRequired" class="text-gray-400 text-xs ml-1">(opcional)</span>
        </label>

        <div class="relative input-container" 
             [ngClass]="getContainerClasses()"
             [class.password-group-container]="shouldShowPasswordToggle()">
          <div class="password-group-input-wrapper flex items-center" [class.has-password-toggle]="shouldShowPasswordToggle()">
            <!-- Icono izquierdo -->
            <span *ngIf="iconLeft" 
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                  [ngClass]="getIconClasses('left')">
              <app-universal-icon *ngIf="iconLeftType === 'material' || iconLeftType === 'bootstrap'"
                  [name]="iconLeft"
                  [size]="20"
                  customClass="text-gray-500">
              </app-universal-icon>
              <span *ngIf="iconLeftType !== 'material' && iconLeftType !== 'bootstrap'">{{ iconLeft }}</span>
            </span>

            <ng-container *ngIf="control">
              <!-- Input simplificado para non-floating -->
              <input *ngIf="isTextOrPasswordRenderer()"
                   [id]="controlId"
                   [type]="getEffectiveType()"
                   [attr.maxlength]="getMaxLength() || null"
                   [class]="inputClass"
                   [class.has-icon-left]="iconLeft && type === 'color'"
                   [class.has-icon-right]="iconRight && type === 'color'"
                   [class.password-input-grouped]="shouldShowPasswordToggle()"
                   [ngClass]="getInputStateClasses()"
                   [style.width]="getComputedWidth()"
                   [style.height]="getComputedHeight()"
                   [style.paddingLeft.px]="getLeftPadding()"
                   [style.paddingRight.px]="shouldShowPasswordToggle() ? 12 : getRightPadding()"
                   [placeholder]="placeholder"
                   [attr.min]="min"
                   [attr.max]="max"
                   [attr.step]="step"
                   [attr.accept]="accept"
                   [attr.autocomplete]="autocomplete"
                   [readonly]="readonly"
                   [attr.aria-invalid]="invalidTouched"
                   [attr.aria-describedby]="getAriaDescribedBy()"
                   [value]="value || ''"
                   (focus)="onFocus()" 
                   (blur)="onBlur()"
                   (input)="onInput($event)"
                   (paste)="onPaste($event)"
                   (keydown)="onKeyDown($event)"
                   (keyup)="onKeyUp($event)">

              <!-- Textarea para non-floating -->
              <textarea *ngIf="isTextareaInputRenderer()"
                   [id]="controlId"
                   [class]="inputClass"
                   [ngClass]="getInputStateClasses()"
                   [style.width]="getComputedWidth()"
                   [style.height]="getComputedHeight()"
                   [style.paddingLeft.px]="getLeftPadding()"
                   [style.paddingRight.px]="getRightPadding()"
                   [placeholder]="placeholder"
                   [attr.rows]="rows"
                   [readonly]="readonly"
                   [attr.aria-invalid]="invalidTouched"
                   [attr.aria-describedby]="getAriaDescribedBy()"
                   [value]="value || ''"
                   (focus)="onFocus()" 
                   (blur)="onBlur()"
                   (input)="onInput($event)"
                   (paste)="onPaste($event)"
                   (keydown)="onKeyDown($event)"
                   (keyup)="onKeyUp($event)">
              </textarea>
            </ng-container>

            <!-- Botón clear -->
            <button *ngIf="clear && value && !readonly && !shouldShowPasswordToggle()" 
                    type="button" 
                    (click)="clearValue(); $event.stopPropagation()"
                    class="clear-button absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    [ngClass]="getClearButtonClasses()"
                    title="Limpiar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            <!-- Icono derecho (solo si no hay password toggle) -->
            <span *ngIf="iconRight && !shouldShowPasswordToggle()"
                  class="absolute top-1/2 transform -translate-y-1/2 pointer-events-none"
                  [ngClass]="getIconClasses('right')"
                  [style.right.px]="getRightIconPosition()">
              <app-universal-icon *ngIf="iconRightType === 'material' || iconRightType === 'bootstrap'"
                  [name]="iconRight"
                  [size]="20"
                  customClass="text-gray-500">
              </app-universal-icon>
              <span *ngIf="iconRightType !== 'material' && iconRightType !== 'bootstrap'">{{ iconRight }}</span>
            </span>

            <!-- Indicador de loading -->
            <div *ngIf="loading && !shouldShowPasswordToggle()" 
                 class="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          </div>
          
          <!-- Botón toggle password integrado -->
          <button *ngIf="shouldShowPasswordToggle()" 
                  type="button" 
                  (click)="togglePasswordVisibility(); $event.stopPropagation()"
                  class="password-toggle-integrated"
                  [ngClass]="{ 'focused': isFocused, 'invalid-touched': invalidTouched, 'valid-touched': control?.valid && control?.touched }"
                  [title]="passwordVisible ? 'Ocultar' : 'Mostrar'">
            <span class="material-symbols-outlined">{{ passwordVisible ? 'visibility_off' : 'visibility' }}</span>
          </button>
        </div>
      </ng-template>

      <!-- Mensajes de validación simplificados -->
      <div *ngIf="invalidTouched" class="validation-errors mt-1" [id]="getErrorId()">
        <div *ngFor="let error of getActiveErrors()" class="error-message flex items-center">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ error }}
        </div>
      </div>

      <!-- Helper text inferior -->
      <div *ngIf="helperText && helperPosition === 'bottom'" 
           class="helper-text mt-1 flex items-center">
        <svg *ngIf="helperIcon" class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
        {{ helperText }}
      </div>

      <!-- Contador de caracteres -->
      <div *ngIf="showCharCount && getMaxLength()" class="char-counter text-xs mt-1 text-right">
        <span [ngClass]="getCharCountClasses()">
          {{ getCharCount() }}/{{ getMaxLength() }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .input-wrapper {
      position: relative;
      margin-bottom: var(--space-16);
      font-family: 'Montserrat', sans-serif;
    }

    /* Floating label styles */
    .floating-label {
      top: 50%;
      transform: translateY(-50%);
      font-size: 1rem;
      z-index: 1;
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
    }

    .floating-input:focus + .floating-label,
    .floating-input:not(:placeholder-shown) + .floating-label,
    .label--shifted,
    .has-value .floating-label {
      top: 0;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: var(--institucional-primario);
      font-weight: 600;
      transition: all var(--transition-fast);
    }

    .label--focused {
      color: var(--institucional-primario);
    }

    /* Input base styles usando las clases del sistema */
    .form-input {
      display: block;
      width: 100%;
      min-height: var(--component-control-height-md);
      padding: var(--space-8) var(--space-12);
      font-size: 1rem;
      line-height: 1.5;
      color: var(--gray-800);
      background-color: #fff;
      background-clip: padding-box;
      border: 1px solid var(--gray-300);
      border-radius: var(--border-radius);
      transition: all var(--transition-fast);
      font-family: 'Montserrat', sans-serif;
      box-shadow: var(--shadow-sm);
    }

    /* Color input specific size (requested) */
    input[type="color"].form-input,
    .floating-input[type="color"] {
      width: 100px !important;
      height: 60px !important;
      padding: var(--space-4) !important;
      border-radius: calc(var(--space-4) + 2px) !important;
      border: 1px solid var(--gray-300) !important;
      overflow: hidden;
    }

    /* Padding when color input has icons */
    input[type="color"].form-input.has-icon-left,
    .floating-input[type="color"].has-icon-left {
      padding-left: 48px !important;
    }

    input[type="color"].form-input.has-icon-right,
    .floating-input[type="color"].has-icon-right {
      padding-right: 48px !important;
    }

    /* Autofill detection */
    .form-input:-webkit-autofill,
    .form-input:-webkit-autofill:hover,
    .form-input:-webkit-autofill:focus {
      transition: background-color 5000s ease-in-out 0s;
    }

    /* Force floating label when autofilled */
    .form-input:-webkit-autofill + .floating-label,
    .floating-input:-webkit-autofill + .floating-label {
      top: 0 !important;
      transform: translateY(-50%) !important;
      font-size: 0.75rem !important;
      color: var(--institucional-primario) !important;
      font-weight: 600 !important;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--institucional-primario);
      box-shadow: 0 0 0 var(--focus-ring-size-md) var(--focus-ring-primary), var(--shadow-institucional);
    }

    .form-input:disabled {
      background-color: var(--gray-50);
      color: var(--gray-400);
      cursor: not-allowed;
    }

    /* Range input styles */
    /* Range input styles simplificados */
    .range-input {
      -webkit-appearance: none;
      appearance: none;
      height: 10px;
      border-radius: 999px;
      outline: none;
      transition: filter 0.15s ease;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
    }

    .range-input:active {
      filter: brightness(0.98);
    }

    .range-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--institucional-primario);
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 4px 10px rgba(139,21,56,0.25);
      margin-top: -6px;
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }

    .range-input::-webkit-slider-thumb:active {
      transform: scale(1.05);
      box-shadow: 0 6px 14px rgba(139,21,56,0.32);
    }

    .range-input::-moz-range-thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--institucional-primario);
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 4px 10px rgba(139,21,56,0.25);
    }

    /* Error states usando variables institucionales */
    .form-input:invalid,
    .form-input.error {
      border-color: var(--error);
      box-shadow: 0 0 0 var(--focus-ring-size-md) var(--focus-ring-danger);
    }

    .error-message {
      animation: fadeIn 0.2s ease-in-out;
      color: var(--error);
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Integrated button: flatten right edge of input */
    .integrated-button-container .floating-input,
    .integrated-button-container .form-input {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    /* Group position: seamless input groups */
    [data-group="left"] .floating-input,
    [data-group="left"] .form-input {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    [data-group="middle"] .floating-input,
    [data-group="middle"] .form-input {
      border-radius: 0 !important;
      border-left: none !important;
    }

    [data-group="right"] .floating-input,
    [data-group="right"] .form-input {
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-left: none !important;
    }

    /* File picker styles */
    .file-picker {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      border: 1px solid var(--gray-300);
      border-radius: var(--border-radius);
      padding: var(--space-8);
      background-color: #fff;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-fast);
    }

    .file-picker:hover {
      border-color: var(--institucional-primario);
      box-shadow: var(--shadow-institucional);
    }

    .file-btn {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      background-color: var(--gray-100);
      color: var(--gray-700);
      padding: var(--space-4) var(--space-12);
      border-radius: var(--border-radius);
      font-family: 'Montserrat', sans-serif;
      font-weight: 500;
      transition: all var(--transition-fast);
    }

    .file-btn:hover {
      background-color: var(--institucional-primario);
      color: white;
    }

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--gray-600);
      font-family: 'Montserrat', sans-serif;
    }

    /* Clear button styles */
    .clear-button {
      z-index: 10;
      color: var(--gray-400);
      transition: all var(--transition-fast);
    }

    .clear-button:hover {
      color: var(--institucional-primario);
      transform: translate(-50%, -50%) scale(1.1);
    }

    /* Character counter styles */
    .char-counter .warning {
      color: var(--warning);
      font-weight: 600;
    }

    .char-counter .error {
      color: var(--error);
      font-weight: 600;
    }

    /* === ESTILOS PARA PASSWORD GROUP INTEGRADO === */
    .password-group-container {
      display: flex;
      align-items: stretch;
    }

    .password-group-input-wrapper {
      position: relative;
      flex: 1;
      min-width: 0;
    }

    .password-group-input-wrapper.has-password-toggle input,
    .password-group-input-wrapper.has-password-toggle .floating-input {
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      border-right: none !important;
    }

    .password-toggle-integrated {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--space-12);
      min-width: 2.75rem;
      height: 3.35rem;
      background-color: var(--bg-secondary, #f3f4f6);
      border: 1px solid var(--border-color, #d1d5db);
      border-left: 0 !important;
      border-top-right-radius: var(--radius-sm);
      border-bottom-right-radius: var(--radius-sm);
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .password-toggle-integrated:hover {
      background-color: var(--institucional-primario, #8b1538);
      color: white;
      border-color: var(--institucional-primario, #8b1538);
    }

    .password-toggle-integrated:focus {
      outline: none;
      box-shadow: 0 0 0 var(--focus-ring-size-sm) rgba(139, 21, 56, 0.2);
    }

    .password-toggle-integrated.focused {
      border-color: var(--institucional-primario);
      border-left: 0 !important;
      box-shadow: 0 0 0 var(--focus-ring-size-md) var(--focus-ring-primary), var(--shadow-institucional);
    }

    .password-toggle-integrated.invalid-touched {
      border-color: var(--error);
      box-shadow: 0 0 0 var(--focus-ring-size-md) var(--focus-ring-danger);
    }

    .password-toggle-integrated.invalid-touched:hover {
      background-color: var(--error);
      border-color: var(--error);
    }

    .password-toggle-integrated.valid-touched {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
      background-color: #ecfdf5;
    }

    .password-toggle-integrated.valid-touched:hover {
      background-color: #10b981;
      border-color: #10b981;
      color: white;
    }

    .password-toggle-integrated .material-symbols-outlined {
      font-size: 1.25rem;
    }

    /* Variant styles básicos */
    .variant-filled {
      background-color: var(--gray-100);
      border: 1px solid transparent;
    }

    .variant-filled:focus {
      background-color: #fff;
      border-color: var(--institucional-primario);
    }

    /* Loading y helper text */
    .loading-spinner {
      color: var(--institucional-primario);
    }

    .helper-text {
      color: var(--gray-600);
      font-family: 'Montserrat', sans-serif;
      font-size: 0.75rem;
    }

    /* Success states */
    .form-input.success {
      border-color: var(--success);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
    }
  `]
})
export class InputEnhancedComponent implements OnInit, AfterViewInit, AfterViewChecked, DoCheck, OnDestroy, ControlValueAccessor {
  @ViewChild('rangeEl') rangeEl?: ElementRef<HTMLInputElement>;

  // Propiedades básicas
  @Input() controlName = '';
  
  // Aceptar AbstractControl | FormControl | null para mayor compatibilidad con bindings desde templates
  private _control?: AbstractControl | FormControl | null;
  @Input() 
  set control(value: AbstractControl | FormControl | null | undefined) {
    this._control = value;
    if (value) {
      // Sincronizar el valor interno con el valor del control
      this._value = value.value;
      this._shifted = !!(value.value !== null && value.value !== undefined && value.value !== '');
      this.setupFormControlConnection();
      this.cdr.markForCheck();
    }
  }
  get control(): AbstractControl | FormControl | null | undefined {
    return this._control;
  }
  
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() validationMap: { [key: string]: ValidatorSpec } = {};
  @Input() required = false;
  @Input() optional = false;
  // Flags para validaciones específicas que pueden venir desde el template
  @Input() rfc?: boolean;
  @Input() curp?: boolean;
  @Input() nss?: boolean;
  
  // Dimensiones
  @Input() width?: string;
  @Input() height?: string;
  @Input() fullWidth = false;
  /** Elimina el margin-bottom del wrapper. Útil al usar el input dentro de flex/grid containers. */
  @Input() noMargin = false;
  /**
   * Posición dentro de un grupo de inputs sin separación.
   * 'left'   → redondeo solo izquierdo, borde derecho presente
   * 'middle' → sin redondeo, sin borde izquierdo
   * 'right'  → redondeo solo derecho, sin borde izquierdo
   * 'alone'  → comportamiento normal (default)
   */
  @Input() groupPosition: 'left' | 'middle' | 'right' | 'alone' = 'alone';
  
  private _uiConfig?: InputEnhancedUiConfig;
  @Input()
  set uiConfig(value: InputEnhancedUiConfig | undefined) {
    this._uiConfig = value;
    this.applyUiConfig();
  }
  get uiConfig(): InputEnhancedUiConfig | undefined {
    return this._uiConfig;
  }

  /** Input estandarizado de variante UI. */
  @Input() uiVariant?: UiVariant;
  /** Input estandarizado de tamaño UI. */
  @Input() uiSize?: UiSize;
  /** Input estandarizado de estado UI. */
  @Input() uiState?: UiState;

  // Variantes visuales básicas
  /** @deprecated Usar `uiConfig.variant` para configuración avanzada visual. */
  @Input() variant: 'filled' | 'outlined' = 'outlined';
  /** @deprecated Usar `uiConfig.size` para configuración avanzada visual. */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** @deprecated Usar `uiConfig.floating` para configuración avanzada visual. */
  @Input() floating = false;
  /** @deprecated Usar `uiConfig.iconLeft` para configuración avanzada visual. */
  @Input() iconLeft?: string;
  /** @deprecated Usar `uiConfig.iconRight` para configuración avanzada visual. */
  @Input() iconRight?: string;
  /** @deprecated Usar `uiConfig.iconLeftType` para configuración avanzada visual. */
  @Input() iconLeftType: 'bootstrap' | 'material' | 'universal' = 'material';
  /** @deprecated Usar `uiConfig.iconRightType` para configuración avanzada visual. */
  @Input() iconRightType: 'bootstrap' | 'material' | 'universal' = 'material';
  @Input() clear = false;
  /** Texto de prefijo fijo que aparece dentro del input a la izquierda (ej: "MOD -") */
  @Input() prefix?: string;

  @ViewChild('prefixEl') prefixEl?: ElementRef<HTMLElement>;
  private _prefixWidth = 0;
  private _prevPrefixText = '';
  @Input() showPasswordToggle = false; // Mostrar botón para ver/ocultar contraseña
  @Input() extraClasses = '';
  
  // Estados
  @Input() loading = false;
  @Input() readonly = false;
  @Input() disabled = false;
  @Input() state: UiState = 'default';
  
  // Atributos HTML específicos
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number | string;
  @Input() accept?: string;
  @Input() multiple = false;
  @Input() autocomplete?: string;
  @Input() rows = 3;
  
  // Helper text y contador de caracteres
  @Input() helperText?: string;
  /** @deprecated Usar `uiConfig.helperPosition` para configuración avanzada visual. */
  @Input() helperPosition: 'top' | 'bottom' = 'bottom';
  @Input() helperIcon = false;
  @Input() showCharCount = false;

  // Botón integrado
  @Input() integratedButton?: 'left' | 'right';
  @Input() buttonIcon?: string;
  @Input() buttonText?: string;
  @Input() buttonVariant: 'primary' | 'secondary' = 'secondary';
  @Input() buttonSize: 'small' | 'medium' | 'large' = 'medium';
  @Input() buttonDisabled = false;
  @Output() clicked = new EventEmitter<void>();
  /** @deprecated Use `clicked`. */
  @Output() buttonClick = this.clicked;
  @Output() valueChange = new EventEmitter<unknown>();

  // Eventos
  @Output() focus = new EventEmitter<Event>();
  @Output() blur = new EventEmitter<Event>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  controlId = '';
  isFocused = false;
  lastFileName: string | null = null;
  passwordVisible = false; // Estado para toggle de contraseña
  private _valueSub?: Subscription;
  private _lastControlValue: unknown = undefined;
  private _shifted = false;
  private _mutationObserver?: MutationObserver;
  private _userHasInteracted = false; // Nueva bandera para rastrear interacción real del usuario
  private _initializedComplete = false; // Variable para evitar detectar falsas interacciones durante inicialización
  
  // ControlValueAccessor properties
  private _value: unknown = null;
  private _onChange: (value: unknown) => void = () => {};
  private _onTouched: () => void = () => {};
  private _disabled = false;

  @HostBinding('class.has-value')
  get hasValue(): boolean {
    return this._shifted;
  }

  get isDisabled(): boolean {
    return this._disabled;
  }

  /**
   * Devuelve true solo si floating es booleano true (no string, no undefined)
   */
  isFloatingTrue(): boolean {
    return this.floating === true && supportsFloatingType(this.type);
  }

  isTextOrPasswordRenderer(): boolean {
    return isTextRendererType(this.type) || isPasswordRendererType(this.type);
  }

  isTextInputRenderer(): boolean {
    return isTextRendererType(this.type);
  }

  isPasswordInputRenderer(): boolean {
    return isPasswordRendererType(this.type);
  }

  isTextareaInputRenderer(): boolean {
    return isTextareaRendererType(this.type);
  }

  /**
   * Devuelve el tipo efectivo del input, considerando el toggle de contraseña
   */
  getEffectiveType(): string {
    return resolveEffectiveInputType(this.type, this.passwordVisible);
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
    this.cdr.markForCheck();
  }

  /**
   * Indica si se debe mostrar el botón de toggle password
   */
  shouldShowPasswordToggle(): boolean {
    return this.isPasswordInputRenderer() && this.showPasswordToggle;
  }

  private applyUiConfig(): void {
    if (!this.uiConfig && !this.uiVariant && !this.uiSize && !this.uiState) {
      return;
    }

    const normalizedVariant = this.uiVariant ?? this.uiConfig?.variant;
    if (normalizedVariant) {
      this.variant = this.mapUiVariantToLegacyVariant(normalizedVariant);
    }
    this.size = this.uiSize ?? this.uiConfig?.size ?? this.size;
    this.state = this.resolveState(this.uiState ?? this.uiConfig?.state, this.uiConfig?.status);
    if (this.state === 'disabled') {
      this.disabled = true;
    }
    if (this.state === 'loading') {
      this.loading = true;
    }
    this.floating = this.uiConfig?.floating ?? this.floating;
    this.iconLeft = this.uiConfig?.iconLeft ?? this.iconLeft;
    this.iconRight = this.uiConfig?.iconRight ?? this.iconRight;
    this.iconLeftType = (this.uiConfig?.iconLeftType as 'bootstrap' | 'material' | 'universal' | undefined) ?? this.iconLeftType;
    this.iconRightType = (this.uiConfig?.iconRightType as 'bootstrap' | 'material' | 'universal' | undefined) ?? this.iconRightType;
    this.helperPosition = this.uiConfig?.helperPosition ?? this.helperPosition;
  }

  private mapUiVariantToLegacyVariant(variant: UiVariant): 'filled' | 'outlined' {
    switch (variant) {
      case 'secondary':
      case 'success':
        return 'filled';
      case 'primary':
      case 'warning':
      case 'danger':
      default:
        return 'outlined';
    }
  }

  private resolveState(state?: UiState, status?: UiStatus): UiState {
    if (state) {
      return state;
    }
    if (status === 'disabled') {
      return 'disabled';
    }
    if (status === 'loading') {
      return 'loading';
    }
    return 'default';
  }

  private _validatorsApplied = false;

  constructor(@Optional() private controlContainer: ControlContainer, private cdr: ChangeDetectorRef) {}

  /** Permite que el padre (UserFormComponent) inyecte el FormControl directamente.
   *  Necesario en producción donde window.ng.getComponent no está disponible. */
  setControlFromParent(control: FormControl): void {
    if (this.control === control) return;

    // Reemplazar el control previo si estaba enlazado a uno incorrecto
    // (común en contenido proyectado dentro de steppers).
    this._valueSub?.unsubscribe();
    this.control = control;
    this._validatorsApplied = false;
    this.setupFormControlConnection();
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.applyUiConfig();
    this.controlId = this.controlName || `input-enhanced-${Math.random().toString(36).slice(2, 9)}`;

    // Intentar obtener el FormControl desde el contenedor padre
    this.attemptControlConnection();

    // Inicializar estado de label flotante según valor actual
    const currentValue = this._value || (this.control && this.control.value);
    this._shifted = !!(currentValue !== null && currentValue !== undefined && currentValue !== '');
    this.cdr.markForCheck();
  }

  ngAfterViewChecked(): void {
    if (this.prefixEl && this.prefix !== this._prevPrefixText) {
      this._prevPrefixText = this.prefix ?? '';
      const w = (this.prefixEl.nativeElement as HTMLElement).offsetWidth;
      if (w !== this._prefixWidth) {
        this._prefixWidth = w;
        this.cdr.markForCheck();
      }
    }
  }

  ngAfterViewInit(): void {
    // Re-evaluar después del primer render para capturar valores que el padre haya seteado tardíamente
    const currentValue = this._value || (this.control && this.control.value);
    const hasValue = !!(currentValue !== null && currentValue !== undefined && currentValue !== '');
    if (hasValue !== this._shifted) {
      this._shifted = hasValue;
      this.cdr.markForCheck();
    }

    // Intentar conectar con FormControl si no se encontró en ngOnInit con múltiples intentos
    if (!this.control && this.controlName) {
      let attempts = 0;
      const maxAttempts = 10;
      const tryConnection = () => {
        attempts++;
        this.attemptControlConnection();
        
        if (!this.control && attempts < maxAttempts) {
          setTimeout(tryConnection, 50 * attempts); // Incrementar el delay progresivamente
        } else {
          // Marcar inicialización como completa después de intentar conectar
          setTimeout(() => {
            this._initializedComplete = true;
            this.cdr.markForCheck();
          }, 100);
        }
      };
      tryConnection();
    } else {
      // Si ya tenemos el control, marcar como completo después de un pequeño delay
      setTimeout(() => {
        this._initializedComplete = true;
        this.cdr.markForCheck();
      }, 100);
    }

    // Configurar observador de mutaciones para detectar cambios de autocompletado del navegador
    this.setupAutofillDetection();
  }

  private attemptControlConnection(): void {
    if (this.control || !this.controlName) return;
    
    // Estrategia 1: ControlContainer directo
    if (this.controlContainer && this.controlContainer.control) {
      const parent = this.controlContainer.control as (AbstractControl & { get?: (name: string) => AbstractControl | null });
      if (parent && parent.get) {
        this.control = parent.get(this.controlName) as FormControl;
        if (this.control) {
          this.setupFormControlConnection();
          return;
        }
      }
    }

    // Estrategia 2: Buscar en el DOM hacia arriba
    try {
      let element = document.getElementById(this.controlId);
      while (element && !this.control) {
        element = element.parentElement;
        if (element) {
          // Buscar componente Angular que tenga FormGroup
          const ngComponent = (element as { __ngContext__?: { masterFormGroup?: { get: (n: string) => FormControl | null } } }).__ngContext__ || (window as { ng?: { getComponent?: (el: Element) => { masterFormGroup?: { get: (n: string) => FormControl | null } } | null } }).ng?.getComponent?.(element);
          if (ngComponent && ngComponent.masterFormGroup) {
            this.control = ngComponent.masterFormGroup.get(this.controlName) as FormControl;
            if (this.control) {
              this.setupFormControlConnection();
              return;
            }
          }
        }
      }
    } catch (error) {
      // Error silencioso
    }

    // Estrategia 3: Buscar en el componente stepper-form globalmente
    try {
      const stepperElement = document.querySelector('app-stepper-form');
      if (stepperElement) {
        const stepperComponent = (window as { ng?: { getComponent?: (el: Element) => { masterFormGroup?: { get: (n: string) => FormControl | null } } | null } }).ng?.getComponent?.(stepperElement);
        if (stepperComponent && stepperComponent.masterFormGroup) {
          this.control = stepperComponent.masterFormGroup.get(this.controlName) as FormControl;
          if (this.control) {
            this.setupFormControlConnection();
            return;
          }
        }
      }
    } catch (error) {
      // Error silencioso
    }
  }

  private setupFormControlConnection(): void {
    if (!this.control) return;

    // Aplicar validadores solo una vez
    if (!this._validatorsApplied) {
      this.applyValidations();
      this._validatorsApplied = true;
    }

    // Sincronizar valores
    if (this._value !== undefined && this._value !== this.control.value) {
      // Si el componente ya tiene un valor, aplicarlo al FormControl
      this.control.setValue(this._value, { emitEvent: false });
      this.control.markAsDirty();
      this.control.markAsTouched();
    } else {
      // Si no, tomar el valor del FormControl
      this._value = this.control.value;
    }
    
    // Suscribirse a cambios
    this._valueSub = this.control.valueChanges?.subscribe((val: unknown) => {
      this._value = val;
      const hasValue = !(val === null || val === undefined || val === '');
      if (hasValue !== this._shifted) {
        this._shifted = hasValue;
        this.cdr.markForCheck();
      }
    });
  }

  private setupAutofillDetection(): void {
    // Solo configurar para inputs de texto que realmente lo necesiten
    if (!['text', 'email', 'password'].includes(this.type)) return;
    
    const inputElement = document.getElementById(this.controlId) as HTMLInputElement | HTMLTextAreaElement;
    if (!inputElement) return;

    // Usar un solo listener optimizado
    const handleValueChange = () => {
      this.checkAndUpdateShifted(inputElement.value);
    };

    // Eventos esenciales para autofill
    inputElement.addEventListener('change', handleValueChange, { passive: true });
    inputElement.addEventListener('input', handleValueChange, { passive: true });

    // Observador más específico - solo para cambios de value
    this._mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          handleValueChange();
          break;
        }
      }
    });

    this._mutationObserver.observe(inputElement, {
      attributes: true,
      attributeFilter: ['value'],
      subtree: false
    });

    // Polling reducido - solo uno después de la inicialización
    setTimeout(() => {
      if (inputElement.value && !this._shifted) {
        this.checkAndUpdateShifted(inputElement.value);
      }
    }, 300);
  }

  private checkAndUpdateShifted(value: string): void {
    const hasValue = !!(value && value.trim() !== '');
    if (hasValue !== this._shifted) {
      this._shifted = hasValue;
      // Actualizar también el control si es necesario
      if (this.control && this.control.value !== value) {
        this.control.setValue(value, { emitEvent: false });
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  ngDoCheck(): void {
    return;
    /*
    // Solo verificar cambios si el valor realmente cambió para evitar ciclos innecesarios
    if (this.control && this.control.value !== this._lastControlValue) {
      this._lastControlValue = this.control.value;
      const hasValue = !!(this.control.value !== null && this.control.value !== '');
      if (hasValue !== this._shifted) {
        this._shifted = hasValue;
        this.cdr.markForCheck();
      }
    }
    */
  }
  ngOnDestroy(): void {
    this._valueSub?.unsubscribe();
    this._mutationObserver?.disconnect();
  }

  private applyValidations(): void {
    const spec = this.validationMap?.[this.controlName];
    if (!spec || !this.control) return;

    if (!spec.messages) spec.messages = {};

    const fns: ValidatorFn[] = [];
    
    // Solo aplicar validadores que realmente se necesitan
    if (spec.required || this.required) fns.push(Validators.required);
    if (spec.minLength) fns.push(Validators.minLength(spec.minLength));
    if (spec.maxLength) fns.push(Validators.maxLength(spec.maxLength));
    if (spec.min !== undefined) fns.push(Validators.min(spec.min));
    if (spec.max !== undefined) fns.push(Validators.max(spec.max));
    if (spec.pattern) fns.push(Validators.pattern(spec.pattern));
    if (spec.email) fns.push(Validators.email);

    // Aplicar validaciones personalizadas comunes usando el servicio
    if (spec.rfc || this.rfc) fns.push(ValidatorsService.rfcValidator());
    if (spec.curp || this.curp) fns.push(ValidatorsService.curpValidator());
    if (spec.nss || this.nss) fns.push(ValidatorsService.nssValidator());
    if (spec.mexicanPhone) fns.push(ValidatorsService.mexicanPhoneValidator());
    if (spec.postalCode) fns.push(ValidatorsService.postalCodeValidator());
    if (spec.creditCard) fns.push(ValidatorsService.creditCardValidator());
    if (spec.strongPassword) fns.push(ValidatorsService.strongPasswordValidator());
    if (spec.positiveNumber) fns.push(ValidatorsService.positiveNumberValidator());
    if (spec.negativeNumber) fns.push(ValidatorsService.negativeNumberValidator());
    if (spec.integer) fns.push(ValidatorsService.integerValidator());
    if (spec.alphanumeric) fns.push(ValidatorsService.alphanumericValidator());
    if (spec.onlyLetters) fns.push(ValidatorsService.onlyLettersValidator());
    if (spec.onlyNumbers) fns.push(ValidatorsService.onlyNumbersValidator());
    if (spec.noSpaces) fns.push(ValidatorsService.noSpacesValidator());
    if (spec.url) fns.push(ValidatorsService.urlValidator());
    if (spec.futureDate) fns.push(ValidatorsService.futureDateValidator());
    if (spec.pastDate) fns.push(ValidatorsService.pastDateValidator());
    if (spec.ageRange) fns.push(ValidatorsService.ageRangeValidator(spec.ageRange.min, spec.ageRange.max));
    if (spec.passwordMatch) fns.push(ValidatorsService.passwordMatchValidator(spec.passwordMatch));
    if (spec.custom) fns.push(spec.custom);

    if (fns.length) {
      this.control.setValidators(fns);
      this.control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    }
  }

  // Getters y métodos de estado
  get invalidTouched(): boolean {
    // Solo mostrar errores si:
    // 1. El control es inválido
    // 2. El usuario ha interactuado realmente con el campo (no solo programáticamente)
    // 3. El componente ha terminado de inicializarse
    return !!(this.control && 
              this.control.invalid && 
              this._userHasInteracted && 
              this._initializedComplete);
  }

  get labelShifted(): boolean {
    return this._shifted || this.isFocused || !!this.prefix;
  }

  get isRequired(): boolean {
    return this.required || !!(this.validationMap?.[this.controlName]?.required);
  }

  get wrapperClass(): string {
    return this.fullWidth ? 'w-full' : '';
  }

  get inputClass(): string {
    const base = 'form-input transition-all duration-200';
    const variantClass = `variant-${this.variant}`;
    const sizeClass = `size-${this.size}`;
    return [base, variantClass, sizeClass, this.extraClasses].filter(Boolean).join(' ');
  }

  // Métodos de clase CSS
  getWrapperClasses(): Record<string, boolean> {
    return buildWrapperClasses({
      fullWidth: this.fullWidth,
      floating: this.floating,
      invalidTouched: this.invalidTouched,
      isFocused: this.isFocused,
      readonly: this.readonly
    });
  }

  // Métodos de clase CSS simplificados
  getInputStateClasses(): Record<string, boolean> {
    return buildInputStateClasses({
      invalidTouched: this.invalidTouched,
      validTouched: !!(this.control?.valid && this.control?.touched),
      readonly: this.readonly
    });
  }

  getLabelClasses(): Record<string, boolean> {
    return {
      'text-red-500': this.invalidTouched,
      'text-gray-400': this.readonly
    };
  }

  getContainerClasses(): Record<string, boolean> {
    return buildContainerClasses(this.readonly);
  }

  getIconClasses(position: 'left' | 'right'): Record<string, boolean> {
    return {
      'text-gray-300': this.readonly,
      'text-red-400': this.invalidTouched
    };
  }

  getClearButtonClasses(): Record<string, boolean> {
    return {
      'right-8': !!this.iconRight || this.loading,
      'right-2': !this.iconRight && !this.loading
    };
  }

  getCharCountClasses(): Record<string, boolean> {
    const count = this.getCharCount();
    const max = this.getMaxLength();
    if (!max) return {};

    const percentage = count / max;
    return {
      'warning': percentage > 0.8 && percentage <= 1,
      'error': percentage > 1
    };
  }

  // Métodos de cálculo simplificados
  getLeftPadding(): number {
    if (this._prefixWidth > 0) return this._prefixWidth + 8;
    if (this.prefix) return this.prefix.length * 8 + 28; // estimado hasta medir el DOM
    return this.iconLeft ? 48 : 12;
  }

  getRightPadding(): number {
    let padding = 12;
    if (this.clear && this.control?.value) padding += 36;
    if (this.iconRight) padding += 36;
    if (this.loading) padding += 36;
    return padding;
  }

  getRightIconPosition(): number {
    let position = 12;
    if (this.clear && this.control?.value) position += 36;
    if (this.loading) position += 36;
    return position;
  }

  getComputedWidth(): string | null {
    return this.width ?? null;
  }

  getComputedHeight(): string | null {
    if (this.type === 'textarea' && !this.height) {
      return `${this.rows * 1.5 + 1}rem`;
    }
    return this.height ?? null;
  }

  getMaxLength(): number | null {
    const spec = this.validationMap?.[this.controlName];
    return resolveMaxLength(this.rfc, spec);
  }

  getCharCount(): number {
    const value = this.control?.value;
    return value ? String(value).length : 0;
  }

  getAriaDescribedBy(): string {
    const ids = [];
    if (this.invalidTouched) ids.push(this.getErrorId());
    if (this.helperText) ids.push(`${this.controlId}-helper`);
    return ids.join(' ');
  }

  getErrorId(): string {
    return `${this.controlId}-error`;
  }

  // Mensajes de validación simplificados (español)
  private readonly defaultValidationMessages: { [key: string]: string } = {
    required: 'Este campo es requerido',
    minlength: 'Mínimo {requiredLength} caracteres',
    maxlength: 'Máximo {requiredLength} caracteres',
    min: 'Valor mínimo: {min}',
    max: 'Valor máximo: {max}',
    email: 'Correo electrónico inválido',
    pattern: 'Formato inválido',
    rfc: 'RFC inválido',
    curp: 'CURP inválida',
    nss: 'NSS inválido',
    phone: 'Teléfono inválido',
    url: 'URL inválida',
    alphanumeric: 'Solo caracteres alfanuméricos',
    onlyLetters: 'Solo se permiten letras'
  };

  // Método optimizado para obtener errores activos
  getActiveErrors(): string[] {
    return resolveActiveErrorMessages({
      errors: this.control?.errors as Record<string, unknown> | null | undefined,
      resolveMessage: (key) => this.getMessage(key)
    });
  }

  getMessage(key: string): string | undefined {
    const spec = this.validationMap?.[this.controlName];
    
    // Primero intentar mensajes personalizados en validationMap
    if (spec?.messages) {
      if (spec.messages[key]) return spec.messages[key];
      const normalized = normalizeErrorKey(key);
      if (spec.messages[normalized]) return spec.messages[normalized];
    }

    // Usar el servicio de validadores para obtener mensajes
    const errorValue = this.control?.errors?.[key];
    const customMessages = spec?.messages;
    
    // Intentar obtener el mensaje del servicio
    const serviceMessage = ValidatorsService.getErrorMessage(key, errorValue, customMessages);
    if (serviceMessage !== `Error de validación: ${key}`) {
      return serviceMessage;
    }

    // Fallback a mensajes por defecto del componente
    const normalizedKey = normalizeErrorKey(key);
    const defaultMsg = this.defaultValidationMessages[normalizedKey];
    if (!defaultMsg) return undefined;

    // Reemplazar placeholders con datos del error
    const errorObj = this.control?.errors?.[normalizedKey] ?? this.control?.errors?.[key];
    return formatMessageWithErrorData(defaultMsg, errorObj);
  }

  // Métodos para range input
  getRangeValue(): number | string {
    const v: unknown = this.control?.value;
    if (v === null || v === undefined || v === '') return this.getRangeMin();
    const n = typeof v === 'number' ? v : Number(v);
    return isNaN(n) ? this.getRangeMin() : n;
  }

  getRangeMin(): number {
    const spec = this.validationMap?.[this.controlName];
    return spec?.min ?? this.min ?? 0;
  }

  getRangeMax(): number {
    const spec = this.validationMap?.[this.controlName];
    return spec?.max ?? this.max ?? 100;
  }

  getRangePercent(): number {
    const min = this.getRangeMin();
    const max = this.getRangeMax();
    const val = Number(this.getRangeValue());
    const denom = Math.max(1, (max - min));
    const rawPct = ((val - min) / denom) * 100;
    return Math.max(0, Math.min(100, rawPct));
  }

  getRangeBackground(): string {
    const percent = this.getRangePercent();
    return `linear-gradient(90deg, var(--institucional-primario) 0%, var(--institucional-primario) ${percent}%, var(--gray-200) ${percent}%, var(--gray-200) 100%)`;
  }

  // Métodos para file input simplificados
  getFileName(): string | null {
    if (this.lastFileName) return this.lastFileName;
    const val: unknown = this.control?.value;
    if (val instanceof File) return val.name;
    if (typeof val === 'string' && val.length) return val.split('\\').pop() || val;
    return null;
  }

  // Manejadores de eventos
  onIntegratedButtonClick(): void {
    this.clicked.emit();
  }

  onFocus(): void {
    this.isFocused = true;
    this._userHasInteracted = true; // Marcar que el usuario ha interactuado
    this.focus.emit();
  }

  onBlur(): void {
    this.isFocused = false;
    this._userHasInteracted = true; // Marcar que el usuario ha interactuado
    this._onTouched(); // Llamar al callback de touched de ControlValueAccessor
    this.blur.emit();
  }

  onInput(event: Event): void {
    this._userHasInteracted = true; // Marcar que el usuario ha interactuado
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const v = target?.value;
    const hasValue = !(v === null || v === undefined || v === '');
    
    if (hasValue !== this._shifted) {
      this._shifted = hasValue;
    }
    
    // Actualizar el valor a través de ControlValueAccessor
    this.value = v;
  }
  
  onPaste(event: ClipboardEvent): void {
    // Lógica de paste aquí...
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keyup.emit(event);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;
    
    const files = input.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.lastFileName = file.name;
      
      if (this.control) {
        this.control.setValue(this.multiple ? Array.from(files) : file);
        this.control.markAsDirty();
        this.control.markAsTouched();
      }
    }
  }

  clearValue(): void {
    this.value = '';
    this.lastFileName = null;
  }

  // ControlValueAccessor implementation
  writeValue(value: unknown): void {
    const normalizedValue = this.normalizeOutboundValue(value);
    this._value = normalizedValue;
    
    // Si tenemos un FormControl y el valor es diferente, actualizarlo
    if (this.control && this.control.value !== normalizedValue) {
      this.control.setValue(normalizedValue, { emitEvent: false });
    }
    
    // Actualizar el estado del label flotante
    this._shifted = !!(normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== '');
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled = isDisabled;
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  get value(): unknown {
    return this._value;
  }

  set value(val: unknown) {
    const normalizedValue = this.normalizeOutboundValue(val);
    this._value = normalizedValue;
    this._onChange(normalizedValue);
    this._onTouched();
    this.valueChange.emit(normalizedValue);
    
    // Estrategia simple: intentar conectar si no tenemos control
    if (!this.control && this.controlName) {
      this.attemptControlConnection();
    }
    
    // Si tenemos FormControl, actualizarlo
    if (this.control) {
      // Emit the change so any valueChanges subscribers react (e.g., table-filters globalSearch)
      this.control.setValue(normalizedValue, { emitEvent: true });
      this.control.markAsDirty();
      this.control.markAsTouched();
    }
    
    // Actualizar el estado del label flotante
    this._shifted = !!(normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== '');
    this.cdr.markForCheck();
  }

  private normalizeOutboundValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    // Mantener comportamiento actual para tipos no textuales (file/range/etc.).
    if (!(this.isTextOrPasswordRenderer() || this.isTextareaInputRenderer())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const preferredKeys = ['id', 'uuid', 'value', 'key', 'code', 'name', 'label'];
      for (const key of preferredKeys) {
        const candidate = obj[key];
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
          return candidate;
        }
      }
      for (const candidate of Object.values(obj)) {
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
          return candidate;
        }
      }
      return '';
    }

    return String(value);
  }
}
