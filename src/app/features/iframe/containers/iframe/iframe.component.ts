import { IframeService } from './../../services/iframe/iframe.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-iframe',
  templateUrl: './iframe.component.html',
  styleUrls: ['./iframe.component.scss']
})
export class IframeComponent implements OnInit {
  contracts: IContract[];
  iframeForm: FormGroup;

  constructor(
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private iframeService: IframeService,
  ) { }

  ngOnInit() {
    this.contracts = this.activatedRoute.snapshot.data.contracts;
    this.iframeForm = this.formBuilder.group({
      contract: [null, Validators.required]
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
}
