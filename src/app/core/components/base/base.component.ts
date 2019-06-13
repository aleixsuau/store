import { AuthService } from './../../auth/auth-service/auth.service';
import { UserService } from './../../user/user.service';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent implements OnInit {
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
