import { NotificationService } from './../notification/notification.service';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormsService {

  constructor(
    private _notificationService: NotificationService,
  ) { }

  getFilesDataUrls(files: File[]): Observable<string[]> {
    const filesDataUrls$ = files.map(file => this.getFileDataUrl(file));

    return forkJoin(filesDataUrls$);
  }

  getFileDataUrl(file: File): Observable<string> {
    const reader = new FileReader();
    const result$: Subject<string> = new Subject();

    reader.onload = (evt) => {
      if (evt.target.readyState !== 2) {
        return;
      }

      if (evt.target.error) {
        this._notificationService.notify('Error while reading file', 'X', {panelClass: 'error'});

        return;
      }

      result$.next(evt.target.result as string);
      result$.complete();
    };

    reader.readAsDataURL(file);

    return result$.asObservable();
  }
}
