import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private _siteId: string;

  set siteId(id: string) {
    this._siteId = id;
  }

  get siteId() {
    return this._siteId;
  }
}
