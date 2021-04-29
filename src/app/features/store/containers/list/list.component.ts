import { DialogComponent } from './../../../../shared/components/dialog/components/dialog/dialog.component';
import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, switchMap, take, tap } from 'rxjs/operators';
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
export class ListComponent implements OnInit, AfterViewInit {
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
  items$: Observable<IStoreItem[]>;
  selectedTag = null;
  tags = [{ id: 1, name: 'tag3' }, { id: 2, name: 'tag4' }];

  @Select(StoreState.statuses$) statuses$: Observable<IOption[]>;

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
  }

  ngAfterViewInit() {
    this.items$ = combineLatest([
        this.statusSelect.optionSelectionChanges,
        this.tagSelect.optionSelectionChanges.pipe(startWith(null)),
      ])
      .pipe(
        map((result: any) => result[0].source.value.value),
        tap(selectedValue => this._ngxsStore.dispatch(new storeActions.Query(`status=${selectedValue}`))),
        switchMap(() => this._ngxsStore.select(StoreState.items$)),
        map(items => {
          if (this.selectedTag) {
            return items.filter(item => !!item.tags.find(tag => tag.name === this.selectedTag.name));
          } else {
            return items;
          }
        }),
        tap(storeItems => {
          this.dataSource = new MatTableDataSource(storeItems);
          this.dataSource.paginator = this.paginator;
        }),
      );
  }

  openInDialog(item: IItem) {
    this._dialog.open(DialogComponent, {data: item});
  }
}
