import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialFileInputModule } from 'ngx-material-file-input';
import { of } from 'rxjs';
import { FormsService } from 'src/app/core/services/forms/forms.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { FocusModule } from 'src/app/shared/directives/focus/focus.module';
import { StoreService } from '../../services/store/store.service';
import { AddComponent } from './add.component';

describe('AddComponent', () => {
  let component: AddComponent;
  let fixture: ComponentFixture<AddComponent>;
  let storeService: jasmine.SpyObj<StoreService>;
  let formsService: jasmine.SpyObj<FormsService>;
  const itemMock = {
    name: 'item test name',
    status: 'available',
    photoUrls: ['testUrl1', 'testUrl2'],
  };

  beforeEach(async () => {
    const storeServiceSpy = jasmine.createSpyObj('StoreService', ['query', 'add']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['notify']);
    const formsServiceSpy = jasmine.createSpyObj('FormsService', ['getFilesDataUrls']);

    await TestBed.configureTestingModule({
      declarations: [ AddComponent ],
      imports: [
        CommonModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        FocusModule,
        MatInputModule,
        MatButtonModule,
        MaterialFileInputModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        BrowserAnimationsModule,
      ],
      providers:[
        FormBuilder,
        { provide: StoreService, useValue: storeServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: FormsService, useValue: formsServiceSpy },
        HttpClientTestingModule,
      ],
    })
    .compileComponents();

    storeService = TestBed.inject(StoreService) as jasmine.SpyObj<StoreService>;
    formsService = TestBed.inject(FormsService) as jasmine.SpyObj<FormsService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the add form', () => {
    const inputs = fixture.debugElement.queryAll(By.css('mat-form-field'));

    expect(inputs.length).toBe(component.formFields.length);
  });

  it('should add an item', fakeAsync(() => {
    const submitButton = fixture.debugElement.query(By.css('button[type=submit]')).nativeElement;

    formsService.getFilesDataUrls.and.returnValue(of(itemMock.photoUrls));
    storeService.add.and.returnValue(of({} as IItem));

    component.form.setValue(itemMock);
    console.log('submitButton', submitButton);
    fixture.detectChanges();

    submitButton.click();

    fixture.detectChanges();
    flush();

    expect(storeService.add).toHaveBeenCalled();
  }));
});
