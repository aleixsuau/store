import { BaseModule } from './components/base/base.module';
import { UserService } from './services/user/user.service';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { AuthModule } from './auth/auth.module';
import { LoadingModule } from './loading/loading.module';
import { ErrorsModule } from './errors';
import { NotificationService } from './services/notification/notification.service';
import { HttpClientModule } from '@angular/common/http';
import { NotificationModule } from './services/notification/notification.module';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule,
    BaseModule,
    AuthModule,
    LoadingModule,
    ErrorsModule,
    NotificationModule,
    ReactiveFormsModule,
  ],
  providers: [
    UserService,
  ],
  exports: [
    AuthModule,
    LoadingModule,
    ErrorsModule,
    BrowserAnimationsModule,
  ]
})
export class CoreModule { }
