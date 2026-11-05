import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleHeaderComponent } from './simple-header.component';

describe('SimpleHeaderComponent', () => {
  let fixture: ComponentFixture<SimpleHeaderComponent>;
  let component: SimpleHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleHeaderComponent);
    component = fixture.componentInstance;
  });

  it('renderiza títulos y subtítulos largos sin truncar destructivamente el valor fuente', () => {
    const longTitle = `Título extremadamente largo ${'X'.repeat(120)}`;
    const longSubtitle = `Subtítulo con contexto adicional ${'Y'.repeat(120)}`;
    component.title = longTitle;
    component.subtitle = longSubtitle;

    fixture.detectChanges();

    const titleEl: HTMLElement = fixture.nativeElement.querySelector('h1');
    const subtitleEl: HTMLElement = fixture.nativeElement.querySelector('p');

    expect(titleEl.textContent).toContain(longTitle);
    expect(subtitleEl.textContent).toContain(longSubtitle);
    expect(titleEl.getAttribute('title')).toBe(longTitle);
    expect(subtitleEl.getAttribute('title')).toBe(longSubtitle);
  });

  it('declara estrategia responsive segura: wrap en móvil + ellipsis en sm+', () => {
    component.title = 'Título';
    fixture.detectChanges();

    const titleEl: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(titleEl.className).toContain('break-words');
    expect(titleEl.className).toContain('sm:truncate');
  });
});
