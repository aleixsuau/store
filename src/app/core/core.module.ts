import { UserService } from './user/user.service';
import { SharedModule } from './../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { AuthModule } from './auth/auth.module';
import { ConfigService } from './config/service/config.service';
import { BaseComponent } from './components/base/base.component';
import { RouterModule } from '@angular/router';
import { LoadingModule } from './loading/loading.module';

@NgModule({
  declarations: [BaseComponent],
  imports: [
    BrowserModule,
    CommonModule,
    RouterModule,
    BrowserAnimationsModule,
    AuthModule,
    LoadingModule,
    SharedModule,
  ],
  providers: [
    ConfigService,
    UserService,
  ],
  exports: [
    AuthModule,
    LoadingModule,
  ]
})
export class CoreModule { }
