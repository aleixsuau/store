import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit, HostBinding } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { transition, trigger, useAnimation } from '@angular/animations';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
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
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  invalidErrorMessage: boolean;
  keepMeLoggedIn: boolean;

  @HostBinding('@fade') fade = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: [ '', [ Validators.required ]],
      password: [ '', [ Validators.required ]],
    });

    this.loginForm
          .valueChanges
          .subscribe(() => {
            this.invalidErrorMessage = false;
          });
  }

  login(username: string, password: string) {
    this.authService
            .login(username, password)
            .subscribe(
              () => {
                const redirectUrl = this.authService.redirectUrl || '';
                this.router.navigate([redirectUrl]);
              },
              (error) => {
                this.invalidErrorMessage = true;
              }
            );
  }
}
