import { Router, ActivatedRoute } from '@angular/router';
import { fadeAnimation } from '../../../../shared/animations/animations';
import { Component, OnInit } from '@angular/core';
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
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  redirectToRoot() {
    this.router.navigate([`../`], { relativeTo: this.activatedRoute });
  }
}
