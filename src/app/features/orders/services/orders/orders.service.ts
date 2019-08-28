import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  basePath = 'orders';

  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
  ) { }

  getOrders(params?): Observable<IOrder[]> {
    return this.httpClient
                  .get<IOrder[]>(`${environment.firebase.functions_path}/${this.basePath}`, { params });
  }

  refundOrder(orderId: string) {
    return this.httpClient
                  .post<IOrder[]>(`${environment.firebase.functions_path}/${this.basePath}/${orderId}/refund`, null)
                  .pipe(tap(response => this.notificationService.notify('Order refunded')));
  }

  // TEST FUNCIONALITY
  triggerBillingCycle() {
    return this.httpClient
                  .post<IOrder[]>(`${environment.firebase.functions_path}/${this.basePath}/trigger`, null)
                  .pipe(tap(response => this.notificationService.notify('Billing Cycle Started')));
  }
}
