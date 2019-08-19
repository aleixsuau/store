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
  ) { }

  ngOnInit() {
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.retailForm = this.formBuilder.group({
      client: [null, [Validators.required, clientValidator]],
      contract: [null, Validators.required],
      SendEmail: false,
    });

    // TODO: Avoid call to server when the client is selected
    this.retailFormSubscription = this.retailForm
                                        .get('client')
                                        .valueChanges
                                        .pipe(
                                          debounceTime(400),
                                          switchMap(changes => this.clientsService.getClients(null, changes))
                                        )
                                        .subscribe(results => this.clients = results.Clients);
  }

  ngOnDestroy() {
    this.retailFormSubscription.unsubscribe();
  }

  displayClientFn(client: IClient) {
    return client ? client.FirstName + ' ' + client.LastName : null;
  }

  sellContract(contract: IContract, client: IClient) {
    this.salesService.sellContract(contract, client).subscribe();
  }
}
