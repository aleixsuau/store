import { UserService } from './../../services/user/user.service';
import { NotificationService } from './../../services/notification/notification.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private userService: UserService,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const activeUser = this.userService.getUser();

    if (this.authService.getToken()) {
      return true;
    } else {
      this.notificationService.notify('Unauthenticated user', 'X', { panelClass: 'error' });

      this.router.navigate([`login`]);
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }
}
