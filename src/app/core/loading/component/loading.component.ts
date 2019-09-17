// This component is just for showing a global spinner for all the app
// It listens to loadingService wich listens to an http interceptor
// Extend as needed
// @aleixsuau

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoadingService } from '../service/loading.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss']
})
export class LoadingComponent implements OnInit, OnDestroy {
  loading: number;
  loadingSubscription: Subscription;

  constructor(
    private loadingService: LoadingService,
  ) {}

  ngOnInit() {
    this.loadingSubscription = this.loadingService
                                      .loading$
                                      .subscribe(activeCalls => {
                                        setTimeout(() => {
                                          this.loading = activeCalls;
                                        }, 0);
                                      });
  }

  ngOnDestroy() {
    this.loadingSubscription.unsubscribe();
  }
}
