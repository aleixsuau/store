
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';

@Injectable()
export class UserService {
  private _user: BehaviorSubject<IUser> = new BehaviorSubject(null);
  readonly user$: Observable<IUser> = this._user.asObservable().pipe(publishReplay(1), refCount());

  constructor() {
    const user = JSON.parse(localStorage.getItem('mbUser') || sessionStorage.getItem('mbUser'));
    this._user.next(user);
  }

  setUser(user: IUser) {
    localStorage.setItem('mbUser', JSON.stringify(user));
    this._user.next(user);
  }

  removeUser() {
    localStorage.removeItem('mbUser');
    this._user.next(null);
  }

  getUser(): IUser {
    return this._user.getValue();
  }
}
