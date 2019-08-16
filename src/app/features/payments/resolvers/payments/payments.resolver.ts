import { PaymentsService } from './../../services/payments/payments.service';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentsResolverService implements Resolve<any> {
  constructor(
    private paymentsService: PaymentsService,
  ) {}

  resolve(activeRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IPayment[]> {
    return this.paymentsService.getPayments();
  }
}
