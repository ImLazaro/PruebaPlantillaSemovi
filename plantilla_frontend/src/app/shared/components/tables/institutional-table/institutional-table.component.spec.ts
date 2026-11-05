import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionalTableComponent } from './institutional-table.component';

describe('InstitutionalTableComponent', () => {
  let fixture: ComponentFixture<InstitutionalTableComponent>;
  let component: InstitutionalTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionalTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InstitutionalTableComponent);
    component = fixture.componentInstance;
    component.columns = [
      { key: 'name', label: 'Nombre', sortable: true }
    ];
    component.data = [{ id: 1, name: 'Alpha' }];
  });

  it('estado default: renderiza filas', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody .institucional-table-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('estado loading: muestra modal de carga', () => {
    component.config = { loading: true };
    fixture.detectChanges();

    const loadingModal = fixture.nativeElement.querySelector('app-loading-modal');
    expect(loadingModal).toBeTruthy();
  });

  it('estado active: aplica clase de selección en fila seleccionada', () => {
    const row = component.data[0];
    component.selectedItems = [row];
    fixture.detectChanges();

    const selectedRow = fixture.nativeElement.querySelector('.institucional-table-row-selected');
    expect(selectedRow).toBeTruthy();
  });

  it('evento sort: alterna dirección y emite payload', () => {
    const sortSpy = jasmine.createSpy('sort');
    component.sort.subscribe(sortSpy);

    component.onSort(component.columns[0]);

    expect(sortSpy).toHaveBeenCalledWith({ column: 'name', direction: 'asc' });
    expect(component.sortColumn).toBe('name');
    expect(component.sortDirection).toBe('asc');
  });

  it('evento select all: emite filas visibles', () => {
    const selectionSpy = jasmine.createSpy('selectionChange');
    component.selectionChange.subscribe(selectionSpy);

    component.toggleSelectAll({ target: { checked: true } } as unknown as Event);

    expect(selectionSpy).toHaveBeenCalledWith({
      selectedItems: [{ id: 1, name: 'Alpha' }],
      allSelected: true
    });
  });
});
