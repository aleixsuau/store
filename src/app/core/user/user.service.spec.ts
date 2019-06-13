import { TestBed, inject } from '@angular/core/testing';

import { UserService } from './user.service';

describe('UserService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService]
    });
  });

  afterEach(() => {
    localStorage.removeItem('mbUser');
  });

  it('should be created', inject([UserService], (service: UserService) => {
    expect(service).toBeTruthy();
  }));

  it('should delete a user', inject([UserService], (service: UserService) => {
    const mockUser = {
      "_id": "5aa56615f7809a2150f50556",
      "permissions": {
        "tables_deny": ["turytech/centralita/client-fee"]
      },
      "username": "admin@turytech.com",
      "extra_info": {
        "client": ["5a4ff88cf7809a2aa42ebaed"]
      }
    };

    service.setUser(mockUser as IUser);
    service.removeUser();
    expect(service.getUser()).toBe(null);
  }));

  it('should set an user', inject([UserService], (service: UserService) => {
    const mockUser = {
      "_id": "5aa56615f7809a2150f50556",
      "permissions": {
        "tables_deny": ["turytech/centralita/client-fee"]
      },
      "username": "admin@turytech.com",
      "extra_info": {
        "client": ["5a4ff88cf7809a2aa42ebaed"]
      }
    };

    service.setUser(mockUser as IUser);
    expect(service.getUser()).toEqual(mockUser as IUser);
  }));

});
