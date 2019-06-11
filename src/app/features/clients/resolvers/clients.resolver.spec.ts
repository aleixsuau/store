import { TestBed } from '@angular/core/testing';

import { ClientsResolverService } from './clients.resolver';

describe('ClientsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ClientsResolverService = TestBed.get(ClientsResolverService);
    expect(service).toBeTruthy();
  });
});
