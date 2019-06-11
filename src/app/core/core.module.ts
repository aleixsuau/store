import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { AuthModule } from './auth/auth.module';
import { UserService } from './services/user/user.service';
import { ConfigService } from './services/config/config.service';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    AuthModule,
  ],
  providers: [
    UserService,
    ConfigService,
  ]
})
export class CoreModule { }
