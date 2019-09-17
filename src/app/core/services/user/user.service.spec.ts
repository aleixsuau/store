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
      Id: '123',
      FirstName: 'Aleix',
      LastName: 'Suau',
      Type: 'Owner',
    };

    service.setUser(mockUser as IUser);
    service.removeUser();
    expect(service.getUser()).toBe(null);
  }));

  it('should set an user', inject([UserService], (service: UserService) => {
    const mockUser = {
      Id: '123',
      FirstName: 'Aleix',
      LastName: 'Suau',
      Type: 'Owner',
    };

    service.setUser(mockUser as IUser);
    expect(service.getUser()).toEqual(mockUser as IUser);
  }));

});
