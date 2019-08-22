import { environment } from './../../../../../environments/environment';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ContractsService {
  basePath = 'contracts';

  constructor(
    private httpClient: HttpClient,
  ) { }

  getContracts(): Observable<IContract[]> {
    return this.httpClient
                  .get<IContract[]>(`${environment.firebase.functions_path}/${this.basePath}`);
  }
}



