import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { OidcAuthService } from './oidc-auth.service';
import { NotificationService } from '../../shared/lib/services/notification.service';
import { PkceService } from './pkce.service';

describe('OidcAuthService token persistence policy', () => {
  let service: OidcAuthService;
  let routerMock: { navigateByUrl: jasmine.Spy };

  const pkceMock: Pick<PkceService, 'clearAll'> = {
    clearAll: jasmine.createSpy('clearAll'),
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    routerMock = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true),
    };

    TestBed.configureTestingModule({
      providers: [
        OidcAuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: routerMock,
        },
        {
          provide: NotificationService,
          useValue: {
            warning: jasmine.createSpy('warning'),
          },
        },
        {
          provide: PkceService,
          useValue: pkceMock,
        },
      ],
    });

    service = TestBed.inject(OidcAuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });


  it('logout("/profile") finaliza navegando a /profile y no a /dashboard', (done) => {
    service.logout('/profile').subscribe({
      next: () => {
        expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/profile');
        expect(routerMock.navigateByUrl).not.toHaveBeenCalledWith('/dashboard');
        done();
      },
      error: done.fail,
    });
  });

  it('never persists access_token or refresh_token in localStorage/sessionStorage', () => {
    const setItemSpy = spyOn(Storage.prototype, 'setItem').and.callThrough();

    (service as unknown as { storeTokens: (response: unknown) => void }).storeTokens({
      access_token: 'access-token-test',
      refresh_token: 'refresh-token-test',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const persistedCalls = setItemSpy.calls
      .allArgs()
      .filter(([key, value]) => {
        const serialized = `${key} ${String(value)}`.toLowerCase();
        return serialized.includes('access-token-test') || serialized.includes('refresh-token-test');
      });

    expect(persistedCalls.length).toBe(0);
    expect(storageContainsValue(sessionStorage, 'access-token-test')).toBeFalse();
    expect(storageContainsValue(sessionStorage, 'refresh-token-test')).toBeFalse();
    expect(storageContainsValue(localStorage, 'access-token-test')).toBeFalse();
    expect(storageContainsValue(localStorage, 'refresh-token-test')).toBeFalse();

    service.clearSession();

    expect(storageContainsValue(sessionStorage, 'access-token-test')).toBeFalse();
    expect(storageContainsValue(sessionStorage, 'refresh-token-test')).toBeFalse();
    expect(storageContainsValue(localStorage, 'access-token-test')).toBeFalse();
    expect(storageContainsValue(localStorage, 'refresh-token-test')).toBeFalse();
  });
});

function storageContainsValue(storage: Storage, expectedValue: string): boolean {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    if ((storage.getItem(key) ?? '').includes(expectedValue)) {
      return true;
    }
  }

  return false;
}
