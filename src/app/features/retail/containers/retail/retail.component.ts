import { MomentService } from './../../../../core/services/moment/moment.service';
import { SalesService } from './../../services/sales/sales.service';
import { ClientsService } from './../../../clients/services/clients/clients.service';
import { FormGroup, FormBuilder, Validators, FormControl, FormGroupDirective, NgForm, ValidatorFn, AbstractControl } from '@angular/forms';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ErrorStateMatcher } from '@angular/material/core';

class ClientErrorMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return control.touched && control.value && !control.value.Id;
  }
}

function clientValidator(control: AbstractControl): {[key: string]: any} | null {
    return control.value && !control.value.Id ? { 'clientError': true } : null;
}

function clientCreditCardValidator(control: AbstractControl): {[key: string]: any} | null {
  return control.value && !control.value.ClientCreditCard ? { 'clientCreditCardError': true } : null;
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
  clientSearchSubscription: Subscription;
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
      client: [null, [Validators.required, clientValidator, clientCreditCardValidator]],
      contract: [{ value: null, disabled: true }, Validators.required],
      instantPayment: [ true ],
      contractStart: [{ value: null, disabled: true }, null],
    });

    // TODO: Avoid call to server when the client is selected
    this.retailFormSubscription = this.retailForm
                                        .valueChanges
                                        .pipe(
                                          tap(() => {
                                            const clientControl = this.retailForm.get('client');
                                            const contractControl = this.retailForm.get('contract');
                                            const contractStartControl = this.retailForm.get('contractStart');

                                            !clientControl.value || clientControl.invalid ?
                                              contractControl.disable({emitEvent: false}) :
                                              contractControl.enable({emitEvent: false});
                                            !contractControl.value || contractControl.invalid ?
                                              contractStartControl.disable({emitEvent: false}) :
                                              contractStartControl.enable({emitEvent: false});
                                          })
                                        )
                                        .subscribe();

    this.clientSearchSubscription = this.retailForm
                                        .get('client')
                                        .valueChanges
                                        .pipe(
                                          debounceTime(400),
                                          filter(changes => changes && !changes.Id),
                                          switchMap(changes => this.clientsService.getClients(null, changes)),
                                        )
                                        .subscribe(results => {
                                          this.clients = results.Clients;
                                        });
  }

  ngOnDestroy() {
    this.retailFormSubscription.unsubscribe();
    this.clientSearchSubscription.unsubscribe();
  }

  displayClientFn(client: IClient) {
    return client ? client.FirstName + ' ' + client.LastName : null;
  }

  sellContract(contract: IContract, client: IClient, instantPayment: boolean, startDate?: string) {
    const startDateToSend = startDate && new Date(startDate).toString();

    this.salesService
          .sellContract(contract, client, instantPayment, startDateToSend)
          .subscribe(() => {
            this.setSelectableClientContracts(client);
            this.retailForm.reset();
          });
  }

  setSelectableClientContracts(client: IClient) {
    this.clientsService
          .getClientContracts(client.Id)
          .subscribe(mbContracts => {
            this.clientContracts = this.contracts.filter(contract => !mbContracts.filter(mbContract => mbContract.status === 'active').map(mbContract => mbContract.id).includes(contract.Id));
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
    const today = this.momentService.moment().startOf('day');
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
