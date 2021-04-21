import { UserService } from './../../../../core/services/user/user.service';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { Observable, Subscription } from 'rxjs';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { transition, trigger, useAnimation } from '@angular/animations';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';

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
  activeUser: IUser;
  resetPassword: boolean;

  @Output() loggedIn = new EventEmitter<IUser>();
  @Output() loginFailed = new EventEmitter();

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: [ '', [ Validators.required ]],
      password: [ '', [ Validators.required ]],
      keepMeLoggedIn: false,
    });

    this.activeUser = this.userService.getUser();

    if (this.activeUser && this.activeUser.email) {
      this.loginForm.get('username').setValue(this.activeUser.email);
    }

    this.loginFormSubscription = this.loginForm
      .valueChanges
      .subscribe(changes => this.loginError = false);
  }

  login(username: string, password: string, keepMeLoggedIn: boolean) {
    this.authService
      .login(username, password, keepMeLoggedIn)
      .subscribe(
        (user: IUser) => this.loggedIn.emit(user),
        (error) => this.handleError(error),
      );
  }

  handleError(error) {
    this.loginError = true;
    this.loginFailed.emit(null);
    this.notificationService
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

