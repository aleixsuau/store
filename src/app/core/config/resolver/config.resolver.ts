import { ConfigService } from './../service/config.service';
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigResolverService implements Resolve<any> {
  constructor(
    private configService: ConfigService,
  ) {}

  resolve(activeRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IAppConfig> {
    const siteId = activeRoute.params['siteId'];

    return this.configService.getConfig(siteId);
  }
}
