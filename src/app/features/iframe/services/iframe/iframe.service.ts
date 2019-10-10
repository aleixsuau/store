import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IframeService {
  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
  ) { }

  validateLogin(username: string, password: string) {
    return this.httpClient
                  .post(`${environment.firebase.functions_path}/validateLogin`, { username, password });

  }

  sendResetPasswordEmail(userEmail: string, userFirstName: string, userLastName: string) {
    const data = {
      UserEmail: userEmail,
      UserFirstName: userFirstName,
      UserLastName: userLastName,
    };

    return this.httpClient
                  .post(`${environment.firebase.functions_path}/sendResetPasswordEmail`, data)
                  .pipe(tap(() => this.notificationService.notify('Reset password email sent')));
  }
}
