import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { InputEnhancedComponent } from './input-enhanced.component';

describe('InputEnhancedComponent', () => {
  let fixture: ComponentFixture<InputEnhancedComponent>;
  let component: InputEnhancedComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputEnhancedComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InputEnhancedComponent);
    component = fixture.componentInstance;
    component.floating = true;
  });

  it('estado default: renderiza input de texto', () => {
    component.type = 'text';
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('renderer password: mantiene input y respeta toggle', () => {
    component.type = 'password';
    component.showPasswordToggle = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(component.shouldShowPasswordToggle()).toBeTrue();
  });

  it('renderer textarea: renderiza textarea', () => {
    component.type = 'textarea';
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea');
    expect(textarea).toBeTruthy();
  });

  it('estado active: marca foco al enfocar', () => {
    component.type = 'text';
    fixture.detectChanges();

    component.onFocus();
    expect(component.isFocused).toBeTrue();
  });

  it('evento input: actualiza shifted y emite value change', () => {
    component.type = 'text';
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    component.onInput({ target: { value: 'valor' } } as unknown as Event);

    expect(component.labelShifted).toBeTrue();
    expect(onChange).toHaveBeenCalledWith('valor');
  });

  it('estado disabled: deshabilita el input', () => {
    component.type = 'text';
    component.disabled = true;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBeTrue();
  });

  it('estado error: muestra errores cuando hay interacción', () => {
    component.type = 'text';
    component.controlName = 'nombre';
    component.control = new FormControl('', Validators.required);

    component.onFocus();
    component.onBlur();
    (component as unknown as { _initializedComplete: boolean })._initializedComplete = true;
    component.control?.markAsTouched();
    component.control?.updateValueAndValidity();

    fixture.detectChanges();

    const errors = fixture.nativeElement.querySelector('.validation-errors');
    expect(errors).toBeTruthy();
  });

  it('estado loading: muestra indicador de carga', () => {
    component.type = 'text';
    component.loading = true;
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });
});
