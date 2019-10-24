import { ConfigService } from './../../../../core/config/service/config.service';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { environment } from './../../../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  basePath = 'clients';

  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) { }

  getClients(offset?: number, SearchText?: string): Observable<IClientsResponse> {
    let url = `${environment.firebase.functions_path}/${this.basePath}?limit=${this.configService.config.queryLimit}&offset=${offset || 0}`;

    if (SearchText) { url = `${environment.firebase.functions_path}/${this.basePath}?SearchText=${SearchText}`; }

    return this.httpClient
                 .get<IClientsResponse>(url);
  }

  getClient(id?: string): Observable<IClient> {
    return this.httpClient
                 .get<IClient>(`${environment.firebase.functions_path}/${this.basePath}?ClientIds=${id}`);
  }

  addClient(client: IClient): Observable<IClient> {
    return this.httpClient
                 .post<IClient>(`${environment.firebase.functions_path}/clients`, {Client: client})
                 .pipe(tap(newClient => this.notificationService.notify('New client created', 'X')));
  }

  updateClient(client: IClient): Observable<IClient> {
    return this.httpClient
                 .patch<IClient>(`${environment.firebase.functions_path}/clients/${client.Id}`, {Client: client})
                 .pipe(tap(newClient => this.notificationService.notify('Client updated', 'X')));
  }

  getClientContracts(id?: string): Observable<IMindBroClientContract[]> {
    return this.httpClient
                 .get<IMindBroClientContract[]>(`${environment.firebase.functions_path}/${this.basePath}/${id}/contracts`)
                //  .pipe(map((contracts: IMindBroClient['contracts']) => Object.values(contracts)));
  }

  updateClientContract(clientId: string, contractId: string, data: any) {
    return this.httpClient
                  .patch<IContract>(`${environment.firebase.functions_path}/${this.basePath}/${clientId}/contracts/${contractId}`, data)
                  .pipe(tap(newClient => this.notificationService.notify('Contract updated', 'X')));
  }

  // TEST FUNCIONALITY
  changeClientCard(client: IClient, card: any) {
    const {name, ...cardToSend} = card;
    const dataToSend = {
      credit_card: cardToSend,
      client,
    };

    return this.httpClient
                  .post(`${environment.firebase.functions_path}/${this.basePath}/change_card`, dataToSend)
                  .pipe(tap(newClient => this.notificationService.notify('Client Card Updated', 'X')));
  }
}
