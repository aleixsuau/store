import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  basePath = 'sale';

  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
  ) { }

  sale(contract: IContract) {
    return this.httpClient
                  .post<IClient>(`${environment.firebase.functions_path}/sale`, {Contract: contract})
                  .pipe(tap(newClient => this.notificationService.notify('Contract Sold')));
  }
}
