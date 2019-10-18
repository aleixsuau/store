import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IframeService {
  constructor(
    private httpClient: HttpClient,
    private notificationService: NotificationService,
  ) { }

  getRequiredFields() {
    return this.httpClient
                  .get(`${environment.firebase.functions_path}/requiredClientFields`);
  }
}
