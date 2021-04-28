import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error',
  templateUrl: './errors.component.html',
  styleUrls: ['./errors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorsComponent implements OnInit {
  routeParams;
  data;

  constructor(
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.routeParams = this.activatedRoute.snapshot.queryParams;
    this.data = this.activatedRoute.snapshot.data;
  }
}
