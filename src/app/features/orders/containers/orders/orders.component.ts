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
  columns = ['Date', 'Client', 'Contract', 'Total', 'Status', 'Actions'];
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
  ];
  filterClient: IClient;
  selectedOrder: IOrder;
  dialogRef: MatDialogRef<TemplateRef<any>>;
  user$: Observable<IUser>;
  testEnvironment = !environment.production;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild('orderDialogTemplate', {static: false}) orderDialogTemplate: TemplateRef<any>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private ordersService: OrdersService,
    private clientsService: ClientsService,
    private notificationService: NotificationService,
    private formBuilder: FormBuilder,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.orders = this.activatedRoute.snapshot.data.orders;
    this.contracts = this.activatedRoute.snapshot.data.contracts;
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
                                              console.log('changes', changes);
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

    console.log('this.orders', this.orders);

    this.dataSource = new MatTableDataSource(this.orders);
  }

  ngOnDestroy() {
    this.clientInputSubscription.unsubscribe();
  }

  trackBy(index: number, row) {
    return row && row._id;
  }

  paginatorChange(orders: IOrder[], page) {
    console.log('paginatorChange', page.pageIndex, page.pageSize, page.previousPageIndex);
  }

  getTableData(filters) {
    const params = {
      ...filters.client && { client: filters.client.Id },
      ...filters.contract && { contract: filters.contract.Id },
      ...filters.dateFrom && { dateFrom: filters.dateFrom },
      ...filters.dateTo && { dateTo: filters.dateTo },
      ...filters.status && { status: filters.status },
    };
    console.log('getTableData', params);
    this.ordersService
          .getOrders(params)
          .subscribe(orders => {
            this.orders = orders;
            this.dataSource = new MatTableDataSource(this.orders);
          });
  }

  getContractData(contractId: string) {
    return this.contracts.find(contract => contract.Id === contractId);
  }

  refundOrder(order: IOrder) {
    // TODO: refresh and set the correct page of results
    this.ordersService
          .refundOrder(order.id)
          .subscribe(() => this.getTableData(this.filterForm.value));
  }

  clientAutocompleteDisplayFunction(client: IClient) {
    return client ? `${client.FirstName} ${client.LastName} (${client.Email})` : null;
  }

  openOrderDetailDialog(order: IOrder) {
    console.log('openOrderDetailDialog', order);
    this.selectedOrder = order;

    this.dialogRef = this.matDialog.open(this.orderDialogTemplate, {panelClass: 'mbDialogFull'});
  }

  // TEST FUNCTIONALITY
  triggerBillingCycle() {
    this.ordersService
          .triggerBillingCycle()
          .subscribe(() => this.getTableData(this.filterForm.value));
  }
}
