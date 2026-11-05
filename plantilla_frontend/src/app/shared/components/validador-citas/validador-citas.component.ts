import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputEnhancedComponent } from '../inputs/input-enhanced/input-enhanced.component';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { ValidacionService, ValidacionResponse } from '../../core/services/validacion.service';

@Component({
  selector: 'app-validador-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule, InputEnhancedComponent],
  template: `
    <div class="validador-container">
      <!-- Cabecera -->
      <div class="header">
        <h2>🔍 Validador de Citas</h2>
        <p>Valida citas por código o escaneando el código QR</p>
      </div>

      <!-- Pestañas de navegación -->
      <div class="tabs">
        <button 
          class="tab" 
          [class.active]="modoActivo === 'codigo'"
          (click)="cambiarModo('codigo')">
          📝 Folio
        </button>
        <button 
          class="tab" 
          [class.active]="modoActivo === 'qr'"
          (click)="cambiarModo('qr')">
          📱 Escanear QR
        </button>
      </div>

      <!-- Modo: Validación por Folio -->
      <div *ngIf="modoActivo === 'codigo'" class="modo-codigo">
        <div class="input-section">
          <app-input-enhanced
            type="text"
            label="Folio de la Cita:"
            [(ngModel)]="codigoInput"
            (ngModelChange)="onCodigoChange()"
            placeholder="Ej: 240924A1B2"
            [state]="codigoInput && !codigoValido ? 'error' : 'default'"
            [noMargin]="true"
            [fullWidth]="true">
          </app-input-enhanced>
          
          <button
            (click)="validarPorFolio()"
            [disabled]="!codigoValido || validando"
            class="btn-validar">
            {{ validando ? '⏳ Validando...' : '🔍 Validar' }}
          </button>
        </div>
        
        <div *ngIf="codigoInput && !codigoValido" class="error-msg">
          ⚠️ El folio debe tener al menos 5 caracteres (letras y números)
        </div>
      </div>

      <!-- Modo: Validación por QR -->
      <div *ngIf="modoActivo === 'qr'" class="modo-qr">
        <div class="qr-section">
          <div class="scanner-container" [class.scanning]="escannerActivo">
            <zxing-scanner
              *ngIf="escannerActivo"
              [formats]="formatosQr"
              [torch]="linternaActiva"
              (scanSuccess)="onQrEscaneado($event)"
              (scanError)="onErrorEscaner($event)"
              (hasDevices)="onDispositivosDetectados($event)"
              class="qr-scanner">
            </zxing-scanner>
            
            <div *ngIf="!escannerActivo" class="scanner-placeholder">
              <div class="qr-icon">📷</div>
              <p>Toca el botón para activar la cámara</p>
            </div>
          </div>

          <div class="scanner-controls">
            <button
              (click)="toggleEscanner()"
              [disabled]="validando"
              class="btn-scanner">
              {{ escannerActivo ? '⏹️ Detener' : '📷 Activar Cámara' }}
            </button>
            
            <button
              *ngIf="escannerActivo && tieneLuz"
              (click)="toggleLinterna()"
              class="btn-linterna">
              {{ linternaActiva ? '💡 Apagar Luz' : '🔦 Encender Luz' }}
            </button>
          </div>

          <div *ngIf="!hayDispositivos && escannerActivo" class="error-msg">
            ❌ No se detectó cámara disponible
          </div>
        </div>
      </div>

      <!-- Resultado de la Validación -->
      <div *ngIf="resultado" class="resultado-section">
        <div class="resultado" [class.success]="resultado.success" [class.error]="!resultado.success">
          <div class="resultado-header">
            <span class="icono">{{ resultado.success ? '✅' : '❌' }}</span>
            <h3>{{ resultado.message }}</h3>
          </div>

          <div *ngIf="resultado.success && resultado.data" class="cita-info">
            <div class="info-card">
              <h4>📋 Información de la Cita</h4>
              <div class="info-grid">
                <div class="info-item">
                  <strong>Folio:</strong>
                  <span class="folio">{{ resultado.data.folio }}</span>
                </div>
                <div class="info-item">
                  <strong>Ciudadano:</strong>
                  <span>{{ resultado.data.nombre }} {{ resultado.data.apellidos }}</span>
                </div>
                <div class="info-item">
                  <strong>Fecha:</strong>
                  <span>{{ formatearFecha(resultado.data.fechaCita) }}</span>
                </div>
                <div class="info-item">
                  <strong>Hora:</strong>
                  <span class="hora">{{ resultado.data.horaCita }}</span>
                </div>
                <div class="info-item">
                  <strong>Trámite:</strong>
                  <span>{{ resultado.data.tramite }}</span>
                </div>
                <div class="info-item">
                  <strong>Módulo:</strong>
                  <span>{{ resultado.data.modulo }}</span>
                </div>
                <div class="info-item">
                  <strong>Estado:</strong>
                  <span class="estado" [class]="'estado-' + resultado.data.estado">
                    {{ formatearEstado(resultado.data.estado) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button (click)="limpiarResultado()" class="btn-nuevo">
            🔄 Nueva Validación
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./validador-citas.component.css']
})
export class ValidadorCitasComponent implements OnInit, OnDestroy {
  modoActivo: 'codigo' | 'qr' = 'codigo';
  
  // Validación por folio
  codigoInput: string = '';
  codigoValido: boolean = false;
  
  // Escáner QR
  escannerActivo: boolean = false;
  linternaActiva: boolean = false;
  tieneLuz: boolean = false;
  hayDispositivos: boolean = false;
  formatosQr = [BarcodeFormat.QR_CODE];
  
  // Estado general
  validando: boolean = false;
  resultado: ValidacionResponse | null = null;

  constructor(private validacionService: ValidacionService) {}

  ngOnInit() {
    // Inicialización si es necesaria
  }

  ngOnDestroy() {
    if (this.escannerActivo) {
      this.escannerActivo = false;
    }
  }

  cambiarModo(modo: 'codigo' | 'qr') {
    this.modoActivo = modo;
    this.limpiarResultado();
    
    if (modo === 'codigo') {
      this.escannerActivo = false;
    }
  }

  onCodigoChange() {
    this.codigoInput = this.validacionService.limpiarFolio(this.codigoInput);
    this.codigoValido = this.validacionService.validarFormatoFolio(this.codigoInput);
  }

  async validarPorFolio() {
    if (!this.codigoValido || this.validando) return;

    this.validando = true;
    this.resultado = null;

    try {
      this.resultado = await this.validacionService.validarPorFolio(this.codigoInput).toPromise();
    } catch (error) {
      this.resultado = {
        success: false,
        message: 'Error de conexión al validar folio'
      };
    } finally {
      this.validando = false;
    }
  }

  toggleEscanner() {
    this.escannerActivo = !this.escannerActivo;
    this.limpiarResultado();
  }

  toggleLinterna() {
    this.linternaActiva = !this.linternaActiva;
  }

  async onQrEscaneado(qrData: string) {
    if (this.validando) return;

    this.validando = true;
    this.escannerActivo = false; // Detener escáner al encontrar QR

    try {
      this.resultado = await this.validacionService.validarPorQr(qrData).toPromise();
    } catch (error) {
      this.resultado = {
        success: false,
        message: 'Error de conexión al validar QR'
      };
    } finally {
      this.validando = false;
    }
  }

  onErrorEscaner(error: unknown) {
  }

  onDispositivosDetectados(dispositivos: boolean) {
    this.hayDispositivos = dispositivos;
  }

  limpiarResultado() {
    this.resultado = null;
    this.codigoInput = '';
    this.codigoValido = false;
    this.validando = false;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearEstado(estado: string): string {
    const estados: { [key: string]: string } = {
      'apartada': 'Apartada',
      'pendiente': 'Pendiente', 
      'confirmada': 'Confirmada',
      'atendida': 'Atendida',
      'cancelada': 'Cancelada',
      'expirada': 'Expirada',
      'no_asistio': 'No Asistió'
    };
    return estados[estado] || estado;
  }
}