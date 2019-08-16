import { ClientsService } from './../../../clients/services/clients/clients.service';
import { NotificationService } from 'src/app/core/services/notification/notification.service';
import { PaymentsService } from './../../services/payments/payments.service';
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource, MatPaginator } from '@angular/material';
import { Subscription, of } from 'rxjs';
import { debounceTime, switchMap, filter, map } from 'rxjs/operators';
import { trigger, transition, useAnimation } from '@angular/animations';
import { fadeAnimation } from 'src/app/shared/animations/animations';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss'],
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
export class PaymentsComponent implements OnInit, OnDestroy {
  payments: IPayment[];
  contracts: IContract[];
  dataSource: MatTableDataSource<IPayment>;
  columns = ['Date', 'Client', 'Contract', 'Total', 'Status', 'Actions'];
  filterForm: FormGroup;
  paginatorPageSize = 10;
  paginatorPageSizeOptions = [5, 10, 20];
  paginatorLength: number;
  paginatorDisabled: boolean;
  searchResults: IClient[];
  clientInputSubscription: Subscription;
  paymentStatuses = [
    { label: 'Approved', value: 'approved' },
    { label: 'Pending', value: 'pending' },
    { label: 'In process', value: 'in_process' },
    { label: 'Refunded', value: 'refunded' },
  ];
  filterClient: IClient;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;

  constructor(
    private activatedRoute: ActivatedRoute,
    private paymentsService: PaymentsService,
    private clientsService: ClientsService,
    private notificationService: NotificationService,
    private formBuilder: FormBuilder,
  ) { }

  ngOnInit() {
    this.payments = this.activatedRoute.snapshot.data.payments;
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

    console.log('this.payments', this.payments);

    this.dataSource = new MatTableDataSource(this.payments);
  }

  ngOnDestroy() {
    this.clientInputSubscription.unsubscribe();
  }

  trackBy(index: number, row) {
    return row && row._id;
  }

  paginatorChange(payments: IPayment[], page) {
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
    this.paymentsService
          .getPayments(params)
          .subscribe(payments => {
            this.payments = payments;
            this.dataSource = new MatTableDataSource(this.payments);
          });
  }

  refundPayment(paymentId: string) {
    // TODO: refresh and set the correct page of results
    this.paymentsService
          .refundPayment(paymentId)
          .subscribe(() => this.getTableData(this.filterForm.value));
  }

  clientAutocompleteDisplayFunction(client: IClient) {
    return client ? `${client.FirstName} ${client.LastName} (${client.Email})` : null;
  }
}
