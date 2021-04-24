import { trigger, transition, useAnimation } from '@angular/animations';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { fadeAnimation } from 'src/app/shared/animations/animations';
import { DialogComponent } from 'src/app/shared/components/dialog/components/dialog/dialog.component';
import { StoreService } from '../../services/store/store.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        useAnimation(fadeAnimation, {
          delay: 0,
          params: { from: 0, to: 1, time: '500ms' },
        })
      ])
    ])
  ]
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
    private _storeService: StoreService,
    private _dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.selectedStatus = this.statuses[0];
  }

  ngAfterViewInit() {
    this.items$ = this.select
      .optionSelectionChanges
      .pipe(
        switchMap(selectedOption => this._storeService.query(`status=${selectedOption.source.value.value}`)),
        tap(storeItems => this.dataSource = new MatTableDataSource(storeItems))
      );
  }

  openInDialog(item: IItem) {
    this._dialog.open(DialogComponent, {data: item});
  }
}
