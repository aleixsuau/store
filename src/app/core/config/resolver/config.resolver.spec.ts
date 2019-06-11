import { TestBed } from '@angular/core/testing';

import { ConfigResolverService } from './config.resolver';

describe('ClientsResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ConfigResolverService = TestBed.get(ConfigResolverService);
    expect(service).toBeTruthy();
  });
});
