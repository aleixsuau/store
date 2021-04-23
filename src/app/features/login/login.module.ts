import { FlexLayoutModule } from '@angular/flex-layout';
import { CommonModule } from '@angular/common';
import { FocusModule } from 'src/app/shared/directives/focus/focus.module';
import { LoginComponent } from './../login/containers/login/login.component';
import { NgModule } from '@angular/core';
import { LoginWidgetComponent } from './components/login-widget/login-widget.component';
import { MatCardModule } from '@angular/material/card';
import { LoginRoutingModule } from './login-routing.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    LoginComponent,
    LoginWidgetComponent,
  ],
  imports: [
    LoginRoutingModule,
    CommonModule,
    FocusModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    ReactiveFormsModule,
    FlexLayoutModule,
  ],
  exports: [
    LoginComponent,
    LoginWidgetComponent,
  ]
})
export class LoginModule { }
