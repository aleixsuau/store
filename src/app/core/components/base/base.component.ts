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

  constructor(
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.user$ = this.authService.user$;
  }
}
