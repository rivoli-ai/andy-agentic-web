import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export enum UserRole {
  Read = 'Read',
  Write = 'Write'
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private rolesSubject = new BehaviorSubject<string[]>([]);
  public roles$: Observable<string[]> = this.rolesSubject.asObservable();

  constructor(private msalService: MsalService) {
    this.loadRoles();
    this.msalService.instance.addEventCallback((event) => {
      if (event.eventType === 'msal:loginSuccess' || event.eventType === 'msal:acquireTokenSuccess') {
        this.loadRoles();
      }
    });
  }

  private loadRoles(): void {
    const activeAccount = this.msalService.instance.getActiveAccount();
    if (activeAccount && activeAccount.idTokenClaims) {
      const roles = (activeAccount.idTokenClaims as any).roles || [];
      this.rolesSubject.next(roles);
    } else {
      this.rolesSubject.next([]);
    }
  }

  /**
   * Get the current user's roles from Azure AD token
   */
  getUserRoles(): Observable<string[]> {
    return this.roles$;
  }

  /**
   * Check if the current user has a specific role
   */
  hasRole(role: string): Observable<boolean> {
    return this.roles$.pipe(
      map(roles => roles.includes(role))
    );
  }

  /**
   * Check if the current user has any of the specified roles
   */
  hasAnyRole(roles: string[]): Observable<boolean> {
    return this.roles$.pipe(
      map(userRoles => roles.some(role => userRoles.includes(role)))
    );
  }

  /**
   * Check if the current user has write permissions
   */
  hasWritePermission(): Observable<boolean> {
    return this.hasAnyRole(['Write']);
  }

  /**
   * Check if the current user has read permissions
   */
  hasReadPermission(): Observable<boolean> {
    return this.hasAnyRole(['Read', 'Write']);
  }

  /**
   * Get the highest role the user has
   */
  getHighestRole(): Observable<UserRole | null> {
    return this.roles$.pipe(
      map(roles => {
        if (roles.includes(UserRole.Write)) {
          return UserRole.Write;
        } else if (roles.includes(UserRole.Read)) {
          return UserRole.Read;
        } else {
          return null;
        }
      })
    );
  }
}
