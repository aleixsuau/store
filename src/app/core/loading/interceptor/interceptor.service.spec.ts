import { TestBed, inject } from '@angular/core/testing';

import { LoadingInterceptor } from './interceptor.service';

describe('InterceptorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingInterceptor]
    });
  });

  it('should be created', inject([LoadingInterceptor], (service: LoadingInterceptor) => {
    expect(service).toBeTruthy();
  }));
});
