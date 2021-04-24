import { Injectable } from '@angular/core';

import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef } from '@angular/material/snack-bar';
import { ComponentType } from '@angular/cdk/portal';

@Injectable()
export class NotificationService {

  defaultConfig: MatSnackBarConfig = {
    // You can use .success/.error for success/error(styles.css)
    // or pass other classes to the notification methods
    panelClass: 'success',
    horizontalPosition: 'center',
    verticalPosition: 'top',
    duration: 3000,
  };

  constructor(
    public snackBar: MatSnackBar,
  ) { }

  notify(message: string, action?: string, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    return this.snackBar.open(message, action, {...this.defaultConfig, ...config});
  }

  notifyWithComponent(component: ComponentType<any>, config?: MatSnackBarConfig): MatSnackBarRef<any> {
    return this.snackBar.openFromComponent(component, {...this.defaultConfig, ...config});
  }
}
