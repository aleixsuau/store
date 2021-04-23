import { environment } from 'src/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private _endPoint = 'pet';

  constructor(
    private _httpClient: HttpClient,
  ) { }

  query(queryParams: string): Observable<IStoreItem[]> {
    const params = new HttpParams({fromString: queryParams});

    return this._httpClient
      .get<IStoreItem[]>(
        `${environment.api.url}/${this._endPoint}/findByStatus`,
        {params}
      );
  }
}
