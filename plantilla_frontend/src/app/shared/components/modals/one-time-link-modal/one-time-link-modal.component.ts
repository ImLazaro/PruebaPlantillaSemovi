import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';
import { InstitutionalButtonComponent } from '../../buttons/institutional-button/institutional-button.component';

@Component({
  selector: 'app-one-time-link-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ModalComponent, InstitutionalButtonComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      title="Enlace de un solo uso generado"
      subtitle="Comparte este enlace con el usuario para que acceda al sistema"
      size="md"
      [showCloseButton]="true"
      (closed)="close()">

      <!-- Cuerpo del modal -->
      <div class="space-y-4">

        <!-- Ícono informativo -->
        <div class="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <span class="material-symbols-outlined text-blue-600 text-2xl flex-shrink-0">link</span>
          <p class="text-sm text-blue-800">
            Este enlace es válido para un solo uso. Una vez utilizado quedará inactivo.
          </p>
        </div>

        <!-- URL del enlace -->
        <div class="space-y-1">
          <label class="block text-sm font-medium text-gray-700">Enlace generado</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 overflow-hidden">
              <p class="text-sm font-mono text-gray-800 break-all select-all leading-relaxed">{{ link }}</p>
            </div>
          </div>
        </div>

        <!-- Estado de copia -->
        <div *ngIf="copyStatus === 'success'"
             class="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span class="material-symbols-outlined text-base">check_circle</span>
          <span>Enlace copiado al portapapeles</span>
        </div>
        <div *ngIf="copyStatus === 'error'"
             class="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <span class="material-symbols-outlined text-base">warning</span>
          <span>No se pudo acceder al portapapeles. Selecciona el enlace y cópialo manualmente.</span>
        </div>

      </div>

      <!-- Footer con acciones -->
      <div slot="footer" class="flex flex-wrap justify-end gap-3">

        <app-institutional-button
          *ngIf="canShare"
          [config]="{
            variant: 'secondary',
            icon: 'share',
            iconPosition: 'left',
            size: 'md'
          }"
          (clicked)="share()">
          Compartir
        </app-institutional-button>

        <app-institutional-button
          [config]="{
            variant: 'primary',
            icon: copyStatus === 'success' ? 'check_circle' : 'content_copy',
            iconPosition: 'left',
            size: 'md'
          }"
          (clicked)="copy()">
          {{ copyStatus === 'success' ? 'Copiado' : 'Copiar enlace' }}
        </app-institutional-button>

        <app-institutional-button
          [config]="{
            variant: 'secondary',
            size: 'md'
          }"
          (clicked)="close()">
          Cerrar
        </app-institutional-button>

      </div>
    </app-modal>
  `
})
export class OneTimeLinkModalComponent {
  @Input() isOpen = false;
  @Input() link = '';

  @Output() closed = new EventEmitter<void>();

  copyStatus: 'idle' | 'success' | 'error' = 'idle';

  private readonly cdr = inject(ChangeDetectorRef);

  get canShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
      this.copyStatus = 'success';
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copyStatus = 'idle';
        this.cdr.markForCheck();
      }, 3000);
    } catch {
      this.copyStatus = 'error';
      this.cdr.markForCheck();
    }
  }

  async share(): Promise<void> {
    if (!this.canShare) return;
    try {
      await navigator.share({
        title: 'Enlace de acceso al sistema',
        text: 'Utiliza este enlace de un solo uso para acceder al sistema:',
        url: this.link
      });
    } catch {
      // El usuario canceló el diálogo de compartir — no es un error
    }
  }

  close(): void {
    this.copyStatus = 'idle';
    this.closed.emit();
  }
}
