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

  getClients(offset?: number): Observable<IClientsResponse> {
    return this.httpClient
                 .get<IClientsResponse>(`${environment.firebase.functions_path}/${this.basePath}?limit=${this.configService.config.queryLimit}&offset=${offset || 0}`);
  }

  getClient(id: string): Observable<IClient> {
    return this.httpClient
                 .get<IClient>(`${environment.firebase.functions_path}/${this.basePath}?ClientIds=${id}`);
  }

  addClient(client: IClient): Observable<IClient> {
    return this.httpClient
                 .post<IClient>(`${environment.firebase.functions_path}/clients`, {Client: client})
                 .pipe(tap(newClient => this.notificationService.notify('New client created')));
  }

  updateClient(client: IClient): Observable<IClient> {
    return this.httpClient
                 .patch<IClient>(`${environment.firebase.functions_path}/clients/${client.Id}`, {Client: client});
  }
}
