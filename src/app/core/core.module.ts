import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { AuthModule } from './auth/auth.module';
import { ConfigService } from './config/service/config.service';
import { BaseComponent } from './components/base/base.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [BaseComponent],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    AuthModule,
    RouterModule,
  ],
  providers: [
    ConfigService,
  ]
})
export class CoreModule { }
