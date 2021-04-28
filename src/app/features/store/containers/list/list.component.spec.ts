import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick, flush, async, waitForAsync } from '@angular/core/testing';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { defer } from 'rxjs';
import { DialogModule } from 'src/app/shared/components/dialog/dialog.module';
import { ListComponent } from './list.component';
import { Store } from '@ngxs/store';


describe('StoreComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;
  let store: jasmine.SpyObj<Store>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  const itemsMock = [
    {
      name: 'item test name 1',
      status: 'available',
      photoUrls: ['testUrl1', 'testUrl2'],
    },
    {
      name: 'item test name 2',
      status: 'available',
      photoUrls: ['testUrl1', 'testUrl2'],
    },
    {
      name: 'item test name 3',
      status: 'available',
      photoUrls: ['testUrl1', 'testUrl2'],
    },
    {
      name: 'item test name 3',
      status: 'available',
      photoUrls: ['testUrl1', 'testUrl2'],
    }
  ];


  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    const matDialogServiceSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ ListComponent ],
      imports: [
        CommonModule,
        FlexLayoutModule,
        ReactiveFormsModule,
        MatInputModule,
        MatIconModule,
        MatTableModule,
        MatFormFieldModule,
        MatSelectModule,
        DialogModule,
        BrowserAnimationsModule,
        MatProgressSpinnerModule,
      ],
      providers: [
        { provide: MatDialog, useValue: matDialogServiceSpy },
        { provide: Store, useValue: storeSpy },
      ]
    })
    .compileComponents();

    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    matDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  });

  beforeEach(() => {
    // @ts-ignore
    store.dispatch.and.returnValue(defer(() => Promise.resolve(itemsMock)));
    store.select.and.returnValue(defer(() => Promise.resolve(itemsMock)));

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  it('should create', fakeAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('should render the items', waitForAsync(() => {
    fixture.whenStable().then(() => {
      const tableRows = fixture.debugElement.queryAll(By.css('.mat-row'));

      expect(tableRows.length).toBe(itemsMock.length);
      expect(tableRows[0].nativeElement.textContent).toContain(itemsMock[0].name);
      expect(tableRows[0].nativeElement.textContent).toContain(itemsMock[0].status);
    });
  }));

  it('should open the dialog', waitForAsync(() => {
    fixture.whenStable().then(() => {
      const showDetailButton = fixture.debugElement.query(By.css('.cdk-column-detail mat-icon'))?.nativeElement;

      showDetailButton.click();
      fixture.detectChanges();

      expect(matDialog.open).toHaveBeenCalled();
    });
  }));
});
