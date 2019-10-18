import { Router, ActivatedRoute } from '@angular/router';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit } from '@angular/core';
import { transition, trigger, useAnimation } from '@angular/animations';
import { ConfigService } from 'src/app/core/config/service/config.service';
import { Observable } from 'rxjs';

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
  appConfig$: Observable<IAppConfig>;

  constructor(
    private configService: ConfigService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.appConfig$ = this.configService.config$;
  }

  redirectToLogin() {
    this.router.navigate([`../`], { relativeTo: this.activatedRoute });
  }
}
