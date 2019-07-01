import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ContractsService } from './../../services/contracts/contracts.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContractsResolverService implements Resolve<any> {

  constructor(
    private contractsService: ContractsService,
  ) { }

  resolve(activeRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IContract[]> {
    return this.contractsService.getContracts();
  }
}
