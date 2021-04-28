import { fadeAnimationDefault } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { DialogComponent } from 'src/app/shared/components/dialog/components/dialog/dialog.component';
import { Store } from '@ngxs/store';
import { StoreState } from '../../ngxs-store/store.state';
import * as storeActions from '../../ngxs-store/store.actions';


@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  animations: fadeAnimationDefault,
})
export class ListComponent implements OnInit, AfterViewInit {
  items$: Observable<IStoreItem[]>;
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
  statuses = [
    {
      label: 'Available',
      value: 'available',
    },
    {
      label: 'Pending',
      value: 'pending',
    },
    {
      label: 'Sold',
      value: 'sold',
    }
  ];
  selectedStatus: IOption;

  @ViewChild(MatSelect) select: MatSelect;

  constructor(
    private _ngxsStore: Store,
    private _dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.selectedStatus = this.statuses[0];
  }

  ngAfterViewInit() {
    this.items$ = this.select
      .optionSelectionChanges
      .pipe(
        map(selectedOption => selectedOption.source.value.value),
        distinctUntilChanged(),
        tap(selectedValue => this._ngxsStore.dispatch(new storeActions.Query(`status=${selectedValue}`))),
        switchMap(() => this._ngxsStore.select(StoreState.items$)),
        tap(storeItems => this.dataSource = new MatTableDataSource(storeItems)),
      );
  }

  openInDialog(item: IItem) {
    this._dialog.open(DialogComponent, {data: item});
  }
}
