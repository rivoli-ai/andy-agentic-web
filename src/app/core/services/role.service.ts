import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/services/auth.service';

export enum UserRole {
  Read = 'Read',
  Write = 'Write',
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private rolesSubject = new BehaviorSubject<string[]>([]);
  readonly roles$: Observable<string[]> = this.rolesSubject.asObservable();

  constructor(private authService: AuthService) {
    this.loadRoles();
    this.authService.currentUser$.subscribe(() => this.loadRoles());
  }

  refreshRoles(): void {
    this.loadRoles();
  }

  private loadRoles(): void {
    this.rolesSubject.next(this.authService.extractRoles());
  }

  getUserRoles(): Observable<string[]> {
    return this.roles$;
  }

  hasRole(role: string): Observable<boolean> {
    return this.roles$.pipe(map(roles => roles.includes(role)));
  }

  hasAnyRole(roles: string[]): Observable<boolean> {
    return this.roles$.pipe(map(userRoles => roles.some(role => userRoles.includes(role))));
  }

  hasWritePermission(): Observable<boolean> {
    return this.hasAnyRole(['Write', 'Api.Write']);
  }

  hasReadPermission(): Observable<boolean> {
    return this.hasAnyRole(['Read', 'Write', 'Api.Read', 'Api.Write']);
  }

  getHighestRole(): Observable<UserRole | null> {
    return this.roles$.pipe(
      map(roles => {
        if (roles.includes(UserRole.Write) || roles.includes('Api.Write')) {
          return UserRole.Write;
        }
        if (roles.includes(UserRole.Read) || roles.includes('Api.Read')) {
          return UserRole.Read;
        }
        return null;
      })
    );
  }
}
