import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('AuthGuard: Checking authentication for route:', state.url);
    
    // Check if MSAL has an active account
    const hasActiveAccount = this.authService.isAuthenticated;
    console.log('AuthGuard: Has active account:', hasActiveAccount);
    
    if (hasActiveAccount) {
      // If we have an active account, check if we have user data
      return this.authService.currentUser$.pipe(
        take(1),
        map(user => {
          if (user) {
            console.log('AuthGuard: User is authenticated with data:', user);
            return true;
          } else {
            console.log('AuthGuard: Has account but no user data, ensuring user is loaded');
            // Try to load user data
            this.authService.ensureUserLoaded();
            return true; // Allow access while user data loads
          }
        })
      );
    } else {
      console.log('AuthGuard: No active account, redirecting to login');
      // Redirect to login page with return url
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }
  }
}
