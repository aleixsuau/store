import { SalesService } from './../../../retail/services/sales/sales.service';
import { ClientsService } from './../../../clients/services/clients/clients.service';
import { IframeService } from './../../services/iframe/iframe.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-iframe',
  templateUrl: './iframe.component.html',
  styleUrls: ['./iframe.component.scss']
})
export class IframeComponent implements OnInit {
  contracts: IContract[];
  iframeForm: FormGroup;
  personalDetailsFormGroup: FormGroup;
  years: string[] = [];
  months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  activeClient: IClient;

  constructor(
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private iframeService: IframeService,
    private clientsService: ClientsService,
    private salesService: SalesService,
  ) { }

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    Array(30).fill(true).forEach((e, index) => {
      this.years = [...this.years, `${currentYear + index}`];
    });

    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.iframeForm = this.formBuilder.group({
      contract: [null, Validators.required],
      personalDetails: this.formBuilder.group({
        FirstName: [null, [Validators.required]],
        LastName: [null, [Validators.required]],
        Email: [null, [Validators.required, Validators.email]],
      }),
      ClientCreditCard: this.formBuilder.group({
                                          CardNumber: [null, Validators.required],
                                          ExpMonth: [null, Validators.required],
                                          ExpYear: [null, Validators.required],
                                          CVV: [null, Validators.required],
                                        })
    });

    this.personalDetailsFormGroup = this.iframeForm.get('personalDetails') as FormGroup;

    this.iframeService
          .getRequiredFields()
          .subscribe((requiredFields: string[]) => {
            requiredFields
              .filter(requiredField => !this.iframeForm.contains(requiredField))
              .forEach(requiredField => {
                const personalDetailsGroup = this.iframeForm.get('personalDetails') as FormGroup;

                personalDetailsGroup.addControl(requiredField, this.formBuilder.control(null, [Validators.required]));
              });
          });

  }

  getContractStart(contract: IContract, shortFormat: boolean) {
    switch (contract.ClientsChargedOn) {
      case 'OnSaleDate':
        return shortFormat ? 'Sale date' : 'On sale date';
        break;

      case 'FirstOfTheMonth':
        return shortFormat ? '1st' : 'First of the month';

      case 'FifteenthOfTheMonth':
        return shortFormat ? '15th' : 'Fifteenth of the month';

      case 'LastDayOfTheMonth':
        return shortFormat ? 'Last' : 'Last day of the month';

      case 'FirstOrFifteenthOfTheMonth':
        return shortFormat ? '1st/15th' : 'First or fifteenth of the month';

      case 'FirstOrSixteenthOfTheMonth':
        return shortFormat ? '1st/16th' : 'First or sixteenth of the month';

      case 'FifteenthOrEndOfTheMonth':
        return shortFormat ? '15th/Last' : 'Fifteenth or end of the month';

      case 'SpecificDate':
        return contract.ClientsChargedOnSpecificDate;
    }
  }

  validateLogin(username: string, password: string) {
    this.iframeService
          .validateLogin(username, password)
          .subscribe(response => console.log('sendSoapMessage response: ', response));
  }

  sendResetPasswordEmail(userEmail: string, userFirstName: string, userLastName: string) {
    this.iframeService
            .sendResetPasswordEmail(userEmail, userFirstName, userLastName)
            .subscribe(response => console.log('sendResetPasswordEmail response: ', response));
  }

  addClient(client: IClient) {
    this.clientsService
          .addClient(client)
          .subscribe(createdClient => {
            console.log('client', createdClient);
            this.activeClient = createdClient;
          });
  }

  updateClient(client: IClient, creditCard: IClientCreditCard) {
    const clientUpdate = { ...client, ClientCreditCard: creditCard };

    return this.clientsService
                  .updateClient(clientUpdate)
                  .pipe(
                    map(updatedClient => {
                      console.log('updatedClient', updatedClient)
                      this.activeClient = updatedClient;

                      return this.activeClient;
                    })
                  );
  }

  sellContract(contract: IContract, client: IClient, creditCard: IClientCreditCard) {
      this.updateClient(client, creditCard)
            .pipe(
              switchMap(updatedClient => this.salesService.sellContract(contract, updatedClient, true))
            )
            .subscribe();
  }
}
