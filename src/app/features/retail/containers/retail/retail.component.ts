import { MomentService } from './../../../../core/services/moment/moment.service';
import { SalesService } from './../../services/sales/sales.service';
import { ClientsService } from './../../../clients/services/clients/clients.service';
import { FormGroup, FormBuilder, Validators, FormControl, FormGroupDirective, NgForm, ValidatorFn, AbstractControl } from '@angular/forms';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, filter, switchMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ErrorStateMatcher } from '@angular/material';

class ClientErrorMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return control.touched && control.value && !control.value.Id;
  }
}

function clientValidator(control: AbstractControl): {[key: string]: any} | null {
    return control.value && !control.value.Id ? { 'clientError': true } : null;
}

@Component({
  selector: 'app-retail',
  templateUrl: './retail.component.html',
  styleUrls: ['./retail.component.scss']
})
export class RetailComponent implements OnInit, OnDestroy {
  clients: IClient[];
  contracts: IContract[];
  clientContracts: IContract[];
  retailForm: FormGroup;
  retailFormSubscription: Subscription;
  clientErrorMatcher = new ClientErrorMatcher();

  @ViewChild('clientInput', {static: true})
  clientInput: ElementRef;

  constructor(
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private clientsService: ClientsService,
    private salesService: SalesService,
    private momentService: MomentService,
  ) { }

  ngOnInit() {
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.retailForm = this.formBuilder.group({
      client: [null, [Validators.required, clientValidator]],
      contract: [null, Validators.required],
      instantPayment: [ true ],
      contractStart: [null],
    });

    // TODO: Avoid call to server when the client is selected
    this.retailFormSubscription = this.retailForm
                                        .get('client')
                                        .valueChanges
                                        .pipe(
                                          debounceTime(400),
                                          filter(changes => changes.Id == null),
                                          switchMap(changes => this.clientsService.getClients(null, changes)),
                                        )
                                        .subscribe(results => {
                                          this.clients = results.Clients;
                                        });
  }

  ngOnDestroy() {
    this.retailFormSubscription.unsubscribe();
  }

  displayClientFn(client: IClient) {
    return client ? client.FirstName + ' ' + client.LastName : null;
  }

  sellContract(contract: IContract, client: IClient, instantPayment: boolean) {
    this.salesService
          .sellContract(contract, client, instantPayment)
          .subscribe(res => this.setSelectedClientContracts(client));
  }

  setSelectedClientContracts(client: IClient) {
    this.clientsService
          .getClientContracts(client.Id)
          .subscribe(mbContracts => {
            this.clientContracts = this.contracts.filter(contract => !mbContracts.map(mbContract => mbContract.id).includes(contract.Id));
          });
  }

  dateFilter = (date: Date) => {
    const selectedContract = this.retailForm.get('contract').value;

    return this.enableDate(selectedContract, date);
  }

  enableDate(contract: IContract, date: Date) {
    const dateToCheck = this.momentService.moment(date);
    const first = this.momentService.moment(date).startOf('month');
    const last = this.momentService.moment(date).endOf('month');
    const fifteen =  this.momentService.moment(date).date(15);
    const sixteen =  this.momentService.moment(date).date(16);
    const today = this.momentService.moment();
    let dateToCompare;

    if (dateToCheck.isBefore(today)) {
      return false;
    }

    switch (contract.ClientsChargedOn) {
      case 'FirstOfTheMonth':
        dateToCompare = first;
        break;

      case 'FifteenthOfTheMonth':
        dateToCompare = fifteen;
        break;

      case 'LastDayOfTheMonth':
        dateToCompare = last;
        break;

      // TODO: Cover this case
      case 'FirstOrFifteenthOfTheMonth':
        dateToCompare = today.diff(first, 'days') < today.diff(fifteen, 'days') ?
                          first :
                          fifteen;
        break;

      case 'FirstOrSixteenthOfTheMonth':
        dateToCompare = today.diff(first, 'days') < today.diff(sixteen, 'days') ?
                          first :
                          sixteen;
        break;

      case 'FifteenthOrEndOfTheMonth':
        dateToCompare = today.diff(fifteen, 'days') < today.diff(last, 'days') ?
                          fifteen :
                          last;
        break;

      case 'SpecificDate':
        dateToCompare = this.momentService.moment(contract.ClientsChargedOnSpecificDate);
        return dateToCheck.isSame(dateToCompare);

      case 'OnSaleDate':
        dateToCompare = today;
        return dateToCheck.isSame(dateToCompare);

      default:
        return true;
    }

    return dateToCheck.date() === dateToCompare.date();
  }
}
