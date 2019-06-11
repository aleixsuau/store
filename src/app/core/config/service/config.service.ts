import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

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
    this.siteId = siteId;

    return this.httpClient.get<IAppConfig>(`${environment.firebase.functions_path}/${this.endPoint}/${siteId}`);
  }
}
