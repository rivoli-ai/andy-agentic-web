import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { RoleService } from '../../core/services/role.service';

@Injectable({
  providedIn: 'root'
})
export class WriteRoleGuard implements CanActivate {

  constructor(
    private roleService: RoleService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.roleService.hasWritePermission().pipe(
      take(1),
      map(hasWritePermission => {
        if (!hasWritePermission) {
          // Redirect to agents page if user doesn't have write permission
          this.router.navigate(['/agents']);
          return false;
        }
        return true;
      })
    );
  }
}
