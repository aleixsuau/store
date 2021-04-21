
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class UserService {
  private _endPoint = 'user';
  private _user: BehaviorSubject<IUser> = new BehaviorSubject(null);
  readonly user$: Observable<IUser> = this._user.asObservable().pipe(publishReplay(1), refCount());

  constructor(
    private httpClient: HttpClient,
  ) {
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
    const user = this._user.getValue();

    if (user) {
      return user;
    } else {
    }
  }

  getUserFromBackEnd$(username: string) {
    return this.httpClient.get<IUser>(`${environment.petstore.url}/${this._endPoint}/${username}`)
  }
}
