import { environment } from './../../../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  constructor(
    private httpClient: HttpClient,
  ) { }

  getClients(): Observable<IClient[]> {
    return this.httpClient
                 .get<IClient[]>(`${environment.firebase.functions_path}/clients`);
  }
}
