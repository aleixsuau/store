import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { UserService } from 'src/app/core/services/user/user.service';
import { Router, ActivatedRoute } from '@angular/router';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component } from '@angular/core';
import { transition, trigger, useAnimation } from '@angular/animations';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        useAnimation(fadeAnimation, {
          delay: 0,
          params: { from: 0, to: 1, time: '500ms' },
        })
      ])
    ])
  ]
})
export class LoginComponent {
  loginMouseEnter: boolean;

  constructor(
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _userService: UserService,
    private _notificationService: NotificationService,
  ) { }

  redirectToRoot() {
    this._notificationService.notify(`Welcome ${this._userService.getUser()?.firstName}`, 'X');
    this._router.navigate([`../`], { relativeTo: this._activatedRoute });
  }
}
