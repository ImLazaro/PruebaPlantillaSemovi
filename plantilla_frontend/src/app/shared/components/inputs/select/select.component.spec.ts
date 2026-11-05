import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SelectComponent } from './select.component';

describe('SelectComponent a11y', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;
    component.label = 'Estado';
    component.control = new FormControl(null);
    component.options = [
      { value: 'a', label: 'Activo' },
      { value: 'i', label: 'Inactivo' },
    ];
  });

  it('expone relación combobox/listbox con ids estables', fakeAsync(() => {
    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();

    component.openDropdown();
    fixture.detectChanges();

    const combobox: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
    const listbox: HTMLElement = fixture.nativeElement.querySelector('[role="listbox"]');

    expect(combobox.getAttribute('aria-controls')).toBe(listbox.id);
  }));

  it('actualiza aria-activedescendant con teclado', fakeAsync(() => {
    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();

    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();

    const combobox: HTMLElement = fixture.nativeElement.querySelector('[role="combobox"]');
    expect(combobox.getAttribute('aria-activedescendant')).toContain(`${component.controlId}-option-`);
  }));

  it('aplica estado disabled y bloquea apertura', fakeAsync(() => {
    component.state = 'disabled';
    fixture.detectChanges();
    tick(20);

    const combobox: HTMLElement = fixture.nativeElement.querySelector('[role=\"combobox\"]');
    combobox.click();
    fixture.detectChanges();

    expect(combobox.className).toContain('ui-state-disabled');
    expect(component.isOpen).toBeFalse();
  }));

  it('aplica estado error/loading', fakeAsync(() => {
    component.state = 'error';
    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();
    let combobox: HTMLElement = fixture.nativeElement.querySelector('[role=\"combobox\"]');
    expect(combobox.className).toContain('ui-state-error');

    component.state = 'loading';
    component.ngOnChanges({});
    fixture.detectChanges();
    combobox = fixture.nativeElement.querySelector('[role=\"combobox\"]');
    expect(combobox.className).toContain('ui-state-loading');
  }));

  it('soporta labels largos sin alterar el valor real seleccionado', fakeAsync(() => {
    const longLabel = `Dependencia con nombre muy extenso ${'Z'.repeat(140)}`;
    component.options = [{ value: 'long', label: longLabel }];
    component.control?.setValue('long');

    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();

    const comboboxText = fixture.nativeElement
      .querySelector('[role="combobox"] span') as HTMLElement;
    expect(comboboxText.textContent).toContain(longLabel);
  }));

  it('muestra error real de required al interactuar con el control', fakeAsync(() => {
    component.control = new FormControl<string | null>(null);
    component.validationMap = {
      '': {
        required: true,
        messages: { required: 'Debe seleccionar una opción válida.' },
      },
    };

    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();

    component.control?.markAsTouched();
    component.control?.updateValueAndValidity();
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.error-message');
    expect(errorEl?.textContent).toContain('Debe seleccionar una opción válida.');
  }));
});
