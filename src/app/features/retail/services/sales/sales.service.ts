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

  sellContract(contract: IContract, client: IClient) {
    return this.httpClient
                  .post<IClient>(`${environment.firebase.functions_path}/clients/${client.UniqueId}/contracts`, contract)
                  .pipe(tap(response => {
                    console.log('addContract response:', response);
                    this.notificationService.notify('Contract Sold');
                  }));
  }
}
