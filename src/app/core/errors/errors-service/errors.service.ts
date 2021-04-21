import { environment } from './../../../../environments/environment.prod';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, Injector, Type } from '@angular/core';
import { Router } from '@angular/router';
import * as StackTraceParser from 'error-stack-parser';
import { UserService } from './../../services/user/user.service';
import { of } from 'rxjs';


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
    this.report(errorToSend).subscribe();

    return of(errorToSend);
  }

  addContextInfo(error): ErrorWithContext {
    // You can include context details here (usually coming from other services: UserService...)
    const name = error.name || null;
    const user = this.userService.getUser() && this.userService.getUser().firstName;
    const time = new Date().getTime();
    const id = `${user}-${time}`;
    const location = this.injector.get<LocationStrategy>(LocationStrategy);
    const url = location instanceof PathLocationStrategy ? location.path() : '';
    const status = error.status || null;
    const message = error.message || error.toString();
    const stack = error instanceof HttpErrorResponse ? null : StackTraceParser.parse(error);

    const errorWithContext = {name, user, time, id, url, status, message, stack};

    return errorWithContext;
  }

  report(error) {
    console.log('Error reported', error);
    return of('Error reported');
  }
}
