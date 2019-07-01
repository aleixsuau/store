import { TestBed } from '@angular/core/testing';

import { ContractsResolverService } from './contracts.resolver';

describe('ContractsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ContractsResolverService = TestBed.get(ContractsResolverService);
    expect(service).toBeTruthy();
  });
});
