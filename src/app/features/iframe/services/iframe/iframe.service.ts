import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IframeService {
  constructor(
    private httpClient: HttpClient,
  ) { }

  getRequiredFields() {
    return this.httpClient
                  .get(`${environment.firebase.functions_path}/requiredClientFields`);
  }
}
