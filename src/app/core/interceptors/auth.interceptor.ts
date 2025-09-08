import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private msalService: MsalService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add token to API requests
    if (req.url.includes('/api/')) {
      console.log('AuthInterceptor: Intercepting API request to:', req.url);
      return from(this.getAccessToken()).pipe(
        switchMap(token => {
          if (token) {
            console.log('AuthInterceptor: Adding token to request');
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next.handle(authReq);
          } else {
            console.warn('AuthInterceptor: No token available for request');
            return next.handle(req);
          }
        })
      );
    }
    return next.handle(req);
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      console.log('AuthInterceptor: Attempting to get access token');
      
      // Ensure MSAL is initialized
      await this.msalService.initialize();
      
      // Try to get active account first
      let account = this.msalService.instance.getActiveAccount();
      console.log('AuthInterceptor: Active account:', account);
      
      // If no active account, try to get all accounts and use the first one
      if (!account) {
        console.log('AuthInterceptor: No active account, checking all accounts');
        const allAccounts = this.msalService.instance.getAllAccounts();
        console.log('AuthInterceptor: All accounts:', allAccounts);
        
        if (allAccounts.length > 0) {
          account = allAccounts[0];
          console.log('AuthInterceptor: Using first available account:', account);
        }
      }
      
      if (!account) {
        console.warn('AuthInterceptor: No account found');
        return null;
      }

      const tokenRequest = {
        scopes: ['api://andy-back/Api.Access'],
        account: account
      };

      console.log('AuthInterceptor: Requesting token with scopes:', tokenRequest.scopes);
      const response = await this.msalService.acquireTokenSilent(tokenRequest).toPromise();
      console.log('AuthInterceptor: Token response:', response ? 'Success' : 'Failed');
      
      return response?.accessToken || null;
    } catch (error) {
      console.error('AuthInterceptor: Failed to get access token:', error);
      return null;
    }
  }
}
