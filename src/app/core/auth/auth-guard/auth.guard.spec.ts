import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../auth-service/auth.service';
import { AuthGuard } from './auth.guard';



describe('AuthGuard', () => {
  let service: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let userService: jasmine.SpyObj<UserService>;
  const userMock = {
    firstName: 'testFirstName'
  } as IUser;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['notify']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getUser']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
      ]
    });

    service = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should grant access to authenticated users', () => {
    authService.getToken.and.returnValue('testToken');
    userService.getUser.and.returnValue(userMock);

    const canAccess = service.canActivate(null, null);

    expect(userService.getUser).toHaveBeenCalled();
    expect(notificationService.notify).toHaveBeenCalled();
    expect(canAccess).toBeTrue();
  });

  it('should block access to unauthenticated users', () => {
    authService.getToken.and.returnValue(null);

    const canAccess = service.canActivate(null, null);

    expect(notificationService.notify).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([`login`]);
    expect(canAccess).toBeFalse();
  });
});
