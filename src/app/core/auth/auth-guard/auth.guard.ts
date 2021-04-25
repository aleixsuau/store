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
    if (this.authService.getToken()) {
      const activeUser = this.userService.getUser();

      this.notificationService.notify(`Welcome ${activeUser.firstName}`, 'X');

      return true;
    } else {
      this.notificationService.notify('Unauthenticated user', 'X', { panelClass: 'error' });

      this.router.navigate([`login`]);

      return false;
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }
}
