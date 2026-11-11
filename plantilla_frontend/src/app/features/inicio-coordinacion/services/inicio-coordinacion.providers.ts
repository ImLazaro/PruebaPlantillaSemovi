import { Provider } from '@angular/core';
import { InicioCoordinacionDataSource } from './inicio-coordinacion.data-source';
import { InicioCoordinacionApiService } from './inicio-coordinacion-api.service';
import { InicioCoordinacionMockService } from './inicio-coordinacion-mock.service';

export interface InicioCoordinacionProviderOptions {
  /** `true` usa datos ilustrativos; `false` consume `environment.apiUrl`. */
  useMock: boolean;
}

export function provideInicioCoordinacion(options: InicioCoordinacionProviderOptions): Provider[] {
  return [
    {
      provide: InicioCoordinacionDataSource,
      useClass: options.useMock ? InicioCoordinacionMockService : InicioCoordinacionApiService,
    },
  ];
}
