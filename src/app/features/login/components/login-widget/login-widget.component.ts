import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { UserService } from './../../../../core/services/user/user.service';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { Subscription } from 'rxjs';
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';

@Component({
  selector: 'app-login-widget',
  templateUrl: './login-widget.component.html',
  styleUrls: ['./login-widget.component.scss'],
  animations: fadeAnimationDefault
})
export class LoginWidgetComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  invalidErrorMessage: boolean;
  keepMeLoggedIn: boolean;
  loginMouseEnter: boolean;
  loginError: boolean;
  loginFormSubscription: Subscription;
  activeUser: IUser;
  resetPassword: boolean;

  @Output() loggedIn = new EventEmitter<IUser>();
  @Output() loginFailed = new EventEmitter();

  constructor(
    private _authService: AuthService,
    private _formBuilder: FormBuilder,
    private _notificationService: NotificationService,
    private _userService: UserService,
  ) { }

  ngOnInit() {
    this.loginForm = this._formBuilder.group({
      username: [ '', [ Validators.required ]],
      password: [ '', [ Validators.required ]],
      keepMeLoggedIn: false,
    });

    this.activeUser = this._userService.getUser();

    if (this.activeUser && this.activeUser.email) {
      this.loginForm.get('username').setValue(this.activeUser.email);
    }

    this.loginFormSubscription = this.loginForm
      .valueChanges
      .subscribe(changes => this.loginError = false);
  }

  login(username: string, password: string, keepMeLoggedIn: boolean) {
    this._authService
      .login(username, password, keepMeLoggedIn)
      .subscribe(
        (user: IUser) => this.loggedIn.emit(user),
        (error) => this.handleError(error),
      );
  }

  handleError(error) {
    this.loginError = true;
    this.loginFailed.emit(null);
    this._notificationService
          .notify(
            `${this.getErrorMessage(error)}`,
            'X',
            { duration: 10000, panelClass: 'error' }
          );
  }

  getErrorMessage(error) {
    return (error.error &&
      error.error.Error &&
      error.error.Error.Message) ||
      (error.error &&
        error.error.message) ||
      (error.code && error.message) ||
      error.error ||
      'Login failed';
  }
}

