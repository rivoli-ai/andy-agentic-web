import { Injectable, inject, Injector } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly injector = inject(Injector);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const authService = this.injector.get(AuthService);
    const router = this.injector.get(Router);
    const token = authService.getToken();
    const usesAppJwt = !req.headers.has('Authorization');
    const attachJwt = Boolean(token && usesAppJwt && !shouldSkipBearerForAnonymousAuth(req.url));

    const outgoing = attachJwt
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(outgoing).pipe(
      catchError((err: unknown) => {
        if (
          err instanceof HttpErrorResponse &&
          err.status === 401 &&
          attachJwt &&
          shouldRedirectOnUnauthorized(req.url, authService)
        ) {
          this.handleSessionExpired(authService, router);
        }
        return throwError(() => err);
      })
    );
  }

  private handleSessionExpired(authService: AuthService, router: Router): void {
    authService.clearSession();
    const current = router.url || '/';
    if (current.startsWith('/login')) return;
    void router.navigate(['/login'], {
      replaceUrl: true,
      queryParams: { returnUrl: current, sessionExpired: '1' },
    });
  }
}

function shouldRedirectOnUnauthorized(url: string, authService: AuthService): boolean {
  if (!authService.isLoggedIn()) return false;
  if (/\/auth\/config(\?|$|#)/i.test(url)) return false;
  if (/\/auth\/[^/]+\/token(\?|$|#)/i.test(url)) return false;
  return true;
}

function shouldSkipBearerForAnonymousAuth(url: string): boolean {
  return (
    /\/api\/auth\/config(\?|$|#)/i.test(url) ||
    /\/api\/auth\/[^/]+\/token(\?|$|#)/i.test(url) ||
    /\/auth\/config(\?|$|#)/i.test(url) ||
    /\/auth\/[^/]+\/token(\?|$|#)/i.test(url)
  );
}
