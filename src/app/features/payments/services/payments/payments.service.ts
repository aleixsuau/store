import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  basePath = 'payments';

  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
  ) { }

  getPayments(params?): Observable<IPayment[]> {
    return this.httpClient
                  .get<IPayment[]>(`${environment.firebase.functions_path}/${this.basePath}`, { params });
  }

  refundPayment(paymentId: string) {
    return this.httpClient
                  .post<IPayment[]>(`${environment.firebase.functions_path}/${this.basePath}/${paymentId}/refund`, null)
                  .pipe(tap(response => this.notificationService.notify('Payment refunded')));
  }
}
