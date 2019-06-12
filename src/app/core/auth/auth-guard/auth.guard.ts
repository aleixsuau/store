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
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const siteId = route.params['siteId'];
    this.configService.siteId = siteId;

    const url: string = state.url;

    if (this.authService.activeUserSession()) {
      return true;
    } else {
      this.router.navigate([`${siteId}/login`]);
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }
}
