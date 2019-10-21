interface IMindBroBusiness {
  clients: IMindBroClient[];
  config: IAppConfig;
}

interface IMindBroClient {
  contracts: {[key: string]: IMindBroClientContractTracking};
  payments_config: IMindBroClientPaymentsConfig;
}

interface IMindBroClientContractTracking {
  Id: string;
  date_created: string;
  status: IMindBroClientContract['status'];
}

interface IMindBroClientContract {
  id: string;
  date_created: string;
  date_created_timestamp: Date | IFirebaseTimestamp;
  start_date: string;
  status: 'active' | 'paused' | 'canceled' | 'terminated' | 'payment_pending' | 'activation_pending' | 'paused_no_payment';
  client_id: string;
  autopays_counter: number;
  last_autopay: string;
}

interface IMindBroClientPaymentsConfig {
  CVV: string;
  cardId: string;
  cardToken: string;
  clientId?: string;
}

interface IAppConfig {
  id: string;
  token: string;
  apiKey: string;
  test: boolean;
  today_test_mock: string;
  customization: {
    language: string;
    country: string;
    backgroundImage: string;
    texts: { [key: string]: { title: string, value: string} };
  };
  payments: {
    gateaway: {
      name: string;
      url: string;
      test_payment_response: string;
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
    number_of_retries: number;
  };
  queryLimit: number;
}

interface IClient {
  Id?: string;
  ID?: string;
  UniqueId?: number;
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
  CVV?: string;
  paymentMethod?: string;
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
  MembershipTypeRestrictions: IContractMembershipTypeRestrictions[];
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
  Id: string;
  Name: string;
  Description: string;
  Type: 'Package' | 'Product' | 'Service' | 'Tip';
  Price: number;
  Quantity: number;
  OneTimeItem: boolean;
}

interface IContractAutopaySchedule {
  FrequencyType: 'SetNumberOfAutopays' | 'MonthToMonth';
  FrequencyValue: number;
  FrequencyTimeUnit: 'Weekly' | 'Monthly' | 'Yearly';
}

interface IContractMembershipTypeRestrictions {
  Id: number;
  Name: string;
}

interface IService {
  Price: number;
  OnlinePrice: number;
  TaxIncluded: number;
  ProgramId: number;
  TaxRate: number;
  ProductId: number;
  Id: string;
  Name: string;
  Count: number;
}

interface IOrder {
  id: string;
  date_created: string;
  date_created_timestamp: Date;
  client_id: string;
  contract_id: string;
  delivered: boolean;
  delivery_attempts: any[];
  shopping_cart: IShoppingCart;
  payment_status: 'rejected' | 'in_process' | 'approved' | 'error' | 'canceled' | 'refunded';
  payment_status_detail: string;
  payment_attempts: IPayment[];
  seller: IUser;
}

interface IShoppingCart {
  Id: string;
  CartItems: ICartItem[];
  SubTotal: number;
  DiscountTotal: number;
  TaxTotal: number;
  GrandTotal: number;
}

interface ICartItem {
  Item: IService;
  DiscountAmount: number;
  VisitIds: string[];
  AppointmentIds: string[];
  Appointments: string[];
  Id: number;
  Quantity: number;
}

interface IPayment {
  error: any;
  id?: number;
  date_created?: string;
  date_approved?: string;
  date_last_updated?: string;
  date_of_expiration?: string;
  money_release_date?: string;
  operation_type?: string;
  issuer_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  status?: 'rejected' | 'in_process' | 'approved';
  status_detail?: string;
  currency_id?: string;
  description?: string;
  live_mode?: boolean;
  sponsor_id?: string;
  authorization_code?: string;
  money_release_schema?: string;
  taxes_amount?: number;
  counter_currency?: string;
  shipping_amount?: number;
  pos_id?: string;
  store_id?: string;
  collector_id?: number;
  payer?:
   {
     first_name?: string;
     last_name?: string;
     email?: string;
     identification?: { number?: string; type?: string; };
     phone?: { area_code?:  string; number?:  string; extension?: string; };
     type?: string;
     entity_type?: string;
     id?:  string;
   };
  metadata?: {};
  additional_info?: {};
  order?: {};
  external_reference?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  coupon_amount?: number;
  differential_pricing_id?: string;
  deduction_schema?: string;
  transaction_details?:
   { payment_method_reference_id?: string;
     net_received_amount?: number;
     total_paid_amount?: number;
     overpaid_amount?: number;
     external_resource_url?: string;
     installment_amount?: number;
     financial_institution?: string;
     payable_deferral_period?: string;
     acquirer_reference?: string; };
  fee_details?:
   [ { type?: string;
       amount?: number;
       fee_payer?: string; } ];
  captured?: boolean;
  binary_mode?: boolean;
  call_for_authorize_id?: string;
  statement_descriptor?: string;
  installments?: number;
  card?:
   { id?: string;
     first_six_digits?: string;
     last_four_digits?: string;
     expiration_month?: number;
     expiration_year?: number;
     date_created?: string;
     date_last_updated?: string;
     cardholder?: {
       name?: string;
       identification?: {
        number?: string;
        type?: string;
       }
     }
  };
  notification_url?: string;
  refunds?: any[];
  processing_mode?: string;
  merchant_account_id?: string;
  acquirer?: string;
  merchant_number?: string;
  acquirer_reconciliation?: any[];
}

interface IFirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
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
