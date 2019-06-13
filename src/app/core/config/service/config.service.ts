import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { publishReplay, refCount, map } from 'rxjs/operators';

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

  constructor(
    private httpClient: HttpClient,
  ) {}

  getConfig(siteId: string) {
    const appConfig: IAppConfig = JSON.parse(localStorage.getItem('mbConfig'));
    this.siteId = siteId;

    if (appConfig) {
      this._config.next(appConfig);

      return of(true);
    } else {
      return this.httpClient
                  .get<IAppConfig>(`${environment.firebase.functions_path}/${this.endPoint}/${siteId}`)
                  .pipe(map(config => this.setConfig(config)));
    }
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
}
