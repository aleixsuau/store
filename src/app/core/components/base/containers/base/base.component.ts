import { Component } from '@angular/core';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent {
  navLinks = [
    { path: 'store', label: 'Pets', icon: 'pets' },
    { path: 'store/add', label: 'Add pet', icon: 'add_circle_outline' },
  ];
}
