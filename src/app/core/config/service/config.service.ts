import { MomentService } from './../../services/moment/moment.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { publishReplay, refCount, map, tap } from 'rxjs/operators';

/** CONFIG SERVICE EXPLANATION
 * Before loading any route, the app resolves the app's config (see app-routing.module)
 * From this config it takes its siteId and all its customs values to custom appearance...
 * The siteId is necessary to:
 * - Communicate with MindBody
 * - Find its apiKey (private, only used inside the server)
 * The auth.interceptor attaches this siteId and the auth token to the headers of every
 * communication.
 */

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  endPoint = 'config';
  private _siteId: string;

  private _config = new BehaviorSubject<IAppConfig>(null);
  readonly config$ = this._config.asObservable().pipe(publishReplay(1), refCount());

  set siteId(id: string) {
    this._siteId = id;
  }

  get siteId() {
    return this._siteId;
  }

  get config() {
    return this._config.getValue();
  }

  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
    private momentService: MomentService,
  ) {}

  getConfig(siteId: string) {
    const appConfig: IAppConfig = JSON.parse(localStorage.getItem('mbConfig'));
    this.siteId = siteId;

    if (appConfig && appConfig.id === siteId) {
      this._config.next(appConfig);
      this.refreshConfig(siteId).subscribe();

      return of(appConfig);
    } else {
      this.removeConfig();
      return this.refreshConfig(siteId);
    }
  }

  refreshConfig(siteId: string) {
    return this.httpClient
                .get<IAppConfig>(`${environment.firebase.functions_path}/${this.endPoint}/${siteId}`)
                .pipe(map(config => this.setConfig(config)));
  }

  setConfig(config: IAppConfig) {
    localStorage.setItem('mbConfig', JSON.stringify(config));
    this._config.next(config);

    return config;
  }

  removeConfig() {
    localStorage.removeItem('mbConfig');
    this._config.next(null);
  }

  // TEST FUNCTIONAITY
  setTodayMock(date: Date) {
    const dateToSet = this.momentService.moment(date).endOf('day').toISOString();

    return this.httpClient
                  .post(`${environment.firebase.functions_path}/${this.endPoint}/${this.siteId}`, dateToSet)
                  .pipe(tap(response => this.notificationService.notify('Mocked date setted', 'X')));
  }
}
