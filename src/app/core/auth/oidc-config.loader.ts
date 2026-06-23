import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { LogLevel, OpenIdConfiguration } from 'angular-auth-oidc-client';
import { authApiUrl } from './auth-api-url';

export interface AuthConfigResponse {
  providers: AuthProviderConfig[];
}

export interface AuthProviderConfig {
  name: string;
  type: 'Local' | 'BackendOAuth' | 'FrontendOidc';
  clientId?: string;
  authority?: string;
  scopes?: string;
  tenantId?: string;
}

/**
 * Fetch enabled auth providers from the backend and translate all FrontendOidc
 * providers into `angular-auth-oidc-client` configurations.
 */
export function loadOidcConfigs(
  http: HttpClient,
  apiOrigin: string
): Observable<OpenIdConfiguration[]> {
  return http.get<AuthConfigResponse>(authApiUrl(apiOrigin, '/auth/config')).pipe(
    map(response => {
      const oidcProviders = response.providers.filter(p => p.type === 'FrontendOidc');

      return oidcProviders.map(
        (p): OpenIdConfiguration => ({
          configId: p.name,
          authority: p.authority ?? '',
          clientId: p.clientId ?? '',
          redirectUrl:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback/${p.name}`
              : '',
          scope: p.scopes ?? 'openid profile email',
          responseType: 'code',
          postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
          silentRenew: false,
          useRefreshToken: false,
          ignoreNonceAfterRefresh: true,
          triggerAuthorizationResultEvent: true,
          autoUserInfo: false,
          disableIdTokenValidation: true,
          logLevel: LogLevel.Error,
        })
      );
    }),
    catchError(err => {
      console.warn('Failed to load auth config from backend; OIDC providers unavailable:', err);
      return of([]);
    })
  );
}
