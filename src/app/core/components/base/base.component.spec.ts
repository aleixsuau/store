import { RouterModule } from '@angular/router';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { UserService } from '../../services/user/user.service';
import { BaseComponent } from './base.component';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';


@Component({
  selector: 'app-header',
  template: '',
})
class HeaderComponent {
}

describe('BaseComponent', () => {
  let component: BaseComponent;
  let fixture: ComponentFixture<BaseComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        BaseComponent,
        HeaderComponent,
      ],
      imports: [
        RouterModule.forRoot([]),
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the app header', () => {
    const appHeader = fixture.debugElement.query(By.css('app-header'));

    expect(appHeader).toBeTruthy();
  });

  it('should contain the nav bar', () => {
    const appNavBar = fixture.debugElement.query(By.css('nav[mat-tab-nav-bar]'));

    expect(appNavBar).toBeTruthy();
  });

  it('should contain one link per', () => {
    const appNavBarLinks = fixture.debugElement.queryAll(By.css('a[mat-tab-link]'));

    expect(appNavBarLinks.length).toBe(component.navLinks.length);
  });
});
