import { ConfigService } from './../../config/service/config.service';
import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, publishReplay, refCount } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';

/**
 * AUTH SYSTEM EXPLANATION:
 * - The base router state for the app is the ':siteId', all pages are childs
 *   of ':siteId'.
 *
 * - All ':siteId' childs but 'login' have a canActivate and canActivateChild guard
 *   that ckecks if the user is authenticated through this.authService.activeUserSession().
 *   This method uses Firebase Auth to create an anonymous sessions that allows the user
 *   access the app.
 *
 * - The user's authetication is checked in every route change inside the ':siteId' state.
 *   If is not authenticated, the user is redirected to the 'login' state.
 *
 *  - The auth.interceptor attaches this siteId and the auth token to the headers of every
 *    communication with the server.
 *
 * - The auth session process works like this:
 *    - The user log in with Username and Password and SiteId (we get it from the route)
 *    - The data is sent to the Firebase Cloud Function 'auth'.
 *    - It finds the apiKey for the siteId on our database (private, only used inside the server)
 *    - It logs in in MindBody with the user data and returns the IAppConfig (token + IUser)
 *        - The token allows the user to read from the MindBody API (Through our Firebase Cloud Functions)
 *        - The token (and the siteId) will be attached to every communications (auth.interceptor).
 *    - The app starts a FireBase anonymous session wich will allow the user to access all the app.
 *    - If MindBody fires an Unauthorized error (403), the app logs out the user from the app.
 *
 * - All the MindBody data operations are done through our FireBase Cloud Functions so we keep the control
 * of the data flow (counters, caché, modifications...).
 **/

@Injectable()
export class AuthService {
  private _endPoint = 'auth';
  private _token: string;

  get token() {
    return this._token;
  }

  private _user: BehaviorSubject<IUser> = new BehaviorSubject(null);
  readonly user$: Observable<IUser> = this._user.asObservable().pipe(publishReplay(1), refCount());

  constructor(
    private httpClient: HttpClient,
    private angularFireAuth: AngularFireAuth,
    private router: Router,
    private configService: ConfigService,
  ) {}

  activeUserSession() {
    return this.angularFireAuth.auth.currentUser;
  }

  login(username: string, password: string): Observable<IAuthData> {
    return this.httpClient
                  .post<IAuthData>(`${environment.firebase.functions_path}/${this._endPoint}`, {username, password})
                  .pipe(
                    map(response => {
                      if (response.AccessToken) {
                        this._token = response.AccessToken;
                        this._user.next(response.User);
                        this.angularFireAuth.auth.signInAnonymously();

                        return response;
                      } else {
                        throw new Error(`${response['Error'].Code}: ${response['Error'].Message}`);
                      }
                    })
                  )
  }

  logout() {
    this.angularFireAuth.auth.signOut();
    this._user.next(null);
    this.router.navigate([`${this.configService.siteId}/login`]);
  }
}
