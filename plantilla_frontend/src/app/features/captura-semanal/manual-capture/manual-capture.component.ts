import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { InstitutionalButtonComponent } from '../../../shared/components/buttons/institutional-button/institutional-button.component';
import { ModalComponent } from '../../../shared/components/modals/modal/modal.component';
import { NotificationService } from '../../../shared/lib/services/notification.service';

import {
  CaptureRecord,
  CapturedMunicipality,
  FiscalCondition,
  MunicipalityOption,
} from '../../models/manual-capture.model';
import { ManualCaptureService } from '../../services/manual-capture.service';

type NumericField = 'actions' | 'men' | 'women' | 'other';

const CONDITION_ORDER: Record<FiscalCondition, number> = {
  'without-incentive': 0,
  'with-incentive': 1,
};

const NUMERIC_FIELDS: { key: NumericField; label: string }[] = [
  { key: 'actions', label: 'Acciones' },
  { key: 'men', label: 'Benef. H' },
  { key: 'women', label: 'Benef. M' },
  { key: 'other', label: 'Benef. O' },
];

function emptyRecord(condition: FiscalCondition): CaptureRecord {
  return { condition, actions: 0, men: 0, women: 0, other: 0 };
}

function beneficiaries(r: CaptureRecord): number {
  return r.men + r.women + r.other;
}

/**
 * Ventana de captura manual de un trámite: desglose por municipio y
 * condición fiscal (sin / con estímulo).
 *
 * Se renderiza con `@if` desde la vista de captura semanal; al crearse carga
 * la captura previa del trámite y al guardar emite `saved`.
 */
@Component({
  selector: 'app-manual-capture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstitutionalButtonComponent, ModalComponent],
  template: `
    <app-modal
      [isOpen]="true"
      modalId="manual-capture"
      size="xl"
      [showHeader]="false"
      [padding]="false"
      [trapFocus]="true"
      (modalClose)="close()">

      <!-- ===== Encabezado ===== -->
      <header class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            SISER 2.0 · Registro de actividades
          </p>
          <h2 id="fs-modal-title-manual-capture" class="mt-1 text-xl font-semibold text-slate-900">
            Captura Manual: {{ procedureCode() }} — {{ procedureName() }}
          </h2>
          <span class="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800">
            <span class="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true"></span>
            {{ area() }} · Semana Activa {{ week() }}
          </span>
        </div>
        <button
          type="button"
          class="rounded-md p-1.5 text-slate-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          aria-label="Cerrar captura manual"
          (click)="close()">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </header>

      <div class="flex flex-col gap-5 px-6 py-5">
        <!-- ===== Agregar municipio ===== -->
        <section class="rounded-lg border border-gray-200 bg-gray-50 p-4" aria-labelledby="mc-add-title">
          <h3 id="mc-add-title" class="mb-3 text-sm text-slate-700">Agregar municipio a la captura</h3>
          <div class="grid gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
            <!-- Buscador de municipio (combobox) -->
            <div class="relative">
              <label for="mc-municipality" class="mb-1 block text-xs font-semibold text-slate-700">Municipio de Oaxaca</label>
              <div class="relative">
                <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" aria-hidden="true">search</span>
                <input
                  id="mc-municipality"
                  type="text"
                  role="combobox"
                  autocomplete="off"
                  aria-autocomplete="list"
                  aria-controls="mc-municipality-list"
                  [attr.aria-expanded]="listOpen()"
                  [attr.aria-activedescendant]="listOpen() && activeIndex() >= 0 ? 'mc-opt-' + activeIndex() : null"
                  class="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Escriba para buscar de los 570 municipios (ej. Oaxaca de Juárez)..."
                  [value]="searchTerm()"
                  (input)="onSearchInput($any($event.target).value)"
                  (focus)="listOpen.set(true)"
                  (blur)="onSearchBlur()"
                  (keydown)="onSearchKeydown($event)" />
                <span class="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" aria-hidden="true">expand_more</span>
              </div>

              @if (listOpen()) {
                <ul
                  id="mc-municipality-list"
                  role="listbox"
                  aria-label="Municipios"
                  class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  @for (m of results(); track m.id; let i = $index) {
                    <li
                      [id]="'mc-opt-' + i"
                      role="option"
                      [attr.aria-selected]="i === activeIndex()"
                      [attr.aria-disabled]="isAdded(m.id)"
                      class="flex cursor-pointer items-center justify-between px-3 py-2 text-sm"
                      [class.bg-blue-50]="i === activeIndex()"
                      [class.text-slate-400]="isAdded(m.id)"
                      (mousedown)="$event.preventDefault(); select(m)"
                      (mouseenter)="activeIndex.set(i)">
                      <span>{{ m.name }}</span>
                      <span class="text-xs text-slate-500">{{ isAdded(m.id) ? 'Ya agregado' : m.region }}</span>
                    </li>
                  } @empty {
                    <li class="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</li>
                  }
                </ul>
              }
            </div>

            <div>
              <label for="mc-region" class="mb-1 block text-xs font-semibold text-slate-700">Región Automática</label>
              <div class="relative">
                <input
                  id="mc-region"
                  type="text"
                  readonly
                  class="w-full cursor-not-allowed rounded-md border border-gray-200 bg-gray-100 py-2 pl-3 pr-9 text-sm text-slate-600"
                  [value]="selected()?.region ?? ''"
                  placeholder="—" />
                <span class="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-slate-500" aria-hidden="true">lock</span>
              </div>
            </div>

            <app-institutional-button
              variant="primary"
              icon="add"
              [disabled]="!canAdd()"
              (clicked)="addMunicipality()">
              Agregar Municipio
            </app-institutional-button>
          </div>
        </section>

        <!-- ===== Desglose ===== -->
        <section aria-labelledby="mc-detail-title">
          <div class="mb-2 flex items-center justify-between">
            <h3 id="mc-detail-title" class="text-sm text-slate-700">Desglose de datos capturados</h3>
            <span class="text-xs text-slate-500">{{ municipalities().length }} municipios · {{ recordCount() }} registros</span>
          </div>

          <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="w-full min-w-[52rem] text-sm">
              <thead class="bg-gray-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left font-medium">Municipio / Condición Fiscal</th>
                  @for (f of fields; track f.key) {
                    <th scope="col" class="px-2 py-3 text-center font-medium">{{ f.label }}</th>
                  }
                  <th scope="col" class="px-2 py-3 text-center font-medium">Total Benef.</th>
                  <th scope="col" class="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">Cargando captura...</td></tr>
                } @else {
                  @for (m of municipalities(); track m.id; let mi = $index) {
                    @for (r of m.records; track r.condition; let ri = $index) {
                      <tr
                        class="border-t border-gray-100"
                        [class.bg-blue-50]="r.condition === 'with-incentive'">
                        <td class="px-4 py-3" [class.border-l-2]="r.condition === 'with-incentive'" [class.border-blue-600]="r.condition === 'with-incentive'">
                          @if (r.condition === 'without-incentive') {
                            <p class="font-semibold text-slate-900">{{ m.name }}</p>
                            <span class="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] text-slate-600">Sin Estímulo Fiscal</span>
                          } @else {
                            <p class="pl-6 text-sm font-medium text-blue-700">
                              <span aria-hidden="true">↳ ⚡</span> Con Estímulo Fiscal
                            </p>
                          }
                        </td>
                        @for (f of fields; track f.key) {
                          <td class="px-2 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputmode="numeric"
                              class="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              [attr.aria-label]="f.label + ' · ' + m.name + (r.condition === 'with-incentive' ? ' (con estímulo)' : '')"
                              [value]="r[f.key]"
                              (input)="updateValue(mi, ri, f.key, $any($event.target))" />
                          </td>
                        }
                        <td class="px-2 py-3 text-center text-base font-bold"
                            [class.text-slate-900]="r.condition === 'without-incentive'"
                            [class.text-blue-700]="r.condition === 'with-incentive'">
                          {{ beneficiaries(r) }}
                        </td>
                        <td class="px-4 py-3">
                          <div class="flex items-center justify-end gap-3">
                            @if (r.condition === 'without-incentive' && !hasIncentive(m)) {
                              <button
                                type="button"
                                class="text-xs font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                (click)="addIncentive(mi)">
                                <span aria-hidden="true">⚡</span> + Estímulo Fiscal
                              </button>
                            }
                            <button
                              type="button"
                              class="rounded-md border border-gray-200 bg-white p-1.5 text-slate-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                              [attr.aria-label]="r.condition === 'without-incentive' ? 'Quitar municipio ' + m.name : 'Quitar estímulo fiscal de ' + m.name"
                              (click)="removeRow(mi, ri)">
                              <span class="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  } @empty {
                    <tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">Agrega un municipio para comenzar la captura.</td></tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- ===== Pie ===== -->
      <div slot="footer" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm font-semibold text-slate-900" aria-live="polite">
          Total Actividad: {{ totals().actions }} Acciones | {{ totals().beneficiaries }} Beneficiarios
          ({{ totals().men }}H / {{ totals().women }}M / {{ totals().other }}O)
        </p>
        <div class="flex gap-2">
          <app-institutional-button variant="secondary" (clicked)="close()">Cancelar</app-institutional-button>
          <app-institutional-button
            variant="success"
            icon="save"
            [loading]="saving()"
            [disabled]="saving() || loading() || municipalities().length === 0"
            (clicked)="save()">
            Guardar y Actualizar Trámite
          </app-institutional-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class ManualCaptureComponent implements OnInit {
  private readonly manualCapture = inject(ManualCaptureService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly procedureId = input.required<string>();
  readonly procedureCode = input.required<string>();
  readonly procedureName = input.required<string>();
  readonly area = input('');
  readonly week = input<number | string>('');

  /** Se emite al cerrar sin guardar. */
  readonly closed = output<void>();
  /** Se emite tras guardar con la captura final. */
  readonly saved = output<CapturedMunicipality[]>();

  protected readonly fields = NUMERIC_FIELDS;
  protected readonly beneficiaries = beneficiaries;

  protected readonly municipalities = signal<CapturedMunicipality[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  // --- Buscador de municipios
  protected readonly searchTerm = signal('');
  protected readonly selected = signal<MunicipalityOption | null>(null);
  protected readonly listOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly results = toSignal(
    toObservable(this.searchTerm).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term) => this.manualCapture.searchMunicipalities(term).pipe(catchError(() => of([])))),
    ),
    { initialValue: [] as MunicipalityOption[] },
  );

  protected readonly canAdd = computed(() => {
    const m = this.selected();
    return !!m && !this.isAdded(m.id) && !this.loading();
  });

  protected readonly recordCount = computed(() =>
    this.municipalities().reduce((n, m) => n + m.records.length, 0),
  );

  protected readonly totals = computed(() => {
    const t = { actions: 0, men: 0, women: 0, other: 0, beneficiaries: 0 };
    for (const m of this.municipalities()) {
      for (const r of m.records) {
        t.actions += r.actions;
        t.men += r.men;
        t.women += r.women;
        t.other += r.other;
      }
    }
    t.beneficiaries = t.men + t.women + t.other;
    return t;
  });

  ngOnInit(): void {
    this.manualCapture
      .getCapturedMunicipalities(this.procedureId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.municipalities.set(list.map((m) => ({ ...m, records: this.sortRecords(m.records) })));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notifications.error('Captura no disponible', 'No se pudo cargar la captura previa del trámite.');
        },
      });
  }

  // ===================== Buscador =====================

  protected onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.selected.set(null);
    this.activeIndex.set(-1);
    this.listOpen.set(true);
  }

  protected onSearchBlur(): void {
    this.listOpen.set(false);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const list = this.results();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.listOpen.set(true);
        this.activeIndex.set(Math.min(this.activeIndex() + 1, list.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
        break;
      case 'Enter': {
        const option = list[this.activeIndex()];
        if (option) {
          event.preventDefault();
          this.select(option);
        } else if (this.canAdd()) {
          event.preventDefault();
          this.addMunicipality();
        }
        break;
      }
      case 'Escape':
        if (this.listOpen()) {
          event.stopPropagation();
          this.listOpen.set(false);
        }
        break;
    }
  }

  protected select(option: MunicipalityOption): void {
    if (this.isAdded(option.id)) return;
    this.selected.set(option);
    this.searchTerm.set(option.name);
    this.listOpen.set(false);
  }

  protected isAdded(id: string): boolean {
    return this.municipalities().some((m) => m.id === id);
  }

  // ===================== Edición =====================

  protected addMunicipality(): void {
    const option = this.selected();
    if (!option || this.isAdded(option.id)) return;
    this.municipalities.update((list) => [
      ...list,
      { ...option, records: [emptyRecord('without-incentive')] },
    ]);
    this.selected.set(null);
    this.searchTerm.set('');
  }

  protected hasIncentive(m: CapturedMunicipality): boolean {
    return m.records.some((r) => r.condition === 'with-incentive');
  }

  protected addIncentive(municipalityIndex: number): void {
    this.municipalities.update((list) =>
      list.map((m, i) =>
        i === municipalityIndex && !this.hasIncentive(m)
          ? { ...m, records: this.sortRecords([...m.records, emptyRecord('with-incentive')]) }
          : m,
      ),
    );
  }

  /** Fila sin estímulo: quita el municipio completo. Fila con estímulo: solo ese registro. */
  protected removeRow(municipalityIndex: number, recordIndex: number): void {
    const record = this.municipalities()[municipalityIndex]?.records[recordIndex];
    if (!record) return;
    if (record.condition === 'without-incentive') {
      this.municipalities.update((list) => list.filter((_, i) => i !== municipalityIndex));
    } else {
      this.municipalities.update((list) =>
        list.map((m, i) =>
          i === municipalityIndex ? { ...m, records: m.records.filter((_, ri) => ri !== recordIndex) } : m,
        ),
      );
    }
  }

  protected updateValue(municipalityIndex: number, recordIndex: number, field: NumericField, el: HTMLInputElement): void {
    // Solo enteros >= 0; un campo vacío cuenta como 0.
    const parsed = Math.max(0, Math.floor(Number(el.value) || 0));
    if (el.value !== '' && String(parsed) !== el.value) el.value = String(parsed);
    this.municipalities.update((list) =>
      list.map((m, i) =>
        i !== municipalityIndex
          ? m
          : { ...m, records: m.records.map((r, ri) => (ri === recordIndex ? { ...r, [field]: parsed } : r)) },
      ),
    );
  }

  // ===================== Acciones =====================

  protected close(): void {
    if (!this.saving()) this.closed.emit();
  }

  protected save(): void {
    const data = this.municipalities();
    if (data.length === 0 || this.saving()) return;
    this.saving.set(true);
    this.manualCapture
      .saveCapture(this.procedureId(), data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success('Captura guardada', `${this.procedureCode()} se actualizó correctamente.`);
          this.saved.emit(data);
        },
        error: () => {
          this.saving.set(false);
          this.notifications.error('No se pudo guardar', 'Intenta de nuevo en unos segundos.');
        },
      });
  }

  private sortRecords(records: CaptureRecord[]): CaptureRecord[] {
    return [...records].sort((a, b) => CONDITION_ORDER[a.condition] - CONDITION_ORDER[b.condition]);
  }
}
