import { UserService } from '../../services/user/user.service';
import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable,  } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

/**
 * AUTH SYSTEM:
 * - The base router state for the app is the '', all pages are childs of it.
 *
 * - All childs but 'login' have a canActivate and canActivateChild guard
 *   that ckecks if the user is authenticated through this.authService.getToken().
 *
 * - The user's authetication is checked in every route change inside the '' state.
 *   If is not authenticated, the user is redirected to the 'login' state.
 *
 *  - The auth.interceptor attaches this auth token to the headers of every
 *    communication with the server.
 *
 * - The auth session process works like this:
 *    - The user logs in with Username and Password
 *    - The data is sent to the server and logs in.
 *    - If the login is successful,
 *        - The User data is saved in the UserService and in localStorage/sessionStorage.
 *        - The token is saved in localStorage/sessionStorage
*         - The token (and the siteId) will be attached to every communications (auth.interceptor).
 *    - If the backend fires an Unauthorized error (403), the app logs out the user from the app; removes token,
 *      user and config (from services and localStorage/sessionStorage) and redirects to the login page.
 **/

@Injectable()
export class AuthService {
  private _endPoint = 'user';

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private userService: UserService,
  ) {}

  signup(userData: IUser): Observable<IAPIResponse> {
    return this.httpClient
      .post<IAPIResponse>(`${environment.api.url}/${this._endPoint}`, userData)
      .pipe(
        map(response => {
          if (response.code === 200) {
            this.setToken(userData.username);
            this.userService.setUser(userData);

            return response;
          } else {
            throw new Error(`${response.code}: ${response.message}`);
          }
        })
      );
  }

  login(username: string, password: string, keepMeLoggedIn: boolean): Observable<IUser> {
    const params = { username, password };

    return this.httpClient
      .get<IAPIResponse>(`${environment.api.url}/${this._endPoint}/login`, { params })
      .pipe(
        switchMap(response => {
          if (response.code === 200) {
            return this.userService.getUserFromBackEnd$(username);
          } else {
            throw new Error(`${response['Error'].Code}: ${response['Error'].Message}`);
          }
        }),
        tap(user => this.setToken(username, keepMeLoggedIn)),
      );
  }

  logout() {
    return this.httpClient
      .get<IAPIResponse>(`${environment.api.url}/${this._endPoint}/logout`)
      .subscribe(() => {
        this.deleteToken();
        this.userService.removeUser();
        this.router.navigate([`login`]);
      });
  }

  getToken() {
    return sessionStorage.getItem('appToken') || localStorage.getItem('appToken');
  }

  setToken(token, keepMeLoggedIn?) {
    const storage = keepMeLoggedIn ? localStorage : sessionStorage;
    // Remove previous/other user's tokens
    this.deleteToken();
    storage.setItem('appToken', token);
  }

  deleteToken() {
    localStorage.removeItem('appToken');
    sessionStorage.removeItem('appToken');
  }
}
