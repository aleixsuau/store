import { TestBed } from '@angular/core/testing';
import { OrdersResolverService } from './orders.resolver';

describe('OrdersResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OrdersResolverService = TestBed.get(OrdersResolverService);
    expect(service).toBeTruthy();
  });
});
