import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { PaginationMeta } from '@/app/core/models/dto';
import {
  AlertaModificacionDto,
  CumplimientoSemanalDto,
  ResumenAreasDto,
  ValidarAlertaDto,
} from '../models/inicio-coordinacion.models';
import { InicioCoordinacionDataSource } from './inicio-coordinacion.data-source';

export interface SeccionState<T> {
  loading: boolean;
  error: string | null;
  data: T;
}

export const CUMPLIMIENTO_PAGE_SIZE = 6;
export const ALERTAS_PAGE_SIZE = 10;

const EMPTY_META: PaginationMeta = {
  page: 1, limit: 0, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
};

interface ApiError { message?: string }

/**
 * Estado de la pantalla Inicio Coordinación (señales).
 * Se provee a nivel de ruta, por lo que vive mientras la pantalla está activa.
 */
@Injectable()
export class InicioCoordinacionStore {
  private readonly dataSource = inject(InicioCoordinacionDataSource);
  private readonly destroyRef = inject(DestroyRef);

  readonly resumen = signal<SeccionState<ResumenAreasDto | null>>({ loading: false, error: null, data: null });
  readonly cumplimiento = signal<SeccionState<CumplimientoSemanalDto[]>>({ loading: false, error: null, data: [] });
  readonly cumplimientoMeta = signal<PaginationMeta>(EMPTY_META);
  readonly alertas = signal<SeccionState<AlertaModificacionDto[]>>({ loading: false, error: null, data: [] });
  readonly alertasMeta = signal<PaginationMeta>(EMPTY_META);
  readonly alertasActualizadas = signal<Date | null>(null);

  cargarTodo(): void {
    this.cargarResumen();
    this.cargarCumplimiento(1);
    this.cargarAlertas(1);
  }

  cargarResumen(): void {
    this.resumen.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => this.resumen.set({ loading: false, error: null, data }),
        error: (e: ApiError) => this.resumen.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  cargarCumplimiento(page: number): void {
    this.cumplimiento.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getCumplimiento({ page, limit: CUMPLIMIENTO_PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.cumplimiento.set({ loading: false, error: null, data: res.data });
          this.cumplimientoMeta.set(res.meta);
        },
        error: (e: ApiError) => this.cumplimiento.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  cargarAlertas(page: number): void {
    this.alertas.update(s => ({ ...s, loading: true, error: null }));
    this.dataSource.getAlertas({ page, limit: ALERTAS_PAGE_SIZE, sort: 'fechaHora', order: 'DESC' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.alertas.set({ loading: false, error: null, data: res.data });
          this.alertasMeta.set(res.meta);
          this.alertasActualizadas.set(new Date());
        },
        error: (e: ApiError) => this.alertas.update(s => ({ ...s, loading: false, error: mensaje(e) })),
      });
  }

  /** Valida una alerta y actualiza la fila localmente con la respuesta del backend. */
  validarAlerta(id: string, body: ValidarAlertaDto): Observable<AlertaModificacionDto> {
    return this.dataSource.validarAlerta(id, body).pipe(
      tap(actualizada => this.alertas.update(s => ({
        ...s,
        data: s.data.map(a => (a.id === actualizada.id ? actualizada : a)),
      }))),
    );
  }
}

function mensaje(e: ApiError): string {
  return e?.message || 'No se pudo obtener la información.';
}
