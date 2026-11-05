import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, Event } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { LayoutWrapperComponent } from './shared/layout/layout-wrapper.component';
import { NotificationContainerComponent } from './shared/components/notification-container/notification-container.component';
import { NotificationService } from './shared/lib/services/notification.service';
import { AppConfigService } from './core/services/app-config.service';
import { LoadingModalComponent, LoadingConfig } from './shared/components/modals/loading-modal/loading-modal.component';
import { ComponentLoadingService } from './shared/lib/services/component-loading.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutWrapperComponent, CommonModule, NotificationContainerComponent, LoadingModalComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Frontend Template';

  private static readonly layoutlessRoutes = new Set(['/', '/404', '/unauthorized', '/auth/callback']);

  // Inicializar showLayout INMEDIATAMENTE usando validación estática
  showLayout: boolean = AppComponent.shouldShowLayoutStatic();

  constructor(private router: Router, private notificationService: NotificationService, private appConfig: AppConfigService, private componentLoading: ComponentLoadingService, private cdr: ChangeDetectorRef) {
    // Doble validación para máxima seguridad
    this.showLayout = this.shouldShowLayout(this.router.url);

    // Escuchar TODOS los eventos de navegación para capturar redirecciones
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationEnd | NavigationStart =>
          event instanceof NavigationEnd || event instanceof NavigationStart
        )
      )
      .subscribe((event: NavigationEnd | NavigationStart) => {
        // Actualizar en NavigationStart para redirecciones inmediatas
        if (event instanceof NavigationStart) {
          this.showLayout = this.shouldShowLayout(event.url);
          this.cdr.detectChanges();
        }
        // Confirmar en NavigationEnd para navegación normal
        if (event instanceof NavigationEnd) {
          this.showLayout = this.shouldShowLayout(event.url);

          // Verificación específica para redirecciones a 404
          if (event.url === '/404' || event.urlAfterRedirects === '/404') {
            this.showLayout = false;
          }
          this.cdr.detectChanges();
        }
      });

    // Aplicar título y favicon desde la configuración de la aplicación
    try {
      const title = this.appConfig.get('title');
      if (title) {
        document.title = title;
      }

      const logo = this.appConfig.get('logo');
      if (logo) {
        const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
          link.href = logo;
        }
      }
    } catch (e) {
      // En entornos de servidor o tests document puede no existir; ignorar errores
    }
  }

  // Estado del modal de carga global
  loadingOpen = false;
  loadingConfig: LoadingConfig = { title: 'Procesando', message: 'Por favor espera...', preventClose: true };
  private loadingSub: Subscription | null = null;
  private layoutCheckTimer: ReturnType<typeof setTimeout> | null = null;

  private static normalizePath(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  static isLayoutlessRoute(path: string): boolean {
    return AppComponent.layoutlessRoutes.has(path);
  }

  // Método estático para validación ultra-temprana
  private static shouldShowLayoutStatic(): boolean {
    const currentPath = AppComponent.normalizePath(window.location.pathname);
    return !AppComponent.isLayoutlessRoute(currentPath);
  }

  private getInitialLayoutState(): boolean {
    const currentPath = AppComponent.normalizePath(window.location.pathname);
    return !AppComponent.isLayoutlessRoute(currentPath);
  }

  ngOnInit(): void {
    // Verificación adicional al inicializar el componente (por si acaso)
    this.showLayout = this.getInitialLayoutState() && this.shouldShowLayout(this.router.url);

    // Verificación extra para redirecciones lentas (envuelta en setTimeout para evitar NG0100)
    this.layoutCheckTimer = setTimeout(() => {
      this.showLayout = this.shouldShowLayout(this.router.url);
      this.cdr.detectChanges();
    }, 0);

    // Suscribirse al estado de carga global
    this.loadingSub = this.componentLoading.globalLoading$.subscribe(isLoading => {
      this.loadingOpen = !!isLoading;
      if (isLoading) {
        const states = this.componentLoading.getActiveLoadingStates();
        if (states && states.length > 0) {
          // tomar el mensaje del primer estado activo
          this.loadingConfig.message = states[0].message || this.loadingConfig.message;
          this.loadingConfig.title = states[0].component || this.loadingConfig.title;
        }
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.layoutCheckTimer !== null) {
      clearTimeout(this.layoutCheckTimer);
      this.layoutCheckTimer = null;
    }
    if (this.loadingSub) {
      this.loadingSub.unsubscribe();
      this.loadingSub = null;
    }
  }

  private shouldShowLayout(url: string): boolean {
    const cleanPath = AppComponent.normalizePath(url);
    return !AppComponent.isLayoutlessRoute(cleanPath);
  }
}
