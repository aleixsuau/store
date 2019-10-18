import { NotificationService } from './../../services/notification/notification.service';
import { UserService } from '../../services/user/user.service';
import { ConfigService } from './../../config/service/config.service';
import { environment } from './../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable,  } from 'rxjs';
import { map, tap } from 'rxjs/operators';

/**
 * AUTH SYSTEM EXPLANATION:
 * - The base router state for the app is the ':siteId', all pages are childs
 *   of ':siteId'.
 *
 * - All ':siteId' childs but 'login' have a canActivate and canActivateChild guard
 *   that ckecks if the user is authenticated through this.authService.getToken().
 *
 * - The user's authetication is checked in every route change inside the ':siteId' state.
 *   If is not authenticated, the user is redirected to the 'login' state.
 *
 *  - The auth.interceptor attaches this siteId and the auth token to the headers of every
 *    communication with the server.
 *
 * - The auth session process works like this:
 *    - The user log in with Username and Password and SiteId (we get it from the route)
 *    - The data is sent to the Firebase 'auth' Cloud Function.
 *    - It finds the apiKey for the siteId on our database (private, only used inside the server)
 *    - It logs in into MindBody with the user data and returns the IAppConfig (IUser + token)
 *        - The User data is saved in the UserService and in localStorage/sessionStorage.
 *        - The token is saved in localStorage/sessionStorage
 *            - The token allows the user to read from the MindBody API (Through our Firebase Cloud Functions)
 *            - The token (and the siteId) will be attached to every communications (auth.interceptor).
 *    - If MindBody fires an Unauthorized error (403), the app logs out the user from the app; removes token,
 *      user and config (from services and localStorage/sessionStorage) and redirects to the login page.
 *
 * - All the MindBody data operations are done through our FireBase Cloud Functions so we keep the control
 * of the data flow (counters, caché, modifications...).
 **/

@Injectable()
export class AuthService {
  private _endPoint = 'auth';

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private configService: ConfigService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {}

  login(username: string, password: string, keepMeLoggedIn: boolean): Observable<IAuthData> {
    return this.httpClient
                  .post<IAuthData>(`${environment.firebase.functions_path}/${this._endPoint}`, {username, password})
                  .pipe(
                    map(response => {
                      if (response.AccessToken) {
                        this.setToken(response.AccessToken, keepMeLoggedIn);
                        this.userService.setUser(response.User);

                        return response;
                      } else {
                        throw new Error(`${response['Error'].Code}: ${response['Error'].Message}`);
                      }
                    })
                  );
  }

  logout() {
    const siteId = this.configService.siteId;
    this.deleteToken();
    this.userService.removeUser();
    this.router.navigate([`${siteId}/login`]);
  }

  getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  setToken(token, keepMeLoggedIn?) {
    const storage = keepMeLoggedIn ? localStorage : sessionStorage;
    // Remove previous/other user's tokens
    this.deleteToken();
    storage.setItem('token', token);
  }

  deleteToken() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  // Validate the login of a user against Mindbody (iframe)
  validateLogin(username: string, password: string, keepMeLoggedIn?: boolean): Observable<IClient> {
    return this.httpClient
                  .post(`${environment.firebase.functions_path}/validateLogin`, { username, password })
                  .pipe(map((response: any) => {
                    this.userService.setUser(response.client);

                    return response.client;
                  }));
  }

  sendResetPasswordEmail(userEmail: string, userFirstName?: string, userLastName?: string) {
    const data = {
      UserEmail: userEmail,
      UserFirstName: userFirstName,
      UserLastName: userLastName,
    };

    return this.httpClient
                  .post(`${environment.firebase.functions_path}/sendResetPasswordEmail`, data)
                  .pipe(tap(() => this.notificationService.notify(`Reset password email sent to ${userEmail}`)));
  }
}
