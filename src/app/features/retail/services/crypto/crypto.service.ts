import { Injectable } from '@angular/core';
import * as crypto from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  constructor() { }

  encrypt(data: any, key: string) {

    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }

    return crypto.AES.encrypt(data, key).toString();
  }

  decrypt(data: any, key: string) {
    return JSON.parse(crypto.AES.decrypt(data, key).toString());
  }
}
