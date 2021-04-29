import { AuthService } from './../../../../auth/auth-service/auth.service';
import { UserService } from './../../../../services/user/user.service';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  user$: Observable<IUser>;
  showUserMenu = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.user$ = this.userService.user$;
  }

  logOut() {
    this.authService.logout();
  }
}
