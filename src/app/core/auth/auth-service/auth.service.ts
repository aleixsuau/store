import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserService } from '../../services/user/user.service';
import { AngularFireAuth } from '@angular/fire/auth';

/**
 * AUTH SYSTEM EXPLANATION:
 *
 * - When the app bootstraps, it tries to read the token from the SessionStorage
 *   or the LocalStorage, if it is not present, it redirects to login.
 *
 * - When the user logs in, the User information is setted in:
 *    - LocalStorage/SessionStorage:
 *      Depending on if the 'Keep me logged' is checked or not, the token
 *      is saved in SessionStorage or in LocalStorage and then it is setted
 *      in UserService.
 *
 *    - UserService:
 *      Reads from and writes to the localStorage the unencrypted user's
 *      info to be consumed from all the app.
 *
 * - The base router state for the app is 'admin', all the admin pages are childs
 *   of 'admin'.
 *
 * - 'admin' state has an canActivate and canActivateChild guard
 *   that ckecks if the user is authenticated (if there is a token in
 *   localStorage or sessionStorage) through AuthService.getToken(). If not, the
 *   user is redirected to 'login' state.
 *
 *   The user's authetication is checked in every route change inside
 *   the 'admin' state.
 *
 *  - There is an HttpInterceptor that hads the token to every http call.
 *
 **/

@Injectable()
export class AuthService {
  // Save the guarded url to redirect to it when the user logs in
  redirectUrl: string;
  endPoint = 'auth';
  private _token: string;

  get token() {
    return this._token;
  }

  constructor(
    private router: Router,
    // private configService: ConfigService,
    private userService: UserService,
    private httpClient: HttpClient,
    private angularFireAuth: AngularFireAuth,
  ) {}

  getUser() {
    return this.angularFireAuth.auth.currentUser;
  }

  login(username: string, password: string): Observable<any> {
    console.log('login', this.httpClient.post, username, password, environment.firebase.functions_path)
    return this.httpClient
                  .post<IAuthData>(`https://us-central1-mindbrody.cloudfunctions.net/${this.endPoint}`, {username, password})
                  /* .pipe(
                    map(authData => {
                      console.log('authData', authData)
                      if (authData.AccessToken) {
                        this._token = authData.AccessToken;
                        this.userService.setUser(authData.User);
                        this.angularFireAuth.auth.signInAnonymously();
                        return authData;
                      } else {
                        return null;
                      }
                    })
                  ) */


    /* return this.httpClient
                    .get(`${this.endPoint}/login`, { params })
                    .pipe(
                      map((token: IAuthToken) => {
                        const tokenData = this.encriptService.jwt.decodeToken(token.access_token);
                        this.setToken(`${token.token_type} ${token.access_token}`, keepMeLoggedIn);
                        this.userService.setUser(tokenData.user);
                        this.configService.setBbdd(tokenData.bbdd);

                        return tokenData;
                      })
                    ); */
  }

  /* logout() {
    this.userService.removeUser();
    // this.configService.removeConfig();
    this.deleteToken();
    this.router.navigate(['login']);
  }

  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  setToken(token, keepMeLoggedIn?) {
    const storage = keepMeLoggedIn ? localStorage : sessionStorage;
    storage.setItem('token', token);
  }

  deleteToken() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  resetPassword(table: string, emailField: string, userId: string) {
    const params = {
      params: {
        table: table,
        emailField: emailField,
        userId: userId
      }
    };
    return this.httpClient.get(`auth/reset-password`, params);
  } */
}
