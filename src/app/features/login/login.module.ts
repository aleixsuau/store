import { LoginComponent } from './../login/containers/login/login.component';
import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    LoginComponent,
  ],
  imports: [
    SharedModule,
  ],
  exports: [
    LoginComponent,
  ]
})
export class LoginModule { }
