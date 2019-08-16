import { TestBed } from '@angular/core/testing';
import { PaymentsResolverService } from './payments.resolver';

describe('PaymentsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PaymentsResolverService = TestBed.get(PaymentsResolverService);
    expect(service).toBeTruthy();
  });
});
