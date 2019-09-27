import { ConfigService } from './../../../../core/config/service/config.service';
import { environment } from './../../../../../environments/environment';
import { ClientsService } from '../../../clients/services/clients/clients.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { OrdersService } from '../../services/orders/orders.service';
import { Component, OnInit, ViewChild, OnDestroy, TemplateRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource, MatPaginator, MatDialog, MatDialogRef } from '@angular/material';
import { Subscription, of, Observable } from 'rxjs';
import { debounceTime, switchMap, filter, map } from 'rxjs/operators';
import { trigger, transition, useAnimation } from '@angular/animations';
import { fadeAnimation } from 'src/app/shared/animations/animations';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
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
export class OrdersComponent implements OnInit, OnDestroy {
  orders: IOrder[];
  contracts: IContract[];
  dataSource: MatTableDataSource<IOrder>;
  columns = ['Date', 'Client', 'Contract', 'Total', 'Status', 'Delivered', 'Actions'];
  filterForm: FormGroup;
  paginatorPageSize = 10;
  paginatorPageSizeOptions = [5, 10, 20];
  paginatorLength: number;
  paginatorDisabled: boolean;
  searchResults: IClient[];
  clientInputSubscription: Subscription;
  orderStatuses = [
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'In process', value: 'in_process' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Error', value: 'error' },
    { label: 'Canceled', value: 'canceled' },
  ];
  filterClient: IClient;
  selectedOrder: IOrder;
  dialogRef: MatDialogRef<TemplateRef<any>>;
  user$: Observable<IUser>;
  testEnvironment: boolean;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild('orderDialogTemplate', {static: false}) orderDialogTemplate: TemplateRef<any>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private ordersService: OrdersService,
    private clientsService: ClientsService,
    private notificationService: NotificationService,
    private formBuilder: FormBuilder,
    private matDialog: MatDialog,
    private configService: ConfigService,
  ) { }

  ngOnInit() {
    this.orders = this.activatedRoute.snapshot.data.orders;
    this.paginatorLength = this.orders.length;
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.testEnvironment = this.configService.config.test;
    this.filterForm = this.formBuilder.group({
      client: null,
      contract: null,
      dateFrom: null,
      dateTo: null,
      status: null,
    });
    this.clientInputSubscription = this.filterForm
                                          .get('client')
                                          .valueChanges
                                          .pipe(
                                            debounceTime(400),
                                            switchMap(changes => {
                                              // If changes is an object, then the change is
                                              // the selected option/client of the select and
                                              // we skip calling to the server to get more client
                                              // options
                                              if (typeof changes === 'object') {
                                                return of(null);
                                              } else {
                                                return this.clientsService.getClients(null, changes);
                                              }
                                            }),
                                            filter(results => results != null),
                                          )
                                          .subscribe(results => {
                                            this.searchResults = results.Clients;

                                            if (!this.searchResults.length) {
                                              this.notificationService.notify('No results', null, {panelClass: 'error'});
                                            }
                                          });

    // this.dataSource = new MatTableDataSource(this.orders);
    this.setTablePage(this.orders, 0, this.paginatorPageSize);
  }

  ngOnDestroy() {
    this.clientInputSubscription.unsubscribe();
  }

  trackBy(index: number, row) {
    return row && row._id;
  }

  paginatorChange(clients, page) {
    this.paginatorPageSize = page.pageSize;
    this.setTablePage(clients, page.pageIndex, page.pageSize, page.previousPageIndex);
  }

  setTablePage(orders: IOrder[], pageIndex: number, pageSize: number, previousPageIndex = 0) {
    const firstItem = pageIndex * pageSize;
    const lastItem = (pageIndex + 1) * pageSize;

    if (this.paginator) {
      this.paginator.pageIndex = pageIndex;
    }

    if (!orders || firstItem >= orders.length) {
      this.paginatorDisabled = true;
      const filters = this.filterForm.value;
      const params = {
        ...firstItem && { offset: firstItem - 1 },
        ...filters.client && { client: filters.client.Id },
        ...filters.contract && { contract: filters.contract.Id },
        ...filters.dateFrom && { dateFrom: filters.dateFrom },
        ...filters.dateTo && { dateTo: filters.dateTo },
        ...filters.status && { status: filters.status },
      };

      this.ordersService
            .getOrders(params)
            .subscribe(response => {
              this.orders = orders ? [...orders, ...response] : response;
              this.paginatorLength = this.orders.length;
              const ordersPage = this.orders.slice(firstItem, lastItem);
              this.dataSource = new MatTableDataSource(ordersPage);
              this.paginatorDisabled = false;
            });
    } else {
      const clientsPage = orders.slice(firstItem, lastItem);
      this.dataSource = new MatTableDataSource(clientsPage);
    }
  }

  getContractData(contractId: string) {
    return this.contracts.find(contract => contract.Id === contractId);
  }

  refundOrder(order: IOrder) {
    // TODO: refresh and set the correct page of results
    this.ordersService
          .refundOrder(order.id)
          .subscribe(() => this.setTablePage(null, 0, this.paginatorPageSize));
  }

  clientAutocompleteDisplayFunction(client: IClient) {
    return client ? `${client.FirstName} ${client.LastName} (${client.Email})` : null;
  }

  openOrderDetailDialog(order: IOrder) {
    this.selectedOrder = order;

    this.dialogRef = this.matDialog.open(this.orderDialogTemplate, {panelClass: 'mbDialogFull'});
  }

  // TEST FUNCTIONALITY
  triggerBillingCycle() {
    this.ordersService
          .triggerBillingCycle()
          .subscribe(() => this.setTablePage(null, 0, this.paginatorPageSize));
  }
}
