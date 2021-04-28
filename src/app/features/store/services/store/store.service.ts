import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private _endPoint = 'pet';

  constructor(
    private _httpClient: HttpClient,
    private _notificationService: NotificationService,
  ) { }

  query(queryParams: string): Observable<IStoreItem[]> {
    const params = new HttpParams({fromString: queryParams});

    return this._httpClient
      .get<IStoreItem[]>(
        `${environment.api.url}/${this._endPoint}/findByStatus`,
        {params}
      );
  }

  add(item: IStoreItem): Observable<IStoreItem> {
    return this._httpClient
      .post<IStoreItem>(
        `${environment.api.url}/${this._endPoint}`,
        item,
      )
      .pipe(
        tap(() => this._notificationService.notify('Item added'))
      );
  }
}
