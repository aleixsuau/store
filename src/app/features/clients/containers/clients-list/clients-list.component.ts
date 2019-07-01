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
  clientFormSubscription: Subscription;
  clientFormChanged: boolean;
  clientFormModel = {
    FirstName: [null, [Validators.required]],
    LastName: [null, [Validators.required]],
    BirthDate: [null, [Validators.required]],
    Gender: null,
    Email: [null, [Validators.email, Validators.required]],
    MobilePhone: null,
    AddressLine1: null,
    AddressLine2: null,
    City: null,
    PostalCode: null,
    Country: null,
    IsProspect: false,
    SendScheduleEmails: false,
    SendAccountEmails: false,
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
  paginatorLength: number;
  paginatorDisabled: boolean;
  searchResults: IClient[];


  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;
  @ViewChild('clientTemplate', {static: false}) clientTemplate: TemplateRef<any>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private clientsService: ClientsService,
    private formBuilder: FormBuilder,
    private matDialog: MatDialog,
  ) { }

  ngOnInit() {
    this.clients = this.activatedRoute.snapshot.data.clients.Clients;
    this.paginatorLength =  this.activatedRoute.snapshot.data.clients.PaginationResponse.TotalResults;
    this.setClientsPage(0, this.paginatorPageSize);
    this.clientForm = this.formBuilder.group(this.clientFormModel);
    this.searchInput = new FormControl(null);

    this.searchInput
        .valueChanges
        .pipe(
          debounceTime(400),
          switchMap(changes => this.clientsService.getClients(null, changes))
        )
        .subscribe(results => this.searchResults = results.Clients);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    if (this.clientFormSubscription) {
      this.clientFormSubscription.unsubscribe();
    }
  }

  trackBy(index: number, row) {
    return row && row._id;
  }

  paginatorChange(page) {
    this.setClientsPage(page.pageIndex, page.pageSize, page.previousPageIndex);
  }

  setClientsPage(pageIndex: number, pageSize: number, previousPageIndex = 0) {
    const firstItem = pageIndex * pageSize;
    const lastItem = (pageIndex + 1) * pageSize;

    if (firstItem >= this.clients.length) {
      this.paginatorDisabled = true;

      this.clientsService
            .getClients(firstItem - 1)
            .subscribe(response => {
              this.clients = [...this.clients, ...response.Clients];
              const clientsPage = this.clients.slice(firstItem, lastItem);
              this.dataSource = new MatTableDataSource(clientsPage);
              this.paginatorDisabled = false;
            });
    } else {
      const clientsPage = this.clients.slice(firstItem, lastItem);
      this.dataSource = new MatTableDataSource(clientsPage);
    }
  }

  openClientFormDialog(client?: IClient) {
    if (client) {
      this.clientBeingEdited = client;

      const {
        FirstName, LastName, BirthDate, Gender, Email,
        MobilePhone, AddressLine1, AddressLine2, City, PostalCode,
        Country, IsProspect, SendScheduleEmails, SendAccountEmails
      } = client;

      const clientFormModel = {
        FirstName, LastName, BirthDate, Gender, Email,
        MobilePhone, AddressLine1, AddressLine2, City, PostalCode,
        Country, IsProspect, SendScheduleEmails, SendAccountEmails
      };

      this.clientForm.setValue(clientFormModel);
      this.clientFormSubscription = this.clientForm.valueChanges.subscribe(changes => {
        this.clientFormChanged = true;
      });
    }

    this.matDialog
          .open(this.clientTemplate, {panelClass: 'mbDialog'})
          .afterClosed()
          .subscribe(formValue => {
            const clientModelToSave = {...this.clientBeingEdited, ...formValue};

            if (this.clientBeingEdited && this.clientFormChanged) {
              this.clientsService.updateClient(clientModelToSave).subscribe();
            } else if (this.clientForm.valid) {
              this.clientsService.addClient(clientModelToSave).subscribe();
            }

            this.clientForm.reset();
          });
  }

  searchOptionSelected(client: IClient) {
    this.openClientFormDialog(client);
    this.searchInput.reset();
  }
}
