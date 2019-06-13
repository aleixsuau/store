import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { SharedModule } from './../../shared/shared.module';
import { ErrorsComponent } from './errors-component/errors.component';
import { ErrorsHandler } from './errors-handler/errors-handler';
import { ErrorsService } from './errors-service/errors.service';
import { ServerErrorsInterceptor } from './server-errors-interceptor/server-errors.interceptor';


@NgModule({
  imports: [
    CommonModule,
    SharedModule,
  ],
  declarations: [
    ErrorsComponent
  ],
  providers: [
    ErrorsService,
    {
      provide: ErrorHandler,
      useClass: ErrorsHandler,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ServerErrorsInterceptor,
      multi: true
    },
  ]
})
export class ErrorsModule { }
