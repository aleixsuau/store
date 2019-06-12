import { Observable } from 'rxjs';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit, HostBinding } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { transition, trigger, useAnimation } from '@angular/animations';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { ConfigService } from 'src/app/core/config/service/config.service';

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

  appConfig$: Observable<IAppConfig>;


  @HostBinding('@fade') fade = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private configService: ConfigService,
  ) { }

  ngOnInit() {
    this.appConfig$ = this.configService.config$;

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
                this.router.navigate([`../`], { relativeTo: this.activatedRoute });
              },
              (error) => {
                this.invalidErrorMessage = true;
              }
            );
  }

}
