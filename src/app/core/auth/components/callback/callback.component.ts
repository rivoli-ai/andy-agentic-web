import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { AuthService } from '../../services/auth.service';
import { take, finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-auth-callback',
  templateUrl: './callback.component.html',
  styleUrls: ['./callback.component.css'],
})
export class CallbackComponent implements OnInit {
  private static readonly oidcCodeLockPrefix = 'agentic.oidc.code.';

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  statusMessage = signal<string>('Completing login...');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private oidcSecurityService: OidcSecurityService,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.authService.isLoggedIn()) {
      this.loading.set(false);
      void this.router.navigateByUrl('/agents');
      return;
    }

    await this.authService.loadProviderConfig();

    const provider = this.route.snapshot.paramMap.get('provider') ?? '';
    const config = this.authService.getProviderConfig(provider);

    if (!config || config.type !== 'FrontendOidc') {
      this.error.set(`Unknown provider: ${provider}`);
      this.loading.set(false);
      return;
    }

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const errorParam = params['error'];
      const errorDescription = params['error_description'];
      if (errorParam) {
        this.error.set(`${provider} authorization failed: ${errorDescription || errorParam}`);
        this.loading.set(false);
        return;
      }

      const hasCode = typeof window !== 'undefined' && window.location.search.includes('code=');
      const hasState = typeof window !== 'undefined' && window.location.search.includes('state=');
      if (typeof window !== 'undefined' && !hasCode && !hasState) {
        this.error.set('Missing authorization response in URL. Please try signing in again.');
        this.loading.set(false);
        return;
      }

      this.handleOidcCallback(provider);
    });
  }

  private handleOidcCallback(provider: string): void {
    this.statusMessage.set(`Completing ${provider} sign-in...`);
    const url = typeof window !== 'undefined' ? window.location.href : this.router.url;

    const authCode =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('code')
        : null;

    const lockTtlMs = 3 * 60 * 1000;
    let codeLockKey: string | null = null;
    if (authCode) {
      codeLockKey = `${CallbackComponent.oidcCodeLockPrefix}${authCode}`;
      const raw = sessionStorage.getItem(codeLockKey);
      if (raw) {
        const ts = parseInt(raw, 10);
        const fresh = !Number.isNaN(ts) && Date.now() - ts < lockTtlMs;
        if (fresh) {
          if (this.authService.isLoggedIn()) {
            void this.router.navigateByUrl('/agents');
            return;
          }
          this.error.set(
            'This sign-in link was already used. Return to login and start a new sign-in.'
          );
          this.loading.set(false);
          return;
        }
        sessionStorage.removeItem(codeLockKey);
      }
      sessionStorage.setItem(codeLockKey, String(Date.now()));
    }

    this.oidcSecurityService
      .checkAuth(url, provider)
      .pipe(
        take(1),
        finalize(() => {
          if (codeLockKey) sessionStorage.removeItem(codeLockKey);
        })
      )
      .subscribe({
        next: loginResponse => {
          if (!loginResponse.isAuthenticated || !loginResponse.accessToken) {
            this.error.set(
              loginResponse.errorMessage || `${provider} sign-in did not return a token`
            );
            this.loading.set(false);
            return;
          }

          if (typeof window !== 'undefined' && window.history?.replaceState) {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
          }

          const idToken = loginResponse.idToken ?? '';
          const accessToken = loginResponse.accessToken ?? '';

          this.authService.handleOidcTokenLogin(provider, idToken, accessToken).subscribe({
            next: () => {
              this.loading.set(false);
              void this.router.navigateByUrl('/agents');
            },
            error: (err: unknown) => {
              const anyErr = err as { error?: { message?: string }; message?: string };
              this.error.set(anyErr?.error?.message || anyErr?.message || 'Token login failed');
              this.loading.set(false);
            },
          });
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (typeof msg === 'string' && /invalid_grant|54005|already redeemed/i.test(msg)) {
            this.error.set(
              'Sign-in was already completed with this link. Go back to login and sign in again.'
            );
          } else {
            this.error.set(msg || `Failed to complete ${provider} sign-in`);
          }
          this.loading.set(false);
        },
      });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
