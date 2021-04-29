import { UserService } from './../../../../core/services/user/user.service';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: fadeAnimationDefault,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
