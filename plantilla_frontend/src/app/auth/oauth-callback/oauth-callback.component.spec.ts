import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { OAuthCallbackComponent } from './oauth-callback.component';
import { OidcAuthService } from '../../core/auth';

describe('OAuthCallbackComponent', () => {
  let fixture: ComponentFixture<OAuthCallbackComponent>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    routerSpy.navigateByUrl.and.resolveTo(true);

    const oidcAuthServiceSpy = jasmine.createSpyObj<OidcAuthService>('OidcAuthService', [
      'handleAuthCallback',
      'initiateLoginRedirect',
    ]);

    await TestBed.configureTestingModule({
      imports: [OAuthCallbackComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {
                error: 'access_denied',
                error_description: '<script>alert("xss")</script>mensaje malicioso',
              },
            },
          },
        },
        { provide: Router, useValue: routerSpy },
        { provide: OidcAuthService, useValue: oidcAuthServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OAuthCallbackComponent);
  });

  it('ignora error_description de query params y muestra solo el mensaje local por errorCode', () => {
    fixture.detectChanges();

    const renderedText = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(renderedText).toContain('Cancelaste el inicio de sesión o no autorizaste el acceso. Puedes intentarlo nuevamente.');
    expect(renderedText).not.toContain('<script>alert("xss")</script>mensaje malicioso');
    expect(renderedText).not.toContain('mensaje malicioso');
  });
});
