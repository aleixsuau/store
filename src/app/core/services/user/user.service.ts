
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { publishReplay, refCount, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class UserService {
  private _endPoint = 'user';
  private _user: BehaviorSubject<IUser> = new BehaviorSubject(null);
  readonly user$: Observable<IUser> = this._user.asObservable().pipe(publishReplay(1), refCount());

  constructor(
    private httpClient: HttpClient,
  ) {
    const user = JSON.parse(localStorage.getItem('appUser') || sessionStorage.getItem('appUser'));
    this._user.next(user);
  }

  setUser(user: IUser) {
    localStorage.setItem('appUser', JSON.stringify(user));
    this._user.next(user);
  }

  removeUser() {
    localStorage.removeItem('appUser');
    this._user.next(null);
  }

  getUser(): IUser {
    const user = this._user.getValue();

    return user;
  }

  getUserFromBackEnd$(username: string) {
    return this.httpClient
      .get<IUser>(`${environment.api.url}/${this._endPoint}/${username}`)
      .pipe(
        tap(user => {
          this._user.next(user);
          this.setUser(user);
        }),
      );
  }
}
