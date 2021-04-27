import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, waitForAsync } from '@angular/core/testing';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { BrowserModule, By } from '@angular/platform-browser';
import { DialogComponent } from './dialog.component';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  const item: IStoreItem = {
    id: 1,
    name: 'item test name 1',
    status: 'available',
    photoUrls: ['testUrl1', 'testUrl2'],
    category: 'test',
    tags: [
      { id: 1, name: 'testTagName' }
    ]
  };

  beforeEach(waitForAsync(() => {
    const matDialogServiceSpy = jasmine.createSpyObj('MatDialog', ['close']);

    TestBed.configureTestingModule({
      declarations: [DialogComponent],
      imports: [
        CommonModule,
        MatDialogModule,
        MatListModule,
        MatButtonModule,
        MatChipsModule,
        FlexLayoutModule,
        BrowserModule,
      ],
      providers: [
        { provide: MatDialog, useValue: matDialogServiceSpy },
        { provide: MAT_DIALOG_DATA, useValue: { data: item } },
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    matDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', fakeAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('should display the item details', () => {
    // @ts-ignore
    component.item = item;
    fixture.detectChanges();

    const listItems = fixture.debugElement.queryAll(By.css('mat-list-item'));
    const images = fixture.debugElement.queryAll(By.css('img'));
    const dialogText = fixture.debugElement.nativeElement.textContent;

    const containsAllTexts = Object.keys(item).every(key => dialogText.includes(item[key]));

    expect(dialogText).toContain(item.name);
    expect(dialogText).toContain(item.status);
    expect(dialogText).toContain(item.category);
    expect(dialogText).toContain(item.tags[0].name);
    expect(images.length).toBe(item.photoUrls.length);
    expect(listItems.length).toBe(Object.keys(item).length - 1);
  });
});
