// This component shows a global spinner for all the app
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
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
    private _changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadingSubscription = this.loadingService
      .loading$
      .subscribe(pendingCalls => {
        this.loading = pendingCalls;
        this._changeDetectorRef.detectChanges();
      });
  }

  ngOnDestroy() {
    this.loadingSubscription.unsubscribe();
  }
}
