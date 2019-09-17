import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, inject } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let httpClient: HttpTestingController;

  beforeEach(() => {

    TestBed.configureTestingModule({
      providers: [
        AuthService,
      ],
      imports: [
        HttpClientTestingModule,
      ]
    });

    authService = TestBed.get(AuthService);
    httpClient = TestBed.get(HttpTestingController);
  });

  it('should be created', inject([AuthService], (service: AuthService) => {
    expect(service).toBeTruthy();
  }));


});
