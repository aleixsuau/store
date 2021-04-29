import { NotificationService } from './../../../../core/services/notification/notification.service';
import { UserService } from './../../../../core/services/user/user.service';
import { AuthService } from './../../../../core/auth/auth-service/auth.service';
import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
  animations: fadeAnimationDefault,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent implements OnInit {
  form: FormGroup;
  formError: string;
  loginMouseEnter: boolean;
  formFields = [
    {
      key: 'username',
      placeholder: 'Username',
      type: 'text',
      validators: [Validators.required]
    },
    {
      key: 'firstName',
      placeholder: 'First Name',
      type: 'text',
      validators: [Validators.required]
    },
    {
      key: 'lastName',
      placeholder: 'Last Name',
      type: 'text',
      validators: [Validators.required]
    },
    {
      key: 'email',
      placeholder: 'Email',
      type: 'email',
      validators: [
        Validators.required,
        Validators.email,
      ]
    },
    {
      key: 'password',
      placeholder: 'Password',
      type: 'password',
      validators: [Validators.required]
    },
    {
      key: 'phone',
      placeholder: 'Phone',
      type: 'phone',
    },
  ];

  constructor(
    private _formbuilder: FormBuilder,
    private _authService: AuthService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _userService: UserService,
    private _notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    const formGroupConfig = this.formFields
      .reduce((formGroup, { key, validators }) => {
        formGroup = {
          ...formGroup,
          [key]: [null, validators],
        };

        return formGroup;
      }, {});

    this.form = this._formbuilder.group(formGroupConfig);
  }

  onSubmit(formValue: IUser) {
    this._authService
      .signup(formValue)
      .subscribe(() => this.redirectToRoot());
  }

  redirectToRoot() {
    this._notificationService.notify(`Welcome ${this._userService.getUser()?.firstName}`, 'X');
    this._router.navigate([`../`], { relativeTo: this._activatedRoute });
  }
}
