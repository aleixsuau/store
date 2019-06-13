import { environment } from './../../../../environments/environment.prod';
import { ConfigService } from 'src/app/core/config/service/config.service';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import * as StackTraceParser from 'error-stack-parser';
import { UserService } from './../../services/user/user.service';


@Injectable()
export class ErrorsService {
  private endPoint = 'errors';

  constructor(
    private injector: Injector,
    private userService: UserService,
    private httpClient: HttpClient,
  ) {}

  log(error) {
    // Log the error to the console
    console.error(error);
    // Send error to server
    const errorToSend = this.addContextInfo(error);
    return this.report(errorToSend);
  }

  addContextInfo(error): ErrorWithContext {
    // You can include context details here (usually coming from other services: UserService...)
    const name = error.name || null;
    const configService = this.injector.get<ConfigService>(ConfigService);
    const siteId = configService.siteId;
    const user = this.userService.getUser().FirstName;
    const time = new Date().getTime();
    const id = `${siteId}-${user}-${time}`;
    const location = this.injector.get(LocationStrategy);
    const url = location instanceof PathLocationStrategy ? location.path() : '';
    const status = error.status || null;
    const message = error.message || error.toString();
    const stack = error instanceof HttpErrorResponse ? null : StackTraceParser.parse(error);

    const errorWithContext = {name, siteId, user, time, id, url, status, message, stack};

    return errorWithContext;
  }

  report(error) {
    return this.httpClient.post<IAuthData>(`${environment.firebase.functions_path}/${this.endPoint}`, {error});
  }
}
