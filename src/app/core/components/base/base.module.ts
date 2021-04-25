import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from './containers/base/base.component';
import { HeaderModule } from '../header/header.module';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';


@NgModule({
  declarations: [
    BaseComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    HeaderModule,
    FlexLayoutModule,
    MatTabsModule,
    MatIconModule,
  ]
})
export class BaseModule { }
