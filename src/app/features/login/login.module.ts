import { LoginComponent } from './../login/containers/login/login.component';
import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { LoginWidgetComponent } from './components/login-widget/login-widget.component';

@NgModule({
  declarations: [
    LoginComponent,
    LoginWidgetComponent,
  ],
  imports: [
    SharedModule,
  ],
  exports: [
    LoginComponent,
    LoginWidgetComponent,
  ]
})
export class LoginModule { }
