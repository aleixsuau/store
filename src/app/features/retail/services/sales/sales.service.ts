import { UserService } from './../../../../core/services/user/user.service';
import { environment } from 'src/environments/environment';
import { Injectable, Type } from '@angular/core';
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
    private userService: UserService,
  ) { }

  sellContract(contract: IContract, client: IClient, instantPayment: boolean, startDate?: string) {
    const user = this.userService.getUser();
    const userIsAnAdmin = user && user['Type'];
    const dataToSend = {
      contract,
      instantPayment,
      startDate,
      seller: userIsAnAdmin ? user : null,
    };

    return this.httpClient
                  .post<IClient>(`${environment.firebase.functions_path}/clients/${client.UniqueId}/contracts`, dataToSend)
                  .pipe(tap(response => this.notificationService.notify('Contract Sold')));
  }
}
