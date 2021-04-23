import { Component } from '@angular/core';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent {
  navLinks = [
    { path: 'clients', label: 'clients', icon: 'people' },
    { path: 'retail', label: 'retail', icon: 'shopping_basket' },
    { path: 'orders', label: 'orders', icon: 'monetization_on' },
  ];
}
