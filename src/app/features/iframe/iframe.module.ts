import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IframeRoutingModule } from './iframe-routing.module';
import { IframeComponent } from './containers/iframe/iframe.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatStepperModule,
        MatFormFieldModule,
        MatRadioModule,
        MatDatepickerModule,
        MatSelectModule,
        MatInputModule,
        MatTabsModule
      } from '@angular/material';
import { ReactiveFormsModule } from '@angular/forms';
import { PipesModule } from 'src/app/shared/pipes/pipes.module';
import { LoginModule } from '../login/login.module';

@NgModule({
  declarations: [IframeComponent],
  imports: [
    CommonModule,
    IframeRoutingModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatStepperModule,
    MatRadioModule,
    MatDatepickerModule,
    MatSelectModule,
    MatInputModule,
    MatTabsModule,
    PipesModule,
    MatFormFieldModule,
    LoginModule,
  ]
})
export class IframeModule { }
