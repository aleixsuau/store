import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../service/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  activeCalls = 0;

  constructor(
    private injector: Injector,
    private loadingService: LoadingService,
  ) {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.loadingService.loading = ++this.activeCalls;

    return next
            .handle(request)
            .pipe(
              finalize(() => {
                this.loadingService.loading = --this.activeCalls;
              }),
            );
  }
}
