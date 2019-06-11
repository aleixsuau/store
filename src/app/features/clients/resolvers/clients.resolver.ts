import { ClientsService } from './../services/clients/clients.service';
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientsResolverService implements Resolve<any> {
  constructor(
    private clientsService: ClientsService,
  ) {}

  resolve(activeRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IClient[]> {
    return this.clientsService.getClients();
  }
}
