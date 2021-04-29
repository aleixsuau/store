import { environment } from './../../../../environments/environment';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpClient: HttpTestingController;
  const userMock: IUser = {
    id: 1,
    username: 'username test',
    firstName: 'firstName test',
    lastName: 'lastName test',
    email: 'email test',
    password: 'password test',
    phone: 'phone test',
    userStatus: 0,
  };
  const endPoint = 'user';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
      ],
      imports: [
        HttpClientTestingModule,
      ]
    });

    httpClient = TestBed.inject(HttpTestingController);
    service = TestBed.inject(UserService);
  });

  afterEach(() => {
    localStorage.removeItem('appUser');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set an user', fakeAsync(() => {
    service.setUser(userMock);

    flush();

    expect(service.getUser()).toEqual(userMock);
  }));

  it('should delete a user', fakeAsync(() => {
    service.setUser(userMock);
    service.removeUser();

    flush();

    expect(service.getUser()).toBeFalsy(null);
  }));

  it('should get the use from the backend$', fakeAsync(() => {
    service
      .getUserFromBackEnd$(userMock.username)
      .subscribe();

    const request = httpClient.expectOne(`${environment.api.url}/${endPoint}/${userMock.username}`);
    request.flush(userMock);

    expect(request.request.method).toEqual('GET');
    expect(service.getUser()).toEqual(userMock);
  }));
});

