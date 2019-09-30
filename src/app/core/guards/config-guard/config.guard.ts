import { NotificationService } from './../../services/notification/notification.service';
import { ConfigService } from '../../config/service/config.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class ConfigGuard implements CanActivate, CanActivateChild {
  constructor(
    private configService: ConfigService,
    private notificationService: NotificationService,
    private router: Router,
  ) { }

  // Always check if the App exists (if it has config)
  // in order to grant access
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivateChild(route, state);
  }

  // Always check if the App exists (if it has config)
  // in order to grant access
  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const siteId = route.params['siteId'] || this.configService.siteId;

    return this.configService
                  .getConfig(siteId)
                  .pipe(
                    map(config => {
                      if (config) {
                        return true;
                      } else {
                        this.notificationService.notify('No app with this id---', 'CLOSE', { panelClass: 'error' });
                        this.router.navigate(['/error'], { queryParams: { message: 'No app with this id', } });
                        return false;
                      }
                    })
                  );
  }


}
