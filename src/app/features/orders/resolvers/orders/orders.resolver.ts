import { OrdersService } from '../../services/orders/orders.service';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrdersResolverService implements Resolve<any> {
  constructor(
    private ordersService: OrdersService,
  ) {}

  resolve(activeRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<IOrder[]> {
    return this.ordersService.getOrders();
  }
}
