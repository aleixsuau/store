import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AuthService } from './auth-service/auth.service';
import { AuthGuard } from './auth-guard/auth.guard';

import { AuthInterceptor } from './auth-interceptor/auth.interceptor';

@NgModule({
  imports: [],
  declarations: [],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
  ]
})
export class AuthModule { }
