import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { AuthService } from '../../services/auth.service';
import { AuthProviderConfig } from '../../oidc-config.loader';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private oidcSecurityService = inject(OidcSecurityService);

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  sessionExpired = signal<boolean>(false);
  frontendOidcProviders = signal<AuthProviderConfig[]>([]);
  private returnUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const ret = params.get('returnUrl');
    this.returnUrl = ret && ret.startsWith('/') && !ret.startsWith('//') ? ret : null;
    if (params.get('sessionExpired') === '1') {
      this.sessionExpired.set(true);
    }

    if (this.authService.isLoggedIn()) {
      this.navigateAfterLogin();
      return;
    }

    this.loading.set(true);
    const providers = this.authService.providerConfigs().length
      ? this.authService.providerConfigs().filter(p => p.type === 'FrontendOidc')
      : (await this.authService.loadProviderConfig(true)).filter(p => p.type === 'FrontendOidc');
    this.frontendOidcProviders.set(providers);
    if (this.frontendOidcProviders().length === 0) {
      this.error.set(
        `Could not load sign-in providers from ${this.authService.getAuthConfigUrl()}. Is the backend running?`
      );
    }
    this.loading.set(false);
  }

  private navigateAfterLogin(): void {
    void this.router.navigateByUrl(this.returnUrl ?? '/agents');
  }

  loginWithOidc(provider: AuthProviderConfig): void {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.oidcSecurityService.authorize(provider.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to initiate ${provider.name} login`;
      this.error.set(msg);
      this.loading.set(false);
    }
  }

  getProviderDisplayName(provider: AuthProviderConfig): string {
    const nameMap: Record<string, string> = {
      github: 'GitHub',
      azuread: 'Microsoft',
      duende: 'Duende',
    };
    return nameMap[provider.name.toLowerCase()] ?? provider.name;
  }
}
