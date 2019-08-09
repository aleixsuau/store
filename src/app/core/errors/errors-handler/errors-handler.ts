import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { ErrorsService } from '../errors-service/errors.service';



@Injectable()
export class ErrorsHandler implements ErrorHandler {
  constructor(
    private injector: Injector,
  ) {}

  handleError(error: Error | HttpErrorResponse | IPromiseError) {
    // If the error is IPromiseError, the error is inside rejection
    if (error['rejection']) { error = error['rejection']; }

    const notificationService = this.injector.get<NotificationService>(NotificationService);
    const errorsService = this.injector.get<ErrorsService>(ErrorsService);
    const authService = this.injector.get<AuthService>(AuthService);
    const router = this.injector.get(Router);

    if (!navigator.onLine) {
      // No Internet connection
      const conectionFailMessage = 'No Internet Connection';
      return notificationService.notify(conectionFailMessage, 'X', { duration: 10000, panelClass: 'error' });
    }

    if (error instanceof HttpErrorResponse) {
      // Server or connection error happened
      if (!navigator.onLine) {
        // Handle offline error
        return notificationService.notify('No Internet Connection');
      } else {
        // Handle Http Error (error.status === 403, 404...)
        if (error.status === 401 || error.status === 403) {
          notificationService.notify(`Unauthenticated user: ${error.error || error.message}`, 'X', { duration: 10000, panelClass: 'error' });
          authService.logout();
          return;
        } else if (error.status === 500) {
          notificationService.notify(`ERROR 500: ${error.error || error.message}`,  'X', { duration: 10000, panelClass: 'error' });
          errorsService.log(error).subscribe();
        } else {
          notificationService.notify(`ERROR ${error.status}: ${error.error || error.message}`, 'X', { duration: 10000, panelClass: 'error' });
          errorsService.log(error).subscribe();
        }
      }
    } else {
      // Client Error Happened
      // Send the error to the server and then
      // redirect the user to the page with all the info
      errorsService
          .log(error)
          .subscribe(errorWithContextInfo => {
            router.navigate(['/error'], { queryParams: errorWithContextInfo });
          });
    }
  }
}

