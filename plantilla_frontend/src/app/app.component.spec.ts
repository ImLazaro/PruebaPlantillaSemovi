import { ChangeDetectorRef } from '@angular/core';
import { Event, NavigationStart, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { AppConfigService } from './core/services/app-config.service';
import { ComponentLoadingService } from './shared/lib/services/component-loading.service';

describe('AppComponent layout visibility', () => {
  function createComponent(initialUrl: string): { component: AppComponent; events$: Subject<Event> } {
    const events$ = new Subject<Event>();

    const routerMock = {
      url: initialUrl,
      events: events$.asObservable(),
    } as Router;

    const appConfigMock = {
      get: jasmine.createSpy('get').and.returnValue(null),
    } as unknown as AppConfigService;

    const componentLoadingMock = {
      globalLoading$: of(false),
      getActiveLoadingStates: jasmine.createSpy('getActiveLoadingStates').and.returnValue([]),
    } as unknown as ComponentLoadingService;

    const cdrMock = {
      detectChanges: jasmine.createSpy('detectChanges'),
    } as unknown as ChangeDetectorRef;

    const component = new AppComponent(
      routerMock,
      {} as never,
      appConfigMock,
      componentLoadingMock,
      cdrMock
    );

    return { component, events$ };
  }

  it('evalúa rutas especiales con una tabla de casos', () => {
    const table = [
      { path: '/auth/callback', shouldShowLayout: false },
      { path: '/404', shouldShowLayout: false },
      { path: '/unauthorized', shouldShowLayout: false },
      { path: '/dashboard', shouldShowLayout: true },
    ];

    for (const { path, shouldShowLayout } of table) {
      expect(AppComponent.isLayoutlessRoute(path)).toBe(!shouldShowLayout);

      const { component } = createComponent(path);
      expect(component.showLayout).withContext(path).toBe(shouldShowLayout);
    }
  });

  it('actualiza el layout en navegación según las rutas especiales', () => {
    const { component, events$ } = createComponent('/dashboard');

    expect(component.showLayout).toBeTrue();

    events$.next(new NavigationStart(1, '/auth/callback'));
    expect(component.showLayout).toBeFalse();
  });
});
