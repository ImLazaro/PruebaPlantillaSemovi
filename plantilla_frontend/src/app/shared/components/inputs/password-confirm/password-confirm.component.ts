import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ChangeDetectionStrategy, ElementRef, Optional, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, ControlContainer, FormControl, FormGroup, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InputEnhancedComponent } from '../input-enhanced/input-enhanced.component';

@Component({
  selector: 'app-password-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, ReactiveFormsModule, InputEnhancedComponent],
  template: `
    <div class="space-y-2">
      <app-input-enhanced 
        [controlName]="passwordName"
        [label]="labelPassword" 
        [floating]="floating" 
        [type]="showPassword ? 'text' : 'password'" 
        [required]="true"
        [clear]="true">
      </app-input-enhanced>
      <app-input-enhanced 
        [controlName]="confirmName"
        [label]="labelConfirm" 
        [floating]="floating" 
        [type]="showPassword ? 'text' : 'password'" 
        [required]="true"
        [clear]="true">
      </app-input-enhanced>
    </div>
  `
})
export class PasswordConfirmComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren(InputEnhancedComponent) private inputEnhanceds!: QueryList<InputEnhancedComponent>;

  @Input() passwordName = 'password';
  @Input() confirmName = 'passwordConfirm';
  @Input() labelPassword = 'Contraseña';
  @Input() labelConfirm = 'Confirmar contraseña';
  @Input() minLength = 8;
  @Input() floating = true;
  @Input() required = false;

  passwordControl!: FormControl;
  confirmControl!: FormControl;
  showPassword = false;
  private passwordChangeSub?: Subscription;
  private parentFormGroup?: FormGroup;

  private readonly secureValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
    if (c.value === null || c.value === '') return null;
    const v = String(c.value);
    const missing: string[] = [];
    if (v.length < this.minLength) missing.push(`Al menos ${this.minLength} caracteres`);
    if (!/[A-Z]/.test(v)) missing.push('Una letra mayúscula');
    if (!/[a-z]/.test(v)) missing.push('Una letra minúscula');
    if (!/[0-9]/.test(v)) missing.push('Un número');
    if (!/[^A-Za-z0-9]/.test(v)) missing.push('Un carácter especial (@$!%*?&#.)');
    if (missing.length === 0) return null;
    return {
      strongPassword: {
        missing,
        message: `La contraseña debe contener:\n• ${missing.join('\n• ')}`,
      },
    };
  };

  private readonly matchValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
    const val = c.value;
    const pw = this.passwordControl?.value;
    if (!val && !pw) return null;
    return val === pw ? null : { passwordMismatch: true };
  };

  constructor(@Optional() private controlContainer: ControlContainer, private cdr: ChangeDetectorRef, private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    this.bindInputControlsToParent();
  }

  ngOnDestroy(): void {
    this.passwordChangeSub?.unsubscribe();
  }

  ngOnInit(): void {
    const parent = this.controlContainer && (this.controlContainer.control as FormGroup);

    if (parent) {
      this.parentFormGroup = parent;
      // Asegurar que los controles existen en el formulario padre
      if (!parent.get(this.passwordName)) {
        parent.addControl(this.passwordName, new FormControl(''));
      }
      if (!parent.get(this.confirmName)) {
        parent.addControl(this.confirmName, new FormControl(''));
      }
      
      // Obtener referencias a los controles
      this.passwordControl = parent.get(this.passwordName) as FormControl;
      this.confirmControl = parent.get(this.confirmName) as FormControl;
    } else {
      // standalone controls
      this.passwordControl = new FormControl('');
      this.confirmControl = new FormControl('');
    }

    this.applyPasswordValidators();
    this.setupPasswordChangeSubscription();
  }

  setControlsFromParent(passwordControl: FormControl, confirmControl: FormControl, parent?: FormGroup): void {
    this.passwordChangeSub?.unsubscribe();

    this.passwordControl = passwordControl;
    this.confirmControl = confirmControl;
    this.parentFormGroup = parent ?? this.parentFormGroup;

    this.applyPasswordValidators();
    this.setupPasswordChangeSubscription();
    this.bindInputControlsToParent();

    this.cdr.detectChanges();
  }

  private applyPasswordValidators(): void {
    if (!this.passwordControl || !this.confirmControl) {
      return;
    }

    this.passwordControl.addValidators(this.secureValidator);
    this.confirmControl.addValidators(this.matchValidator);

    this.passwordControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.confirmControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  private setupPasswordChangeSubscription(): void {
    if (!this.passwordControl || !this.confirmControl) {
      return;
    }

    this.passwordChangeSub = this.passwordControl.valueChanges.subscribe(() => {
      this.confirmControl.updateValueAndValidity();
    });
  }

  private bindInputControlsToParent(): void {
    if (!this.inputEnhanceds || !this.passwordControl || !this.confirmControl) {
      return;
    }

    this.inputEnhanceds.forEach((input) => {
      if (input.controlName === this.passwordName) {
        input.setControlFromParent(this.passwordControl);
      }
      if (input.controlName === this.confirmName) {
        input.setControlFromParent(this.confirmControl);
      }
    });
  }

  /**
   * Muestra temporalmente la contraseña por unos segundos
   */
  showTemporarily(duration: number = 3000): void {
        this.showPassword = true;
        this.cdr.detectChanges();
        setTimeout(() => {
            this.showPassword = false;
            this.cdr.detectChanges();
        }, duration);
    }

  /**
   * Método público para establecer valores y mostrar temporalmente
   * @param password La contraseña a establecer en ambos campos
   */
  setPasswordAndShow(password: string): void {
    // Establecer valores en FormControls
    if (this.passwordControl) {
      this.passwordControl.setValue(password);
      this.passwordControl.markAsDirty();
      this.passwordControl.markAsTouched();
      this.passwordControl.updateValueAndValidity({ emitEvent: true });
    }
    
    if (this.confirmControl) {
      this.confirmControl.setValue(password);
      this.confirmControl.markAsDirty();
      this.confirmControl.markAsTouched();
      this.confirmControl.updateValueAndValidity({ emitEvent: true });
    }
    
    // Forzar actualización del formulario padre si existe
    if (this.parentFormGroup) {
      this.parentFormGroup.updateValueAndValidity({ emitEvent: true });
    }
    
    // Mostrar temporalmente la contraseña
    this.showTemporarily(5000);
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }
}
