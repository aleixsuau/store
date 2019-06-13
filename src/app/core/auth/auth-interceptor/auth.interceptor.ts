import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpHeaders } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth-service/auth.service';
import { ConfigService } from '../../config/service/config.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService: AuthService;
  private configService: ConfigService;

  constructor(
    private injector: Injector,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.authService = this.injector.get(AuthService);
    this.configService = this.injector.get(ConfigService);

    const authReq = request.clone({
      setHeaders: {
        Authorization: this.authService.getToken() || '',
        siteId: this.configService.siteId || '',
      },
    });

    return next.handle(authReq);
  }
}
