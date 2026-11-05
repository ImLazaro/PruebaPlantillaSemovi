import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

describe('ModalComponent a11y', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    component.title = 'Modal de prueba';
  });

  it('mueve el foco al modal al abrir y lo restaura al cerrar', fakeAsync(() => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Abrir';
    document.body.appendChild(trigger);
    trigger.focus();

    component.open();
    fixture.detectChanges();
    tick();

    expect(document.activeElement?.classList.contains('institutional-modal-container')).toBeTrue();

    component.close();
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  }));

  it('incluye etiqueta accesible en botón cerrar', () => {
    component.isOpen = true;
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar modal"]');
    expect(closeButton).toBeTruthy();
  });

  it('aplica clases de estado del modal', () => {
    component.isOpen = true;
    component.state = 'loading';
    fixture.detectChanges();

    const container: HTMLElement = fixture.nativeElement.querySelector('.institutional-modal-container');
    expect(container.className).toContain('ui-state-loading');
  });

  it('cierra con escape cuando está abierto', () => {
    component.isOpen = true;
    fixture.detectChanges();

    component.onDocumentKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isOpen).toBeFalse();
  });
});
