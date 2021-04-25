import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserService } from '../../services/user/user.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpClient: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let userService: jasmine.SpyObj<UserService>;
  const endPoint = 'user';
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
  const loginRequest = {
    username: 'admin',
    password: 'admin',
  };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['setUser', 'removeUser', 'getUserFromBackEnd$']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: UserService, useValue: userServiceSpy },
      ],
      imports: [
        HttpClientTestingModule,
      ]
    });

    service = TestBed.inject(AuthService);
    httpClient = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should be created',  () => {
    expect(service).toBeTruthy();
  });

  it('should signup', fakeAsync(() => {
    spyOn(service, 'setToken');

    // Succesfully with valid user data
    service.signup(userMock).subscribe();

    const validRequest = httpClient.expectOne(`${environment.api.url}/${endPoint}`);
    validRequest.flush({code: 200});

    expect(validRequest.request.method).toEqual('POST');
    expect(validRequest.request.body).toEqual(userMock);
    expect(service.setToken).toHaveBeenCalled();
    expect(userService.setUser).toHaveBeenCalledWith(userMock);

    let error: boolean;

    service.signup(userMock).subscribe(
      () => error = false,
      () => error = true,
    );

    // Throw with invalid user data
    const invalidRequest = httpClient.expectOne(`${environment.api.url}/${endPoint}`);
    invalidRequest.flush({ code: 409 });

    expect(error).toBeTrue();

    httpClient.verify();
  }));

  it('should login', fakeAsync(() => {
    spyOn(service, 'setToken');
    userService.getUserFromBackEnd$.and.returnValue(of(userMock));

    // Succefully with valid username/password
    service.login(loginRequest.username, loginRequest.password, true).subscribe();

    const validReq = httpClient.expectOne(`${environment.api.url}/${endPoint}/login?username=admin&password=admin`);
    validReq.flush({ code: 200 });

    expect(validReq.request.method).toEqual('GET');
    expect(service.setToken).toHaveBeenCalled();
    expect(userService.getUserFromBackEnd$).toHaveBeenCalledWith(loginRequest.username);
    expect(userService.setUser).toHaveBeenCalledWith(userMock);

    // Throw with invalid username/password
    let error: boolean;

    service
      .login(loginRequest.username, loginRequest.password, true)
      .subscribe(
        () => error = false,
        () => error = true,
      );

    const invalidReq = httpClient.expectOne(`${environment.api.url}/${endPoint}/login?username=admin&password=admin`);
    invalidReq.flush({ code: 503 });

    expect(error).toBeTrue();

    httpClient.verify();
  }));

  it('should logout', fakeAsync(() => {
    spyOn(service, 'deleteToken');

    service.logout();

    const request = httpClient.expectOne(`${environment.api.url}/${endPoint}/logout`);
    request.flush({ code: 200 });

    expect(request.request.method).toEqual('GET');
    expect(service.deleteToken).toHaveBeenCalled();
    expect(userService.removeUser).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([`login`]);
  }));
});
