import { ConfigService } from 'src/app/core/config/service/config.service';
import { environment } from './../../../../../environments/environment';
import { NotificationService } from './../../../../core/services/notification/notification.service';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ClientsService } from './../../services/clients/clients.service';
import { fadeAnimation } from './../../../../shared/animations/animations';
import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef, OnDestroy } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource, MatDialog, MatDialogRef } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { transition, trigger, useAnimation } from '@angular/animations';
import { Subscription } from 'rxjs';
import { debounceTime, switchMap, map } from 'rxjs/operators';


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
  contracts: IContract[];
  clientBeingEdited: IClient;
  dataSource: MatTableDataSource<IClient>;
  columns = ['PhotoUrl', 'FirstName', 'LastName'];
  paginatorPageSize = 10;
  paginatorPageSizeOptions = [5, 10, 20];
  clientForm: FormGroup;
  searchInput: FormControl;
  matDialogSubscription: Subscription;
  searchInputSubscription: Subscription;
  clientFormChanged: boolean;
  paginatorLength: number;
  paginatorDisabled: boolean;
  searchResults: IClient[];
  showCreditCardForm: boolean;
  dialogRef: MatDialogRef<TemplateRef<any>>;
  clientBeingEditedContracts: IContract[];
  clientBeingEditedContractsConfig: IMindBroContract[];
  // TEST FUNCTIONALITY
  testEnvironment: boolean;
  years: string[] = [];
  months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  @ViewChild('clientTemplate', {static: false}) clientTemplate: TemplateRef<any>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private clientsService: ClientsService,
    private formBuilder: FormBuilder,
    private matDialog: MatDialog,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) { }

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    Array(30).fill(true).forEach((e, index) => {
      this.years = [...this.years, `${currentYear + index}`];
    });

    this.clients = this.activatedRoute.snapshot.data.clients.Clients;
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.testEnvironment = this.configService.config.test;
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
    this.dialogRef = this.matDialog.open(this.clientTemplate, {panelClass: 'mbDialog'});

    this.matDialogSubscription = this.dialogRef
                                        .afterClosed()
                                        .subscribe(() => {
                                          this.clientBeingEdited = null;
                                          this.clientBeingEditedContracts = null;
                                        });

    // Load IClient's contract full data
    if (client) {
      this.setUpClientContracts(client.Id).subscribe();
    }
  }

  setUpClientContracts(clientId: string) {
    return this.clientsService
                  .getClientContracts(clientId)
                  .pipe(
                    map(mbContractsConfig => {
                      const contracts: IContract[] = mbContractsConfig.map(mbContractConfig => this.contracts.find(contract => contract.Id === mbContractConfig.id));
                      this.clientBeingEditedContracts = contracts;
                      this.clientBeingEditedContractsConfig = mbContractsConfig;
                    })
                  );
  }

  saveClient(client: IClient) {
    const clientModelToSave = {
      ...this.clientBeingEdited,
      ...client,
    };

    if (this.clientBeingEdited && this.clientForm.dirty) {
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
      if (this.clientForm.get('ClientCreditCard').pristine && !this.clientForm.get('ClientCreditCard.CVV').value) {
        clientModelToSave.ClientCreditCard = null;
      }

      this.clientsService
            .addClient(clientModelToSave)
            .pipe(switchMap(savedClient => {
              this.clientBeingEdited = savedClient;

              setTimeout(() => {
                this.clientForm.reset(savedClient);
                this.clientForm.get('ClientCreditCard.CVV').setValue('***');
              }, 0);
              return this.clientsService.getClients();
            }))
            .subscribe(clients => {
              this.resetClientsAndFlags(clients);
            });
    }
  }

  resetClientsAndFlags(clients: IClientsResponse) {
    this.clients = clients.Clients;
    this.clientForm.markAsPristine();
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
          [ Validators.pattern(/^[0-9]{3,4}$/) ]
        ],
        /* CardHolder: null,
        Address: null,
        City: null,
        PostalCode: null,
        State: null, */
      }, { validator: this.requiredIfAtLeastOneFieldFilled }),
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

  requiredIfAtLeastOneFieldFilled(group: FormGroup): {[s: string ]: boolean} {
    const controls = Object.keys(group.controls).map(key => group.controls[key]);

    if (controls.some(control => !!control.value)) {
      if (controls.every(control => !!control.value) && controls.every(control => control.valid)) {
        return null;
      } else {
        return {'error': true};
      }
    } else {
      return null;
    }
  }

  searchOptionSelected(client: IClient) {
    this.openClientFormDialog(client);
    this.searchInput.reset();
  }

  resetCreditCard() {
    this.clientForm.get('ClientCreditCard').reset();
    this.clientForm.get('ClientCreditCard').markAsDirty();
    this.clientForm.get('ClientCreditCard').enable();

    if (this.clientBeingEdited && this.clientBeingEdited.ClientCreditCard) {
      this.clientBeingEdited.ClientCreditCard = null;
    }
  }

  getContractConfig(contractId: string): IMindBroContract {
    return this.clientBeingEditedContractsConfig.find(contractConfig => contractConfig.id === contractId);
  }

  updateClientContractStatus(clientId: string, contractId: string, status: string) {
    this.clientsService
          .updateClientContract(clientId, contractId, {status})
          .pipe(
            switchMap(() => this.setUpClientContracts(clientId))
          )
          .subscribe();
  }

  // TEST FUNCTIONALITY
  // TODO: Delete this test functionality
  generateRandomClient() {
    const today = new Date().getDay();
    const dayOfWeekAsString = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const randomString = Math.random().toString().replace(/\./g, '-').replace(/1/g, 'a')
                            .replace(/2/g, 'b').replace(/3/g, 'c').replace(/4/g, 'd')
                            .replace(/5/g, 'e').replace(/6/g, 'f').replace(/7/g, 'g')
                            .replace(/8/g, 'h').replace(/9/g, 'i') .replace(/0/g, 'j')
                            .substr(0, 10);
    const clientRandomString = `Apro-${dayOfWeekAsString[today]}-${randomString}`;
    const randomClient = {
      'FirstName': `${clientRandomString}`,
      'LastName': `${clientRandomString}`,
      'BirthDate': '2019-08-27T22:00:00.000Z',
      'Gender': 'Male',
      'Email': `${clientRandomString}@macrofono.es`,
      'MobilePhone': null,
      'AddressLine1': null,
      'AddressLine2': null,
      'City': null,
      'PostalCode': null,
      'Country': null,
      'IsProspect': false,
      'SendScheduleEmails': false,
      'SendAccountEmails': false,
      'ClientCreditCard': {
        'CardNumber': '4168818844447115',
        'ExpMonth': '09',
        'ExpYear': '2020',
        'CVV': '115',
      },
    };

    this.clientForm.setValue(randomClient);
    this.clientForm.markAsDirty();
  }

  changeClientCard(client: IClient, newCard) {
    this.clientsService.changeClientCard(client, newCard).subscribe();
  }

  cardStatuses = [
    {
      'cardId': '1567079956994',
      'cardToken': '510cdbaf6473842aaa25f33e6b3b97b6',
      'clientId': '465730941-nAH3u94mR7lBtQ',
      'CVV': '115',
      'name': 'APRO'
    },
    /* {
      'cardId': '1566484369829',
      'cardToken': 'e178b71508f28a00fca59ddc108b4eb7',
      'clientId': '465097961-TyorrIvZTmsYVu',
      'CVV': '115',
      'name': 'CONT'
    }, */
    {
      'cardId': '1566484211137',
      'cardToken': '8b081c9b9e850caf067502b5d9e77bfb',
      'clientId': '463791423-sRbmCqjmplxh8e',
      'CVV': '115',
      'name': 'FUND'
    },
    /* {
      'cardId': '1566921262731',
      'cardToken': '12559550755be34b6d552140820a2313',
      'clientId': '465168241-Kf4t3j4jThYhoN',
      'CVV': '115',
      'name': 'CALL'
    },
    {
      'cardId': '1566921460704',
      'cardToken': 'a39c31fedfdda6ad1398c89c24b14a03',
      'clientId': '465168468-szMevJhrXFGn2N',
      'CVV': '115',
      'name': 'SECU'
    },
    {
      'cardId': '1566921590959',
      'cardToken': '527886d74008c695c7a48001169e38ad',
      'clientId': '465172383-odZppomO9VeECX',
      'CVV': '115',
      'name': 'EXPI'
    },
    {
      'cardId': '1566921712027',
      'cardToken': '4887b4763ed1327a0a725097e343f955',
      'clientId': '465170899-RUWKJgyGV1B9b5',
      'CVV': '115',
      'name': 'FORM'
    },
    {
      'cardId': '1566921838987',
      'cardToken': 'be3955a4ac6a04386f3c7cfff7406fdf',
      'clientId': '465169231-K8C8V522FgsLqf',
      'CVV': '115',
      'name': 'OTHE'
    } */
  ]
}
