import { NotificationService } from './../../../../core/services/notification/notification.service';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ClientsService } from './../../services/clients/clients.service';
import { fadeAnimation } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef, OnDestroy } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { transition, trigger, useAnimation } from '@angular/animations';
import { Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';


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
export class ClientsListComponent implements OnInit, OnDestroy, AfterViewInit {
  clients: IClient[];
  clientBeingEdited: IClient;
  dataSource: MatTableDataSource<IClient>;
  columns = ['PhotoUrl', 'FirstName', 'LastName'];
  paginatorPageSize = 10;
  paginatorPageSizeOptions = [5, 10, 20];
  clientForm: FormGroup;
  searchInput: FormControl;
  matDialogSubscription: Subscription;
  clientFormSubscription: Subscription;
  searchInputSubscription: Subscription;
  clientFormChanged: boolean;
  paginatorLength: number;
  paginatorDisabled: boolean;
  searchResults: IClient[];
  showCreditCardForm: boolean;

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  @ViewChild('clientTemplate', {static: false}) clientTemplate: TemplateRef<any>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private clientsService: ClientsService,
    private formBuilder: FormBuilder,
    private matDialog: MatDialog,
    private notificationService: NotificationService,
  ) { }

  ngOnInit() {
    this.clients = this.activatedRoute.snapshot.data.clients.Clients;
    this.paginatorLength =  this.activatedRoute.snapshot.data.clients.PaginationResponse.TotalResults;
    this.searchInput = new FormControl(null);
    this.searchInputSubscription = this.searchInput
                                          .valueChanges
                                          .pipe(
                                            debounceTime(400),
                                            switchMap(changes => this.clientsService.getClients(null, changes))
                                          )
                                          .subscribe(results => {
                                            this.searchResults = results.Clients;

                                            if (!this.searchResults.length) {
                                              this.notificationService.notify('No results', null, {panelClass: 'error'});
                                            }
                                          });

    this.setClientsPage(this.clients, 0, this.paginatorPageSize);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    if (this.clientFormSubscription) {
      this.clientFormSubscription.unsubscribe();
    }

    if (this.matDialogSubscription) {
      this.matDialogSubscription.unsubscribe();
    }

    this.searchInputSubscription.unsubscribe();
  }

  trackBy(index: number, row) {
    return row && row._id;
  }

  paginatorChange(clients, page) {
    this.setClientsPage(this.clients, page.pageIndex, page.pageSize, page.previousPageIndex);
  }

  setClientsPage(clients: IClient[], pageIndex: number, pageSize: number, previousPageIndex = 0) {
    const firstItem = pageIndex * pageSize;
    const lastItem = (pageIndex + 1) * pageSize;

    if (firstItem >= clients.length) {
      this.paginatorDisabled = true;

      this.clientsService
            .getClients(firstItem - 1)
            .subscribe(response => {
              this.clients = [...clients, ...response.Clients];
              const clientsPage = this.clients.slice(firstItem, lastItem);
              this.dataSource = new MatTableDataSource(clientsPage);
              this.paginatorDisabled = false;
            });
    } else {
      const clientsPage = clients.slice(firstItem, lastItem);
      this.dataSource = new MatTableDataSource(clientsPage);
    }
  }

  openClientFormDialog(client?: IClient) {
    this.setUpClientForm(client);
    this.clientBeingEdited = client;

    this.clientFormSubscription = this.clientForm
                                          .valueChanges
                                          .subscribe(changes => this.clientFormChanged = true);

    this.matDialogSubscription = this.matDialog
                                        .open(this.clientTemplate, {panelClass: 'mbDialog'})
                                        .afterClosed()
                                        .subscribe(() => {
                                          this.clientBeingEdited = null;
                                          this.clientFormChanged = false;
                                          this.clientFormSubscription.unsubscribe();
                                        });
  }

  saveClient(client: IClient) {
    const clientModelToSave = {...this.clientBeingEdited, ...client};

    if (this.clientBeingEdited && this.clientFormChanged) {
      // Remove *** display credit card data (to not overwrite original data)
      if (this.clientForm.get('ClientCreditCard').pristine) {
        delete clientModelToSave.ClientCreditCard;
      }

      this.clientsService
            .updateClient(clientModelToSave)
            .pipe(switchMap(() => this.clientsService.getClients()))
            .subscribe(clients => this.resetClientsAndFlags(clients));
    } else if (this.clientForm.valid) {
      // Remove null credit card data (MindBody throws error)
      if (this.clientForm.get('ClientCreditCard').pristine) {
        clientModelToSave.ClientCreditCard = null;
      }

      this.clientsService
            .addClient(clientModelToSave)
            .pipe(switchMap(() => this.clientsService.getClients()))
            .subscribe(clients => this.resetClientsAndFlags(clients));
    }
  }

  resetClientsAndFlags(clients: IClientsResponse) {
    this.clients = clients.Clients;
    this.clientFormChanged = false;
    this.setClientsPage(this.clients, 0, this.paginatorPageSize);

    if (this.clientForm.get('ClientCreditCard.CardNumber').value) {
      this.clientForm.get('ClientCreditCard').disable();
    }
  }

  setUpClientForm(client?: IClient) {
    const clientFormConfig = {
      FirstName: [client && client.FirstName || null, [Validators.required]],
      LastName: [client && client.LastName || null, [Validators.required]],
      BirthDate: [client && client.BirthDate || null, [Validators.required]],
      Gender: client && client.Gender || null,
      Email: [client && client.Email || null, [Validators.email, Validators.required]],
      MobilePhone: client && client.MobilePhone || null,
      AddressLine1: client && client.AddressLine1 || null,
      AddressLine2: client && client.AddressLine2 || null,
      City: client && client.City || null,
      PostalCode: client && client.PostalCode || null,
      Country: client && client.Country || null,
      IsProspect: client && client.IsProspect || false,
      SendScheduleEmails: client && client.SendScheduleEmails || false,
      SendAccountEmails: client && client.SendAccountEmails || false,
      ClientCreditCard: this.formBuilder.group({
        CardNumber: [
          {
            value: client && client.ClientCreditCard && client.ClientCreditCard.CardNumber || null,
            disabled: client && client.ClientCreditCard != null,
          },
          [ Validators.min(9999999999), Validators.max(9999999999999999999) ]
        ],
        ExpMonth: [
          {
            value: client && client.ClientCreditCard && client.ClientCreditCard.ExpMonth || null,
            disabled:  client && client.ClientCreditCard != null,
          },
          [ Validators.min(1), Validators.max(12) ]
        ],
        ExpYear: [
          {
            value: client && client.ClientCreditCard && client.ClientCreditCard.ExpYear || null,
            disabled:  client && client.ClientCreditCard != null,
          },
          [  Validators.min(new Date().getFullYear()), Validators.max(new Date().getFullYear() + 50) ]
        ],
        CVV: [
          {
            value: client && client.ClientCreditCard && client.ClientCreditCard.CardNumber && '***' || null,
            disabled:  client && client.ClientCreditCard != null,
          },
          [ Validators.min(1), Validators.max(999)]
        ],
        /* CardHolder: null,
        Address: null,
        City: null,
        PostalCode: null,
        State: null, */
      }),
      // TODO: Cover the rest of client props
      /* ApptGenderPrefMale: null,
      AppointmentGenderPreference: null,
      ClientCreditCard: null,
      ClientIndexes: null,
      ClientRelationships: null,
      CustomClientFields: null,
      EmergencyContactInfoEmail: null,
      EmergencyContactInfoName: null,
      EmergencyContactInfoPhone: null,
      EmergencyContactInfoRelationship: null,
      HomeLocation: null,
      HomePhone: null,
      LiabilityRelease: null,
      MiddleName: null,
      MobileProvider: null,
      ProspectStage: null,
      ReferredBy: null,
      SalesReps: null,
      State: null,
      Test: null,
      WorkExtension: null,
      WorkPhone: null, */
    };
    this.clientForm = this.formBuilder.group(clientFormConfig);
  }

  searchOptionSelected(client: IClient) {
    this.openClientFormDialog(client);
    this.searchInput.reset();
  }

  resetCreditCard() {
    this.clientForm.get('ClientCreditCard').reset();
    this.clientForm.get('ClientCreditCard').enable();
  }
}
