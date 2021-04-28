import { NgModule } from '@angular/core';
import { NotificationService } from './notification.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';


@NgModule({
  declarations: [],
  imports: [
    MatSnackBarModule,
  ],
  providers: [
    NotificationService,
  ]
})
export class NotificationModule { }
