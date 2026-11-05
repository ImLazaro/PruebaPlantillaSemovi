import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { OidcAuthService } from '../../core/auth';
import { AppConfigService } from '../../core/services/app-config.service';
import { InstitutionalCardComponent } from '../../shared/components/institutional-card/institutional-card.component';
import { InstitutionalButtonComponent } from '../../shared/components/buttons/institutional-button/institutional-button.component';
import { UniversalIconComponent } from '../../shared/components/universal-icon/universal-icon.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    InstitutionalCardComponent,
    InstitutionalButtonComponent,
    UniversalIconComponent,
  ],
  template: `
    <main class="welcome-shell min-h-screen px-4 sm:px-6 lg:px-8">
      <section class="welcome-container mx-auto w-full max-w-3xl">
        <app-institutional-card
          [config]="{
            variant: 'standard',
            size: 'auto',
            showHeader: true,
            showFooter: true,
            showShadow: true,
            showBorder: false,
            customClass: 'w-full welcome-card'
          }">
          <div slot="header" class="text-center">
            <div class="welcome-icon-wrap mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl">
              <app-universal-icon
                [name]="'shield-lock-fill'"
                [type]="'bootstrap'"
                [size]="48"
                customClass="text-white">
              </app-universal-icon>
            </div>

            <p class="welcome-chip mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <app-universal-icon
                [name]="'verified'"
                [size]="16"
                customClass="text-institucional-primario">
              </app-universal-icon>
              Acceso institucional seguro
            </p>

            <h1 class="text-3xl font-bold text-institucional-primario sm:text-4xl">
              Bienvenido a {{ applicationName }}
            </h1>
            <p class="mx-auto mt-3 max-w-xl text-sm text-gray-600 sm:text-base">
              Inicio automatico desactivado temporalmente. Usa el acceso manual para continuar.
            </p>
          </div>

          <div class="welcome-info-grid grid gap-3 sm:grid-cols-2">
            <article class="welcome-info-item rounded-xl p-3">
              <div class="mb-1 flex items-center gap-2 text-sm font-semibold text-institucional-primario">
                <app-universal-icon [name]="'lock'" [size]="18"></app-universal-icon>
                Proteccion activa
              </div>
              <p class="text-xs text-gray-600 sm:text-sm">Tu autenticacion usa OAuth 2.1 y verificacion de seguridad reforzada.</p>
            </article>

            <article class="welcome-info-item rounded-xl p-3">
              <div class="mb-1 flex items-center gap-2 text-sm font-semibold text-institucional-primario">
                <app-universal-icon [name]="'forward'" [size]="18"></app-universal-icon>
                Acceso inmediato
              </div>
              <p class="text-xs text-gray-600 sm:text-sm">Pulsa el boton principal para iniciar sesion manualmente.</p>
            </article>
          </div>

          <div slot="footer" class="w-full">
            <app-institutional-button
              [config]="{
                variant: 'primary',
                fullWidth: true,
                loading: starting,
                icon: 'login',
                iconPosition: 'left',
                customClass: 'w-full'
              }"
              (clicked)="startLogin()">
              Iniciar sesion
            </app-institutional-button>

            <p class="mt-3 text-center text-xs text-gray-500">
              Si ya tienes una sesion activa y navegas a una ruta protegida, seras llevado al dashboard.
            </p>
          </div>
        </app-institutional-card>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .welcome-shell {
        display: grid;
        place-items: center;
        background: transparent;
      }

      .welcome-container {
        width: 100%;
      }

      .welcome-card {
        border-top: 4px solid var(--institucional-primario);
      }

      .welcome-icon-wrap {
        background: linear-gradient(135deg, var(--institucional-primario), var(--institucional-vino));
        box-shadow: 0 10px 25px rgba(98, 17, 50, 0.25);
      }

      .welcome-chip {
        background: rgba(98, 17, 50, 0.08);
        color: var(--institucional-primario);
      }

      .welcome-info-item {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(98, 17, 50, 0.12);
      }
    `,
  ],
})
export class WelcomeComponent implements OnInit {
  private readonly authService = inject(OidcAuthService);
  private readonly appConfig = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly AUTO_START_AUTH = Boolean(environment.oauth?.autoStartAuth);

  applicationName = 'Portal de Identidad';
  starting = false;

  private resolveApplicationName(): string {
    const fromConfigTitle = this.appConfig.get('title')?.trim();
    const fromEnvironment = (
      (environment as Record<string, unknown>)['appName'] as string | undefined
    )?.trim();

    return fromConfigTitle || fromEnvironment || 'Portal de Identidad';
  }

  ngOnInit(): void {
    this.applicationName = this.resolveApplicationName();

    this.authService.authState$
      .pipe(
        filter((state) => !state.isLoading),
        take(1),
      )
      .subscribe((state) => {
        if (state.isAuthenticated) {
          void this.router.navigate(['/dashboard']);
          return;
        }

        // Redireccion automática temporalmente desactivada.
        if (this.AUTO_START_AUTH) {
          void this.startLogin();
        }
      });
  }

  async startLogin(): Promise<void> {
    if (this.starting) {
      return;
    }

    this.starting = true;
    try {
      await this.authService.initiateLoginRedirect('/dashboard');
    } finally {
      this.starting = false;
    }
  }
}
