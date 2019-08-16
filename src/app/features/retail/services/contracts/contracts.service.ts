import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ContractsService {

  constructor(
    private httpClient: HttpClient,
  ) { }

  getContracts(): Observable<IContract[]> {
    const contracts: IContract[] = [
      {
        Id: '1',
        Name: 'Contract 1 Name',
        Description: 'Contract 1 Description',
        AssignsMembershipId: null,
        AssignsMembershipName: null,
        SoldOnline: true,
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 10,
          FrequencyTimeUnit: 'Monthly',
        },
        IntroOffer: 'None',
        NumberOfAutopays: 12,
        AutopayTriggerType: 'OnSetSchedule',
        ActionUponCompletionOfAutopays: 'ContractExpires',
        ClientsChargedOn: 'FirstOfTheMonth',
        ClientsChargedOnSpecificDate: null,
        DiscountAmount: 0,
        DepositAmount: 0,
        FirstAutopayFree: false,
        LastAutopayFree: false,
        ClientTerminateOnline: false,
        MembershipTypeRestrictions: null,
        LocationPurchaseRestrictionIds: null,
        LocationPurchaseRestrictionNames: null,
        AgreementTerms: 'Agreement Terms',
        RequiresElectronicConfirmation: false,
        AutopayEnabled: true,
        FirstPaymentAmountSubtotal: 80,
        FirstPaymentAmountTax: 10,
        FirstPaymentAmountTotal: 90,
        RecurringPaymentAmountSubtotal: 80,
        RecurringPaymentAmountTax: 10,
        RecurringPaymentAmountTotal: 90,
        TotalContractAmountSubtotal: 960,
        TotalContractAmountTax: 120,
        TotalContractAmountTotal: 1080,
        ContractItems: [
          {
            Id: '1192',
            Name: 'Six Week Bootcamp',
            Description: 'Six Week Bootcamp ContractItem 1 Description',
            Type: 'Service',
            Price: 200,
            Quantity: 1,
            OneTimeItem: false,
          },
          {
            Id: '1364',
            Name: '10 Class Card',
            Description: ' 10 Class Card ContractItem 2 Description',
            Type: 'Service',
            Price: 100,
            Quantity: 1,
            OneTimeItem: false,
          }
        ],
      },
      {
        Id: '2',
        Name: 'Contract 2 Name',
        Description: 'Contract 2 Description',
        AssignsMembershipId: null,
        AssignsMembershipName: null,
        SoldOnline: true,
        AutopaySchedule: {
          FrequencyType: 'SetNumberOfAutopays',
          FrequencyValue: 10,
          FrequencyTimeUnit: 'Monthly',
        },
        IntroOffer: 'None',
        NumberOfAutopays: 12,
        AutopayTriggerType: 'OnSetSchedule',
        ActionUponCompletionOfAutopays: 'ContractExpires',
        ClientsChargedOn: 'FirstOfTheMonth',
        ClientsChargedOnSpecificDate: null,
        DiscountAmount: 0,
        DepositAmount: 0,
        FirstAutopayFree: false,
        LastAutopayFree: false,
        ClientTerminateOnline: false,
        MembershipTypeRestrictions: null,
        LocationPurchaseRestrictionIds: null,
        LocationPurchaseRestrictionNames: null,
        AgreementTerms: 'Agreement Terms',
        RequiresElectronicConfirmation: false,
        AutopayEnabled: true,
        FirstPaymentAmountSubtotal: 80,
        FirstPaymentAmountTax: 10,
        FirstPaymentAmountTotal: 90,
        RecurringPaymentAmountSubtotal: 80,
        RecurringPaymentAmountTax: 10,
        RecurringPaymentAmountTotal: 90,
        TotalContractAmountSubtotal: 960,
        TotalContractAmountTax: 120,
        TotalContractAmountTotal: 1080,
        ContractItems: [
          {
            Id: '1192',
            Name: 'Six Week Bootcamp',
            Description: 'Six Week Bootcamp ContractItem 1 Description',
            Type: 'Service',
            Price: 200,
            Quantity: 2,
            OneTimeItem: false,
          },
          {
            Id: '1364',
            Name: '10 Class Card',
            Description: ' 10 Class Card ContractItem 2 Description',
            Type: 'Service',
            Price: 100,
            Quantity: 1,
            OneTimeItem: false,
          }
        ],
      }
    ];

    return of(contracts);
  }
}



