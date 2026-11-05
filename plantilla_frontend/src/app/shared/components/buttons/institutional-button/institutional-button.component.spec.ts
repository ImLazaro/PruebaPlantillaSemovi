import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionalButtonComponent } from './institutional-button.component';

describe('InstitutionalButtonComponent states', () => {
  let component: InstitutionalButtonComponent;
  let fixture: ComponentFixture<InstitutionalButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InstitutionalButtonComponent] }).compileComponents();
    fixture = TestBed.createComponent(InstitutionalButtonComponent);
    component = fixture.componentInstance;
  });

  it('renderiza estado default con clase base', () => {
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.className).toContain('institutional-btn-state-default');
  });

  it('aplica disabled/loading y evita emitir click', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);
    component.loading = true;
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(button.disabled).toBeTrue();
    expect(button.className).toContain('institutional-btn-loading');
    expect(spy).not.toHaveBeenCalled();
  });

  it('actualiza clases hover/active en interacción', () => {
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.dispatchEvent(new Event('mouseenter'));
    button.dispatchEvent(new Event('mousedown'));
    fixture.detectChanges();

    expect(button.className).toContain('institutional-btn-state-hover');
    expect(button.className).toContain('institutional-btn-state-active');
  });
});
