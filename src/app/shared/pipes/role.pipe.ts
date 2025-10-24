import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { RoleService, UserRole } from '../../core/services/role.service';

@Pipe({
  name: 'hasRole',
  pure: false
})
export class HasRolePipe implements PipeTransform {

  constructor(private roleService: RoleService) { }

  transform(requiredRole: UserRole): Observable<boolean> {
    return this.roleService.hasRole(requiredRole);
  }
}

@Pipe({
  name: 'hasAnyRole',
  pure: false
})
export class HasAnyRolePipe implements PipeTransform {

  constructor(private roleService: RoleService) { }

  transform(requiredRoles: UserRole[]): Observable<boolean> {
    return this.roleService.hasAnyRole(requiredRoles);
  }
}

@Pipe({
  name: 'hasWritePermission',
  pure: false
})
export class HasWritePermissionPipe implements PipeTransform {

  constructor(private roleService: RoleService) { }

  transform(): Observable<boolean> {
    return this.roleService.hasWritePermission();
  }
}

@Pipe({
  name: 'hasReadPermission',
  pure: false
})
export class HasReadPermissionPipe implements PipeTransform {

  constructor(private roleService: RoleService) { }

  transform(): Observable<boolean> {
    return this.roleService.hasReadPermission();
  }
}
