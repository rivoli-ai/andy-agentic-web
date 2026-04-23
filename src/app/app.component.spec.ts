/* eslint-env jest */
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/services/auth.service';
import { AppConfigService } from './core/config/app-config.service';
import { ApiStatusService } from './core/services/api-status.service';
import { ThemeService } from './core/services/theme.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ThemeService,
          useValue: {
            setTheme: jest.fn(),
            getCurrentTheme: () => 'light' as const,
            currentTheme$: of('light' as const),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser$: of(null),
            isLoggingOut$: of(false),
            isAuthLoading$: of(false),
            logout: jest.fn().mockResolvedValue(undefined),
            resetLogoutState: jest.fn(),
          },
        },
        {
          provide: ApiStatusService,
          useValue: {
            status$: of({
              isOnline: false,
              lastCheck: new Date(),
              consecutiveFailures: 0,
              isMaintenanceMode: false,
            }),
            forceRetry: jest.fn(),
          },
        },
        { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5000' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have title 'Agentic'`, () => {
    expect(fixture.componentInstance.title).toBe('Agentic');
  });
});
