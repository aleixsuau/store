import { FlexLayoutModule } from '@angular/flex-layout';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth-service/auth.service';
import { UserService } from 'src/app/core/services/user/user.service';

import { HeaderComponent } from './header.component';
import { MatToolbarModule } from '@angular/material/toolbar';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: jasmine.SpyObj<AuthService>;
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
  let userServiceMock = {
    user$: of(userMock),
  };


  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);

    await TestBed.configureTestingModule({
      declarations: [ HeaderComponent ],
      imports: [
        MatIconModule,
        FlexLayoutModule,
        MatToolbarModule,
      ],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    })
    .compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the username', () => {
    const userNameElement = fixture.debugElement.query(By.css('.username')).nativeElement;

    expect(userNameElement.textContent.trim()).toBe(userMock.firstName.trim());
  });

  it('should show the user menu', fakeAsync(() => {
    const userDataElement = fixture.debugElement.query(By.css('.user__data')).nativeElement;

    userDataElement.click();
    fixture.detectChanges();

    const userMenu = fixture.debugElement.query(By.css('.user__menu'));
    expect(userMenu).toBeTruthy();

    // Should logout
    const userMenuLogoutButton = fixture.debugElement.query(By.css('.user__menu button')).nativeElement;

    userMenuLogoutButton.click();

    expect(authService.logout).toHaveBeenCalled();
  }));
});
