import { UserService } from './services/user/user.service';
import { SharedModule } from './../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { AuthModule } from './auth/auth.module';
import { BaseComponent } from './components/base/base.component';
import { LoadingModule } from './loading/loading.module';
import { ErrorsModule } from './errors';
import { NotificationService } from './services/notification/notification.service';
import { HttpClientModule } from '@angular/common/http';
import { HeaderModule } from './components/header/header.module';

@NgModule({
  declarations: [BaseComponent],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule,
    AuthModule,
    LoadingModule,
    SharedModule,
    ErrorsModule,
    HeaderModule,
  ],
  providers: [
    UserService,
    NotificationService,
  ],
  exports: [
    AuthModule,
    LoadingModule,
    ErrorsModule,
    BrowserAnimationsModule,
  ]
})
export class CoreModule { }
