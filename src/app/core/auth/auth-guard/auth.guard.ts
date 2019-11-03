import { UserService } from './../../services/user/user.service';
import { NotificationService } from './../../services/notification/notification.service';
import { ConfigService } from '../../config/service/config.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth-service/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private userService: UserService,
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const siteId = route.params['siteId'] || this.configService.siteId;
    const activeUser = this.userService.getUser();

    if (this.authService.getToken() && activeUser['Type']) {
      return true;
    } else {
      this.notificationService.notify('Unauthenticated user', 'X', { panelClass: 'error' });

      this.router.navigate([`${siteId}/login`]);
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }
}
