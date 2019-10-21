import { ClientsService } from './../../../clients/services/clients/clients.service';
import { UserService } from './../../../../core/services/user/user.service';
import { IframeService } from './../../../iframe/services/iframe/iframe.service';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { Observable, Subscription } from 'rxjs';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { transition, trigger, useAnimation } from '@angular/animations';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { ConfigService } from 'src/app/core/config/service/config.service';

@Component({
  selector: 'app-login-widget',
  templateUrl: './login-widget.component.html',
  styleUrls: ['./login-widget.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        useAnimation(fadeAnimation, {
          delay: 0,
          params: { from: 0, to: 1, time: '500ms' },
        })
      ])
    ])
  ]
})
export class LoginWidgetComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  invalidErrorMessage: boolean;
  keepMeLoggedIn: boolean;
  loginMouseEnter: boolean;
  loginError: boolean;
  loginFormSubscription: Subscription;
  activeUser: IClient;
  resetPassword: boolean;

  appConfig$: Observable<IAppConfig>;

  @Input()  mode: 'admin' | 'iframe';
  @Output() loggedIn = new EventEmitter<IUser | IClient>();
  @Output() loginFailed = new EventEmitter();

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private userService: UserService,
    private clientsService: ClientsService,
  ) { }

  ngOnInit() {
    this.appConfig$ = this.configService.config$;

    this.loginForm = this.formBuilder.group({
      username: [ '', [ Validators.required ]],
      password: [ '', [ Validators.required ]],
      keepMeLoggedIn: false,
    });

    this.activeUser = this.userService.getUser();

    if (this.activeUser && this.activeUser.Email) {
      this.loginForm.get('username').setValue(this.activeUser.Email);
    }

    this.loginFormSubscription = this.loginForm.valueChanges.subscribe(changes => this.loginError = false);
  }

  login(username: string, password: string, keepMeLoggedIn: boolean) {
    // When we are login a user on the Iframe
    // Using the old Mindbody API (5.1)
    if (this.mode === 'iframe') {
      this.authService
            .validateLogin(username, password, keepMeLoggedIn)
            .subscribe(
              (client: IClient) => this.loggedIn.emit(client),
              (error) => this.handleError(error),
            );
    } else {
    // When we are login a user on the admin
      this.authService
              .login(username, password, keepMeLoggedIn)
              .subscribe(
                (authData: IAuthData) => this.loggedIn.emit(authData.User),
                (error) => this.handleError(error),
              );
    }
  }

  handleError(error) {
    this.loginError = true;
    this.loginFailed.emit(null);
    this.notificationService
          .notify(
            `${
                (error.error &&
                error.error.Error &&
                error.error.Error.Message) ||
                (error.error &&
                 error.error.message) ||
                 (error.code && error.message) ||
                 error.error
              }`,
            'X',
            { duration: 10000, panelClass: 'error' }
          );
  }

  sendResetPasswordEmail(userEmail: string) {
    if (!userEmail) {
      this.loginForm.get('username').markAllAsTouched();
      this.resetPassword = true;
      return;
    }

    this.authService
            .sendResetPasswordEmail(userEmail)
            .subscribe(
              response => this.resetPassword = false,
              error => this.notificationService.notify(error.error, 'X', { panelClass: 'error' }),
            );
  }
}

