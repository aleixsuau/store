import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { publishReplay, refCount } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private _loading: BehaviorSubject<number> = new BehaviorSubject(0);
  readonly loading$: Observable<number> = this._loading.asObservable().pipe(publishReplay(1), refCount());

  set loading(activeCalls) {
    this._loading.next(activeCalls);
  }
}
