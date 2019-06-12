import { ConfigService } from './../../config/service/config.service';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent implements OnInit {
  user$: Observable<IUser>;
  appConfig$: Observable<IAppConfig>;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  ngOnInit() {
    this.user$ = this.authService.user$;
    this.appConfig$ = this.configService.config$;
  }
}
