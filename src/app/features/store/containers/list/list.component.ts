import { DialogComponent } from './../../../../shared/components/dialog/components/dialog/dialog.component';
import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, startWith, switchMap, take, tap, share } from 'rxjs/operators';
import { Select, Store } from '@ngxs/store';
import { StoreState } from '../../ngxs-store/store.state';
import * as storeActions from '../../ngxs-store/store.actions';
import { MatPaginator } from '@angular/material/paginator';


@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  animations: fadeAnimationDefault,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource: MatTableDataSource<IStoreItem>;
  tableColumnsToDisplay = ['name', 'status', 'detail'];
  tableColumns = [
    {
      label: 'Name',
      value: 'name',
    },
    {
      label: 'Status',
      value: 'status',
    },
    {
      label: 'Detail',
      value: 'detail',
      icon: 'visibility'
    }
  ];
  selectedStatus: IOption;
  selectedTag = null;
  tags = [
    { id: null, name: 'All' },
    { id: 1, name: 'tag3' },
    { id: 2, name: 'tag4' },
  ];

  @Select(StoreState.statuses$) statuses$: Observable<IOption[]>;
  storeItems$: Observable<IStoreItem[]>;
  storeSubscription: Subscription;

  @ViewChild('tagSelect') tagSelect: MatSelect;
  @ViewChild('statusSelect') statusSelect: MatSelect;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _ngxsStore: Store,
    private _dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.statuses$
      .pipe(take(1))
      .subscribe(statuses => this.selectedStatus = statuses[0]);
    this.selectedTag = this.tags[0];
    this.storeItems$ = this._ngxsStore.select(StoreState.items$).pipe(share());
  }

  ngAfterViewInit() {
    this.storeSubscription = combineLatest([
        this.statusSelect.selectionChange.pipe(startWith(null)),
        this.tagSelect.selectionChange.pipe(startWith(null)),
      ])
      .pipe(
        map((result: any) => result[0]?.source?.value?.value || this.selectedStatus?.value),
        tap(selectedValue => this._ngxsStore.dispatch(new storeActions.Query(`status=${selectedValue}`))),
        switchMap(() => this.storeItems$),
        map(items => {
          if (this.selectedTag?.id) {
            return items.filter(item => !!item.tags.find(tag => tag.name === this.selectedTag.name));
          } else {
            return items;
          }
        }),
        tap(storeItems => {
          this.dataSource = new MatTableDataSource(storeItems);
          this.dataSource.paginator = this.paginator;
        }),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.storeSubscription.unsubscribe();
  }

  openInDialog(item: IItem) {
    this._dialog.open(DialogComponent, {data: item});
  }
}
