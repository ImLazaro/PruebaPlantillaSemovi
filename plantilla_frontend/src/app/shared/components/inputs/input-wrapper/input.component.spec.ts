import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { InputComponent } from './input.component';

describe('InputComponent states', () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputComponent] }).compileComponents();
    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    component.controlName = 'email';
    component.control = new FormControl('', [Validators.required]);
    component.label = 'Correo';
  });

  it('renderiza estado default', () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.form-input');

    expect(input.className).toContain('ui-state-default');
  });

  it('aplica estado error por validación', () => {
    component.control?.markAsTouched();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.form-input');

    expect(input.className).toContain('ui-state-error');
  });

  it('aplica loading/disabled en el input', () => {
    component.loading = true;
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input.form-input');

    expect(input.disabled).toBeTrue();
    expect(input.className).toContain('ui-state-loading');
    expect(input.className).toContain('ui-state-disabled');
  });
});
