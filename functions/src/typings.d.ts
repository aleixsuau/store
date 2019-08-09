// tslint:disable-next-line:no-namespace
/* declare namespace Express {
  export interface Request {
    appConfig?: IAppConfig;
  }
} */

// TODO: Finish DDBB interfaces
interface IMindBroBusiness {
  clients: IMindBroClient[];
  config: IAppConfig;
}

interface IMindBroClient {
  contracts: IContract[];
  payments: IMindBroPayments;
}

interface IMindBroPayments {
  CVV: string;
  cardId: string;
  cardToken: string;
  clientId: string;
}

interface IAppConfig {
  id: string;
  token: string;
  apiKey: string;
  test: boolean;
  customization: {
    language: string;
    country: string;
    backgroundImage: string;
  };
  payments: {
    gateaway: {
      name: string;
      url: string;
      apiToken: {
        test: string;
        production: string;
      };
      apiKey: {
        test: string;
        production: string;
      };
    },
    needs_cvv: boolean;
  };
  queryLimit: number;
}

interface IClient {
  Id?: number;
  UniqueId?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  ApptGenderPrefMale?: string;
  AppointmentGenderPreference?: string;
  BirthDate?: string;
  City?: string;
  ClientCreditCard?: IClientCreditCard;
  ClientIndexes?: [
    {
      Id?: number;
      ValueId?: number;
    }
  ];
  ClientRelationships?: [
    {
      RelatedClient?: {
        Id?: number;
      };
      Relationship?: {
        Id?: number;
        RelationshipName1?: string;
        RelationshipName2?: string;
      }
    }
  ];
  Country?: string;
  CustomClientFields?: [
    {
      Value?: string,
      Id?: number;
    }
  ];
  Email?: string;
  EmergencyContactInfoEmail?: string;
  EmergencyContactInfoName?: string;
  EmergencyContactInfoPhone?: string;
  EmergencyContactInfoRelationship?: string;
  FirstName: string;
  Gender?: string;
  HomeLocation?: {
    Id?: number
  };
  HomePhone?: string;
  IsProspect?: boolean;
  LastName: string;
  LiabilityRelease?: boolean;
  MiddleName?: string;
  MobilePhone?: string;
  MobileProvider?: number;
  PostalCode?: string;
  ProspectStage?: {
    Id?: number;
  };
  ReferredBy?: string;
  SalesReps?: [
    {
      Id?: number;
      SalesRepNumber?: number;
    }
  ];
  State?: string;
  Test?: string;
  WorkExtension?: string;
  WorkPhone?: string;
  SendScheduleEmails?: boolean;
  SendAccountEmails?: boolean;
}

interface IClientCreditCard {
  CardNumber: string;
  ExpMonth: string;
  ExpYear: string;
  Address?: string;
  CardHolder?: string;
  City?: string;
  PostalCode?: string;
  State?: string;
  CVV?: number;
  paymentMethod?: string;
}

interface IClientPaymentsConfig {
  CVV: number;
  clientId: string;
  cardId: string;
  cardToken: string;
}

// MINDBODY
interface IMindbodyError {
  Error: {
    Message: string;
    Code: string;
  }
}

interface IContract {
  Id: string;
  Name: string;
  Description: string;
  AssignsMembershipId: number;
  AssignsMembershipName: string;
  SoldOnline: boolean;
  ContractItems: IContractItem[];
  IntroOffer: string;
  AutopaySchedule: IContractAutopaySchedule;
  NumberOfAutopays: number;
  AutopayTriggerType: 'OnSetSchedule' | 'PricingOptionRunsOutOrExpires';
  ActionUponCompletionOfAutopays: 'ContractExpires' | 'ContractAutomaticallyRenews';
  ClientsChargedOn: 'OnSaleDate' | 'FirstOfTheMonth' | 'FifteenthOfTheMonth' |
                    'LastDayOfTheMonth' | 'FirstOrFifteenthOfTheMonth' | 'FirstOrSixteenthOfTheMonth' |
                    'FifteenthOrEndOfTheMonth' | 'SpecificDate';
  ClientsChargedOnSpecificDate: string;
  DiscountAmount: number;
  DepositAmount: number;
  FirstAutopayFree: boolean;
  LastAutopayFree: boolean;
  ClientTerminateOnline: boolean;
  MembershipTypeRestrictions: IContractMembershipTypeRestrictions;
  LocationPurchaseRestrictionIds: number[];
  LocationPurchaseRestrictionNames: string[];
  AgreementTerms: string;
  RequiresElectronicConfirmation: boolean;
  AutopayEnabled: boolean;
  FirstPaymentAmountSubtotal: number;
  FirstPaymentAmountTax: number;
  FirstPaymentAmountTotal: number;
  RecurringPaymentAmountSubtotal: number;
  RecurringPaymentAmountTax: number;
  RecurringPaymentAmountTotal: number;
  TotalContractAmountSubtotal: number;
  TotalContractAmountTax: number;
  TotalContractAmountTotal: number;
}

interface IContractItem {
  Id: number;
  Name: string;
  Description: string;
  Type: 'Package' | 'Product' | 'Service' | 'Tip';
  Price: number;
  Quantity: number;
  OneTimeItem: boolean;
}

interface IContractAutopaySchedule {
  FrequencyType: string;
  FrequencyValue: number;
  FrequencyTimeUnit: 'Weekly' | 'Monthly' | 'Yearly';
}

interface IContractMembershipTypeRestrictions {
  Id: number;
  Name: string;
}

// MERCADOPAGO
interface IMercadoPagoError {
  message: string;
  error:  string;
  status: number;
  cause: [
    {
      code: string;
      description: string;
    }
  ]
}


