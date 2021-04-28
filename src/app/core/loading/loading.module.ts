// This module contains all the elements needed for a global app spinner
// The component listens to the loadingService which listens to an http interceptor
// that emits the number of http active calls

import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LoadingComponent } from './component/loading.component';
import { LoadingInterceptor } from './interceptor/interceptor.service';
import { LoadingService } from './service/loading.service';

@NgModule({
  imports: [
    CommonModule,
    MatProgressBarModule,
  ],
  declarations: [
    LoadingComponent,
  ],
  exports: [
    LoadingComponent,
  ],
  providers: [
    LoadingService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
  ]
})
export class LoadingModule { }
