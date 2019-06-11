import { fadeAnimation } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { transition, trigger, useAnimation } from '@angular/animations';


@Component({
  selector: 'app-clients-list',
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.scss'],
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
export class ClientsListComponent implements OnInit, AfterViewInit {
  clients: IClient[];
  dataSource: MatTableDataSource<IClient>;
  columns = ['PhotoUrl', 'FirstName', 'LastName'];
  pageSize = 10;
  pageSizeOptions = [5, 10, 20];

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;

  constructor(
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.clients = this.activatedRoute.snapshot.data.clients.Clients;
    this.dataSource = new MatTableDataSource(this.clients);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  trackBy(index: number, row) {
    return row && row._id;
  }
}
