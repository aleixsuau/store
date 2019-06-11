import { environment } from './../../../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  headers = {
    'Api-Key': '3daad5cde7ff49588a220ea0736aee92',
    SiteId: '-99',
    Authorization: '96571d42efd84799b9f2169153855715fab3d76d6007428e9c686174db097641',
  };

  constructor(
    private httpClient: HttpClient,
  ) { }

  getClients(): Observable<IClient[]> {
    return this.httpClient
                 .get<IClient[]>(`${environment.firebase.functions_path}/clients`);
  }

  /* getClient(id: string): Observable<IClient> {
    return this.httpClient
                .get<IClient>('https://api.mindbodyonline.com/public/v6/client/clients',
                      {
                        headers: this.headers,
                        params: { ClientId: id },
                      }
                    );
  } */
}
