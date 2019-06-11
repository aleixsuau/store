import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth-service/auth.service';
import { ConfigService } from '../../services/config/config.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private authService: AuthService;
  private configService: ConfigService;

  constructor(
    private injector: Injector,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.authService = this.injector.get(AuthService);
    this.configService = this.injector.get(ConfigService);

    console.log('intercept', this.authService.token, this.configService.siteId)

    const authReq = request.clone({
      setHeaders: {
        Authorization: this.authService.token || null,
        siteId: this.configService.siteId || null,
      }
    });

    return next.handle(authReq);
  }
}
