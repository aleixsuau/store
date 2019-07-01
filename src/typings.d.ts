interface IAppConfig {
  token: string;
  backgroundImage: string;
  queryLimit: number;
}

interface IClient {
  Id?: number;
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
  Address: string;
  CardHolder: string;
  CardNumber: string;
  City: string;
  ExpMonth: string;
  ExpYear: string;
  PostalCode: string;
  State: string;
}

interface IClientsResponse extends PaginationResponse {
  Clients: IClient[];
}

interface PaginationResponse {
  PaginationResponse: {
    PageSize: number;
    RequestedLimit: number;
    RequestedOffset: number;
    TotalResults: number;
  };
}

interface IAuthData {
  TokenType: string;
  AccessToken: string;
  User: IUser;
}

interface IUser {
  Id: string;
  FirstName: string;
  LastName: string;
  Type: 'Staff' | 'Owner' | 'Admin';
}

interface IPromiseError {
  rejection: {
    error: {
      message: string
    };
    headers?: any;
    message: string;
    name: string;
    ok: boolean;
    status: number;
    statusText: string;
    url: string;
  };
  promise: any;
  zone: any;
  task: any;
}

interface ErrorWithContext {
  name: string;
  siteId: string;
  user: string;
  time: number;
  id: string;
  url: string;
  status: string;
  message: string;
  stack: any;
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
  Type: 'Class' | 'Enrollment' | 'Appointment' | 'Resource' | 'Arrival';
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
