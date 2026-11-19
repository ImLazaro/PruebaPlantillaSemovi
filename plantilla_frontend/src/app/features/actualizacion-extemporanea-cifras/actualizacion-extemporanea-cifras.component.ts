import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal, TemplateRef, ViewChild,
} from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AsyncStateWrapperComponent } from '@/app/shared/components/async-state-wrapper/async-state-wrapper.component';
import { AvatarComponent } from '@/app/shared/components/avatar/avatar.component';
import { InfoBannerComponent } from '@/app/shared/components/info-banner/info-banner.component';
import { InputComponent } from '@/app/shared/components/inputs/input-wrapper/input.component';
import { FileInputComponent } from '@/app/shared/components/inputs/file-input/file-input.component';
import { SelectComponent, SelectOption } from '@/app/shared/components/inputs/select/select.component';
import { InstitutionalBadgeComponent } from '@/app/shared/components/badge';
import { InstitutionalButtonComponent } from '@/app/shared/components/buttons/institutional-button/institutional-button.component';
import { InstitutionalTableComponent, TableColumn } from '@/app/shared/components/tables';
import { ModalComponent } from '@/app/shared/components/modals/modal/modal.component';
import { NotificationService } from '@/app/shared/lib/services/notification.service';
import { OidcAuthService } from '@/app/core/auth';
import {
  CifrasHMO,
  ContextoActualizacionDto,
  SemanaVencidaDto,
  TramiteCifrasDto,
} from '../models/actualizacion-extemporanea-cifras.model';
import { ActualizacionExtemporaneaDataSource } from '../services/actualizacion-extemporanea-cifras.service';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** 2026-09-20 → 20/Sep/2026 (sin depender del locale registrado). */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${MESES[Number(mes) - 1]}/${anio}`;
}

function semanaKey(s: SemanaVencidaDto): string {
  return `${s.anio}-${s.semana}`;
}

function soloPdf(control: AbstractControl): ValidationErrors | null {
  const file = control.value as File | null;
  if (!file) return null;
  const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  return esPdf ? null : { pdf: true };
}

const CIFRA_VALIDATORS = [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)];

/**
 * Actualización Extemporánea de Cifras (SISER 2.0).
 * Permite modificar cifras H/M/O de trámites en semanas vencidas con oficio de soporte.
 */
@Component({
  selector: 'app-actualizacion-extemporanea-cifras',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AsyncStateWrapperComponent,
    AvatarComponent,
    FileInputComponent,
    InfoBannerComponent,
    InputComponent,
    InstitutionalBadgeComponent,
    InstitutionalButtonComponent,
    InstitutionalTableComponent,
    ModalComponent,
    SelectComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 pb-24">
      <header class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900">SISER 2.0</h1>
          <p class="text-xs text-gray-500">Sistema de Registro, Seguimiento y Concertación Institucional</p>
        </div>
        <div class="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
          <app-avatar [name]="usuario.nombre" [config]="{ size: 'sm', variant: 'primary' }"></app-avatar>
          <div class="leading-tight">
            <p class="text-sm font-semibold uppercase text-gray-900">{{ usuario.nombre }}</p>
            <p class="text-xs uppercase text-gray-500">{{ contexto()?.area?.nombre ?? usuario.area }}</p>
          </div>
        </div>
      </header>

      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4" aria-labelledby="ae-titulo">
        <!-- Encabezado de sección -->
        <header class="flex items-start justify-between gap-3">
          <div>
            <h2 id="ae-titulo" class="text-xl font-bold text-gray-900">Actualización Extemporánea de Cifras</h2>
            <p class="text-xs text-gray-500">Permite la modificación o captura de actividades correspondientes a semanas pasadas.</p>
          </div>
          @if (semanaSeleccionada(); as s) {
            <app-institutional-badge [config]="{ variant: 'ghost', size: 'sm' }">Semana {{ s.semana }}</app-institutional-badge>
          }
        </header>

        <app-async-state-wrapper
          [loading]="cargandoContexto()"
          [hasError]="!!errorContexto()"
          [errorMessage]="errorContexto() ?? ''"
          [empty]="!cargandoContexto() && !!contexto() && opcionesSemana().length === 0"
          emptyIcon="event_available"
          emptyTitle="Sin semanas vencidas"
          emptySubtitle="No hay semanas disponibles para actualización extemporánea."
          (retry)="cargarContexto()">
          <div class="flex flex-col gap-4">
            @if (semanaSeleccionada(); as s) {
              <app-info-banner
                [config]="{ type: 'warning', variant: 'soft', size: 'sm', title: 'Semana Vencida ' + s.semana }"
                message="Esta pantalla permite la actualización extemporánea de cifras para trámites del departamento seleccionado en semanas pasadas.">
              </app-info-banner>
            }

            <!-- Área bloqueada -->
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs text-gray-500">Área bloqueada</p>
                <app-institutional-badge [config]="{ variant: 'danger', size: 'sm', icon: 'lock', iconPosition: 'left' }">Solo lectura</app-institutional-badge>
              </div>
              <p class="text-base font-bold uppercase text-gray-900 mt-1">{{ contexto()?.area?.nombre }}</p>
              <p class="text-xs text-gray-500 mt-1">
                Los datos de esta sección se cargan desde la configuración institucional y no pueden modificarse desde esta pantalla.
              </p>
            </div>

            <!-- Trámites: encabezado y selector de semana -->
            <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div class="flex items-start gap-3">
                <div>
                  <h3 class="text-base font-bold text-gray-900">Trámites para actualización</h3>
                  <p class="text-xs text-gray-500">Listado de actividades para modificar cifras en semanas vencidas.</p>
                </div>
                @if (esDemo) {
                  <app-institutional-badge [config]="{ variant: 'ghost', size: 'sm' }">Datos de ejemplo</app-institutional-badge>
                }
              </div>
              <div class="w-full lg:w-96">
                <app-select
                  label="Seleccionar Semana Vencida"
                  ariaLabel="Seleccionar semana vencida"
                  [control]="semana"
                  [options]="opcionesSemana()"
                  [allowEmpty]="false"
                  size="sm">
                </app-select>
              </div>
            </div>

            <app-info-banner
              [config]="{ type: 'warning', variant: 'outline', size: 'sm' }"
              message="Aviso de Responsabilidad: Todo cambio en semanas pasadas generará un registro de auditoría en tiempo real y requerirá el envío del Memorándum Oficial a Coordinación Técnica.">
            </app-info-banner>

            <!-- Documento de soporte -->
            <div class="rounded-xl border border-gray-200 p-4" [formGroup]="soporte">
              <h4 class="text-sm font-bold text-gray-900">Documento de soporte obligatorio</h4>
              <p class="text-xs text-gray-500 mb-3">Para solicitar una actualización extemporánea, adjunta el oficio justificativo correspondiente.</p>
              <div class="flex flex-col gap-3">
                <app-input-enhanced
                  label="Número de Folio / Memorándum de Soporte Oficial"
                  placeholder="ej. SEMOVI/SUB/045/2026"
                  [control]="soporte.controls.folio"
                  [required]="true"
                  [fullWidth]="true">
                </app-input-enhanced>
                <app-file-input
                  controlName="oficio"
                  label="Adjunto (PDF)"
                  accept="application/pdf,.pdf"
                  hint="Adjuntar Oficio Justificativo (PDF, máx. 10 MB)"
                  (fileError)="notifications.error('Archivo no válido', $event)">
                </app-file-input>
                @if (soporte.controls.oficio.hasError('pdf')) {
                  <p class="text-xs text-red-700" role="alert">El oficio debe ser un archivo PDF.</p>
                }
                @if (soporte.invalid) {
                  <p class="text-xs text-red-700">* Requerido para tramitar la actualización extemporánea.</p>
                }
              </div>
            </div>

            <!-- Tabla de trámites -->
            <app-async-state-wrapper
              [loading]="cargandoTramites()"
              [hasError]="!!errorTramites()"
              [errorMessage]="errorTramites() ?? ''"
              [empty]="!cargandoTramites() && tramites().length === 0"
              emptyIcon="assignment"
              emptyTitle="Sin trámites"
              emptySubtitle="No hay trámites registrados para la semana seleccionada."
              skeletonVariant="table"
              (retry)="cargarTramites()">
              <app-institutional-table
                [data]="tramites()"
                [columns]="columnas"
                [config]="{ variant: 'compact', hoverable: true, localSort: false }">
              </app-institutional-table>
            </app-async-state-wrapper>

            <footer class="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
              <span>
                {{ tramites().length }} trámites {{ esDemo ? 'ilustrativos ' : '' }}disponibles para actualización.
                @if (totalCambios() > 0) { · {{ totalCambios() }} con cambios pendientes de envío. }
              </span>
              @if (semanaSeleccionada(); as s) {
                <span>Periodo seleccionado: semana {{ s.semana }}</span>
              }
            </footer>
          </div>
        </app-async-state-wrapper>
      </section>
    </div>

    <!-- Acción principal fija -->
    <div class="fixed bottom-4 left-4 z-20">
      <app-institutional-button
        [config]="{
          variant: 'success',
          icon: 'send',
          iconPosition: 'left',
          loading: enviando(),
          disabled: !puedeEnviar(),
          title: puedeEnviar() ? '' : 'Captura el folio, adjunta el oficio PDF y modifica al menos un trámite'
        }"
        (clicked)="enviar()">
        Enviar Modificación Extemporánea a Validación
      </app-institutional-button>
    </div>

    <!-- Modal: modificar cifras -->
    <app-modal
      [isOpen]="!!tramiteEditando()"
      title="Modificar Cifras Extemporáneas"
      [subtitle]="tramiteEditando() ? tramiteEditando()!.clave + ' · ' + tramiteEditando()!.tramite : ''"
      size="md"
      [trapFocus]="true"
      (modalClose)="cerrarEdicion()">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <app-input-enhanced label="Hombres (H)" type="number" [min]="0" [control]="edicion.controls.hombres" [required]="true" [fullWidth]="true"></app-input-enhanced>
        <app-input-enhanced label="Mujeres (M)" type="number" [min]="0" [control]="edicion.controls.mujeres" [required]="true" [fullWidth]="true"></app-input-enhanced>
        <app-input-enhanced label="Otros (O)" type="number" [min]="0" [control]="edicion.controls.otros" [required]="true" [fullWidth]="true"></app-input-enhanced>
      </div>
      @if (edicion.invalid && edicion.touched) {
        <p class="text-xs text-red-700 mt-2" role="alert">Captura números enteros iguales o mayores a 0.</p>
      }
      <div slot="footer" class="flex justify-end gap-2">
        <app-institutional-button [config]="{ variant: 'secondary', size: 'sm' }" (clicked)="cerrarEdicion()">Cancelar</app-institutional-button>
        <app-institutional-button [config]="{ variant: 'primary', size: 'sm', icon: 'check', iconPosition: 'left' }" (clicked)="guardarEdicion()">
          Guardar cambios
        </app-institutional-button>
      </div>
    </app-modal>

    <!-- Plantillas de celdas -->
    <ng-template #claveTpl let-item>
      <span class="font-semibold text-gray-900">{{ item.clave }}</span>
    </ng-template>
    <ng-template #cifrasTpl let-item>
      <span class="inline-flex items-center gap-2">
        <span class="font-mono text-sm">{{ formatoCifras(cifrasDe(item)) }}</span>
        @if (estaModificado(item)) {
          <app-institutional-badge [config]="{ variant: 'warning', size: 'sm' }">Modificado</app-institutional-badge>
        }
      </span>
    </ng-template>
    <ng-template #accionTpl let-item>
      <app-institutional-button
        [config]="{ variant: 'primary', size: 'sm', icon: 'edit_note', iconPosition: 'left', ariaLabel: 'Modificar cifras de ' + item.clave }"
        (clicked)="abrirEdicion(item)">
        Modificar Cifras Extemporáneas
      </app-institutional-button>
    </ng-template>
  `,
})
export class ActualizacionExtemporaneaCifrasComponent implements OnInit {
  private readonly dataSource = inject(ActualizacionExtemporaneaDataSource);
  protected readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('claveTpl', { static: true }) private claveTpl!: TemplateRef<unknown>;
  @ViewChild('cifrasTpl', { static: true }) private cifrasTpl!: TemplateRef<unknown>;
  @ViewChild('accionTpl', { static: true }) private accionTpl!: TemplateRef<unknown>;

  readonly esDemo = this.dataSource.esDemo;
  readonly usuario = this.resolverUsuario();

  // --- Contexto (área y semanas vencidas)
  readonly contexto = signal<ContextoActualizacionDto | null>(null);
  readonly cargandoContexto = signal(false);
  readonly errorContexto = signal<string | null>(null);

  readonly semana = new FormControl<string | null>(null);
  private readonly semanaValor = toSignal(this.semana.valueChanges, { initialValue: null });

  readonly opcionesSemana = computed<SelectOption[]>(() =>
    (this.contexto()?.semanasVencidas ?? []).map(s => ({
      value: semanaKey(s),
      label: `Semana ${s.semana} (${fechaCorta(s.fechaInicio)} - ${fechaCorta(s.fechaFin)})`,
    })),
  );

  readonly semanaSeleccionada = computed<SemanaVencidaDto | null>(() => {
    const key = this.semanaValor();
    return this.contexto()?.semanasVencidas.find(s => semanaKey(s) === key) ?? null;
  });

  // --- Trámites y cambios pendientes
  readonly tramites = signal<TramiteCifrasDto[]>([]);
  readonly cargandoTramites = signal(false);
  readonly errorTramites = signal<string | null>(null);
  readonly cambios = signal<Partial<Record<string, CifrasHMO>>>({});
  readonly totalCambios = computed(() => Object.keys(this.cambios()).length);

  // --- Documento de soporte
  readonly soporte = new FormGroup({
    folio: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    oficio: new FormControl<File | null>(null, [Validators.required, soloPdf]),
  });
  private readonly soporteValido = toSignal(this.soporte.statusChanges, { initialValue: this.soporte.status });

  // --- Edición de cifras
  readonly tramiteEditando = signal<TramiteCifrasDto | null>(null);
  readonly edicion = new FormGroup({
    hombres: new FormControl<number | null>(null, CIFRA_VALIDATORS),
    mujeres: new FormControl<number | null>(null, CIFRA_VALIDATORS),
    otros: new FormControl<number | null>(null, CIFRA_VALIDATORS),
  });

  readonly enviando = signal(false);
  readonly puedeEnviar = computed(() =>
    this.soporteValido() === 'VALID' && this.totalCambios() > 0 && !!this.semanaSeleccionada() && !this.enviando(),
  );

  columnas: TableColumn[] = [];

  ngOnInit(): void {
    this.columnas = [
      { key: 'clave', label: 'Clave', template: this.claveTpl, width: '9rem' },
      { key: 'tramite', label: 'Trámite' },
      { key: 'cifras', label: 'Cifras Actuales (H/M/O)', template: this.cifrasTpl },
      { key: 'accion', label: 'Acción', template: this.accionTpl },
    ];

    this.semana.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Los cambios capturados pertenecen a una semana concreta.
        this.cambios.set({});
        this.cargarTramites();
      });

    this.cargarContexto();
  }

  cargarContexto(): void {
    this.cargandoContexto.set(true);
    this.errorContexto.set(null);
    this.dataSource.getContexto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ctx => {
          this.contexto.set(ctx);
          this.cargandoContexto.set(false);
          const primera = ctx.semanasVencidas[0];
          if (primera) this.semana.setValue(semanaKey(primera));
        },
        error: (e: { message?: string }) => {
          this.cargandoContexto.set(false);
          this.errorContexto.set(e?.message ?? 'No se pudo cargar la información del área.');
        },
      });
  }

  cargarTramites(): void {
    const s = this.semanaSeleccionada();
    if (!s) {
      this.tramites.set([]);
      return;
    }
    this.cargandoTramites.set(true);
    this.errorTramites.set(null);
    this.dataSource.getTramites(s.semana, s.anio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: lista => {
          this.tramites.set(lista);
          this.cargandoTramites.set(false);
        },
        error: (e: { message?: string }) => {
          this.cargandoTramites.set(false);
          this.errorTramites.set(e?.message ?? 'No se pudieron cargar los trámites.');
        },
      });
  }

  /** Cifras capturadas en esta sesión o, si no hay, las registradas. */
  cifrasDe(t: TramiteCifrasDto): CifrasHMO | null {
    return this.cambios()[t.id] ?? t.cifras;
  }

  estaModificado(t: TramiteCifrasDto): boolean {
    return t.id in this.cambios();
  }

  formatoCifras(c: CifrasHMO | null): string {
    return c ? `${c.hombres} / ${c.mujeres} / ${c.otros}` : '— / —';
  }

  abrirEdicion(t: TramiteCifrasDto): void {
    const actual = this.cifrasDe(t);
    this.edicion.reset({
      hombres: actual?.hombres ?? null,
      mujeres: actual?.mujeres ?? null,
      otros: actual?.otros ?? null,
    });
    this.tramiteEditando.set(t);
  }

  cerrarEdicion(): void {
    this.tramiteEditando.set(null);
  }

  guardarEdicion(): void {
    const t = this.tramiteEditando();
    if (!t) return;
    if (this.edicion.invalid) {
      this.edicion.markAllAsTouched();
      return;
    }
    const v = this.edicion.getRawValue();
    this.cambios.update(c => ({
      ...c,
      [t.id]: { hombres: Number(v.hombres), mujeres: Number(v.mujeres), otros: Number(v.otros) },
    }));
    this.cerrarEdicion();
  }

  private resolverUsuario(): { nombre: string; area: string } {
    const user = inject(OidcAuthService).getCurrentUser();
    const emp = user?.employee;
    const nombre = emp
      ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
      : user?.email?.split('@')[0] ?? 'Usuario';
    return { nombre, area: emp?.area?.name ?? '' };
  }

  enviar(): void {
    const s = this.semanaSeleccionada();
    const ctx = this.contexto();
    const oficio = this.soporte.controls.oficio.value;
    if (!this.puedeEnviar() || !s || !ctx || !oficio) {
      this.soporte.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.dataSource.enviarSolicitud(
      {
        areaId: ctx.area.id,
        semana: s.semana,
        anio: s.anio,
        folio: this.soporte.controls.folio.value.trim(),
        cambios: Object.entries(this.cambios()).flatMap(([tramiteId, cifras]) => (cifras ? [{ tramiteId, cifras }] : [])),
      },
      oficio,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.cambios.set({});
          this.soporte.reset({ folio: '', oficio: null });
          this.notifications.success(
            'Solicitud enviada',
            `La modificación de la semana ${s.semana} quedó pendiente de validación por Coordinación Técnica.`,
          );
          this.cargarTramites();
        },
        error: (e: { message?: string }) => {
          this.enviando.set(false);
          this.notifications.error('No se pudo enviar', e?.message ?? 'Intenta de nuevo.');
        },
      });
  }
}
