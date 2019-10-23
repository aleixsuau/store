/* EXPLANATION

- This project relies on MindBody:
  - IContract:
    The IContract is a MindBody contract that contains all the items that are going to be charged.
    It also constains the periodicity of the charges (Autopays) on its property AutopaySchedule.FrequencyType that
    can be:
        - 'SetNumberOfAutopays': set a schedule timing ('OnSaleDate' | 'FirstOfTheMonth' | 'SpecificDate'...)
          and a number of payments (IContract.NumberOfAutopays).
        - 'MonthToMonth': charge every month until the business owner stops it.

    * IContracts can only be created/updated/deleted on MindBody
    * We use IContracts to show/search all the contracts available and their details throught their Id
    * A IMindBroClientContract represent a collection of IOrders to be done in the future. autopays_counter
      (if IContractAutopaySchedule.FrequencyType === 'SetNumberOfAutopays') determines wether there are
      remaining autopays to be done.
    * We use IMindBroClientContracts (on our Firebase DDBB) to keep track of orders, billing and autopays related to a
      IContract Id purchased by a IClient.

  - IClient:
    The IClient is a MindBody client that contains all the client data.

    * IClients can be created/updated either on Mindbody or MindBro. They can be deleted only on MindBody.
    * We use IClients to show/search all the clients available and their details throught their Id.
    * We use IMindBroClients (on our Firebase DDBB) to keep track of the client payments_config and the
      contracts associated to ther IClient id.

  - Autopay:
    An autopay is a recurrent payment that the IClient agrees when a IContract is purchased. The autopays follow
    the IContract periodicity ()


- BILLING & AUTOPAYS
Every time a IContract is purchased by a IClient:
  1 - The IMindBroClientContract data (date_created, status, autopay_counter, id...) is added to the IContract
      into the DDBB (business/${businessId}/contracts/${contractId}/clients/${client.Id}) under the IClient.Id.
  2 - The IContract (id and date_created) is added to the IClient (business/${businessId}/clients/${clientId}/contracts/${contractId})
  3 - If the IContract is paid ('Instant' payment or 'FirstAutopayFree'...) the IOrder is added to the DDBB (business/${businessId}/orders)

The server runs an automatic task every day to:
  1 - Charge the Autopays that are due this day:
      1 - Iterates over all the IContract (business/${businessId}/contracts)
      2 - Iterates over all IContract.clients and if
          1 - IContract.status is 'active', 'activation_pending' or 'payment_pending' for the client
          2 - If _isTodayTheAutopayDay
          Continues
      3 - Processes the payments.
          - If the payment fails, the payment is saved under IOrder.payment_attempts
          - If IContract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays' &&
            IContract.autopays_counter === 0 &&
            contract.ActionUponCompletionOfAutopays !== 'ContractAutomaticallyRenews'
            sets the IContract.status to 'terminated'.

  2 - Retry the payments of the IOrders that failed
      (if the IAppConfig.payments.number_of_retries has not been exceeded).


  CONTRACTS PURCHASE
  When we purchase a contract we can specify two options:
  StartDate: The date that the contract starts (Default: Contract.clientsChargeOn)
  FirstPaymentOccurs: The date on which the first payment is to occur. Possible values: Instant || StartDate

  - If FirstPaymentOccurs == ‘Instant’, the first charge is done with the purchase but the IContract items
    won't be delivered until the IContract.ClientsChargeOn date (StartDate).
    1 - The IMindBroClientContract data (date_created, status, autopay_counter, id...) is added to the IContract
      into the DDBB (business/${businessId}/contracts/${contractId}/clients/${client.Id}) under the IClient.Id with
      the status 'activation_pending'.
    2 - The IContract (id and date_created) is added to the IClient (business/${businessId}/clients/${clientId}/contracts/${contractId})

  - If FirstPaymentOccurs == ‘StartDate’, the first charge is done on the specified ‘StartDate’ (following the IContract.ClientsChargeOn)
    and The IMindBroClientContract is added to the DDBB with the status 'payment_pending'. When the StartDate arrives, we process the payment,
    deliver the product and set last_autopay to the StartDate. The rest of autopays are done following the IContract.AutopaySchedule
    calculated based on the last_autopay.

  * ‘StartDate’ must be the same than the Contract.clientsChargeOn (‘firstOfTheMonth...’) if not it throws error, this is
    Contract.clientsChargeOn determines the StartDate (Contract.clientsChargeOn === StartDate).
  * If FirstPaymentOccurs === ‘Instant’ and Contract.clientsChargeOn states another day, the first charge is done with the
    purchase, we set last_autopay to the getFirstAutopayDate, and the rest of autopays are done following the IContract.AutopaySchedule
    calculated based on the last_autopay.

  CONTRACT STATUSES:
  1 - activation_pending:
      The IClient purchases a IContract and pays 'Instant' but the IContract is activated depending on:
      1 - Default ClientsChargeOn (startDate): the first IContract.ClientsChargeOn date match (FirstOfTheMonth...).
      2 - Custom ClientsChargeOn (startDate): the date that admin user chose when it made the purchase (it needs to
        follow the IContract.ClientsChargedOn ()).

      * When the ClientsChargeOn date arrives, the IOrder is made and sent to Mindbody, so the IClient is able to
      start using the gym, and the IContract.status = 'active'

  2 - payment_pending:
      The IClient purchases a IContract but he/she has not paid the current Autopay. This case happens when
      the payment of the purchase was not 'Instant', so the payment will take place on the IContract.ClientsChargeOn
      (custom or default (startDate)).

  3 - active:
      The IClient has purchased a IContract, has pait it and then it has been activated, this is, the IContract.ClientsChargeOn
      date has happened.

  4 - paused:
      The IClient has taken a break (summer holidays...)

  5 - paused_no_payment:
      The IClient has exceed the max number of retries (appConfig.payments.number_of_retries)
      in the last autopay.

  6 - canceled:
      The IContract has been canceled by an admin user.

  7 - terminated:
      The IContract ended (the NumberOfAutopays finished).
*/

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import axios from 'axios';
import * as UUID from 'uuid/v4';
import * as moment from 'moment';
import * as parser from 'fast-xml-parser';

export class CustomError extends Error {
  code: number;
  date: string;

  constructor(
    message: string,
    code: number) {
      super(message);
      this.code = code;
      this.date = new Date().toISOString();
      Error.captureStackTrace(this, CustomError);
  }
}

// Initialize FB App
admin.initializeApp(functions.config().firebase);
const baseUrl = `https://api.mindbodyonline.com/public/v6`;
const DDBB = admin.firestore();
const server = express();
const httpClient = axios;

// TODO: Delete this mock
const contractsMock: IContract[] = [
  {
    Id: '1',
    Name: 'Contract 1: Every 1 Month | FirstOfTheMonth',
    Description: 'Contract 1 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
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
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
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
    Name: 'Contract 2: Every 1 Week | FifteenthOfTheMonth',
    Description: 'Contract 2 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Weekly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'FifteenthOfTheMonth',
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
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
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
    Id: '3',
    Name: 'Contract 3: Every 1 Year | LastDayOfTheMonth',
    Description: 'Contract 3 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Yearly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 12,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'LastDayOfTheMonth',
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
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
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
    Id: '4',
    Name: 'Contract 4: Every 1 Week | OnSaleDate',
    Description: 'Contract 4 Description Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    AssignsMembershipId: null,
    AssignsMembershipName: null,
    SoldOnline: true,
    AutopaySchedule: {
      FrequencyType: 'SetNumberOfAutopays',
      FrequencyValue: 1,
      FrequencyTimeUnit: 'Weekly',
    },
    IntroOffer: 'None',
    NumberOfAutopays: 5,
    AutopayTriggerType: 'OnSetSchedule',
    ActionUponCompletionOfAutopays: 'ContractExpires',
    ClientsChargedOn: 'OnSaleDate',
    ClientsChargedOnSpecificDate: '2019-09-25T15:35:23.983Z',
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
    FirstPaymentAmountSubtotal: 300,
    FirstPaymentAmountTax: 8,
    FirstPaymentAmountTotal: 308,
    RecurringPaymentAmountSubtotal: 300,
    RecurringPaymentAmountTax: 8,
    RecurringPaymentAmountTotal: 308,
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
];
const mercadoPagoMessages: {[key: string]: string} = {
  accredited: 'Listo, se acreditó el pago! En el resumen verás el cargo de amount como statement_descriptor',
  pending_contingency: 'Estamos procesando el pago. En menos de 2 días hábiles enviaremos por e-mail el resultado.',
  pending_review_manual: 'Estamos procesando el pago. En menos de 2 días hábiles enviaremos por e-mail el resultado.',
  cc_rejected_bad_filled_card_number:	'Revisa el número de tarjeta',
  cc_rejected_bad_filled_date: 'Revisa la fecha de vencimiento.',
  cc_rejected_bad_filled_other: 'Revisa los datos.',
  cc_rejected_bad_filled_security_code:'Revisa el código de seguridad.',
  cc_rejected_blacklist: 'No pudimos procesar el pago.',
  cc_rejected_call_for_authorize:	'Debes autorizar ante la entidad emisora de su tarjeta el pago de amount a Mercado Pago',
  cc_rejected_card_disabled: 'Llama a la entidad emisora de su tarjeta para que active la tarjeta. El teléfono está al dorso de tu tarjeta.',
  cc_rejected_card_error: 'No pudimos procesar el pago.',
  cc_rejected_duplicated_payment:	'Ya hiciste un pago por ese valor. Si necesitas volver a pagar usa otra tarjeta u otro medio de pago.',
  cc_rejected_high_risk: 'El pago fue rechazado.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_invalid_installments: 'La entidad emisora de la tarjeta no procesa pagos en cuotas.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos permitidos.',
  cc_rejected_other_reason: 'La entidad emisora de la tarjeta no procesó el pago.',
};
// MIDDLEWARE
// Automatically allow cross-origin requests
server.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'SiteId'],
}));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

/*
// ADD appConfig in this middleware??
server.use(async (req, res, next) => {
  console.log('HELLO from the middleware:', req.header('siteId'));
  const siteId = req.header('siteId');
  const appConfig = await _getAppConfig(siteId);

  req['appConfig'] = appConfig;

  next();
}) */


// UTILS
function handleClientErrors(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('handleClientErrors', siteId, token, req.body);
  res.status(200).json({message: 'Error received'});
}

function _handleServerErrors(error: any, res: express.Response) {
  console.log('_handleServerErrors', Object.keys(error), error.code, error.details, error.metadata, error);
  if (error.response) {
    console.log('_handleServerErrors error.response', Object.keys(error.response), error.response.data, error.response);

    const errorResponse: IMindbodyError | any = error.response.data;
    let errorMessage;
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx (Axios httpClient)
    if (errorResponse.error) {
      errorMessage = `${errorResponse.error}: ${errorResponse.cause[0] && errorResponse.cause[0].description || errorResponse.message}`;
    // Mercadopago Error
    } else if (errorResponse.Error) {
      errorMessage = `MindBody Error: ${errorResponse.Error.Code}: ${errorResponse.Error.Message}`;
    }

    res.status(errorResponse.status || error.response.status || 500).json(errorMessage);
  } else if (error.Error) {
    res.status(500).json(error.Error);
    // Firestore Error
  } else if (error.metadata) {
    res.status(500).json(error.metadata);
  } else {
    res.status(error.code || 500).json(`${error.name || error.code}: ${error.message}`);
  }
}

async function _checkMindbodyAuth(apiKey: string, siteId: string, token: string) {
  console.log('_checkMindbodyAuth', apiKey, siteId, token);
  const config = {
    headers: {
    'Api-Key': apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };
  const url = `${baseUrl}/sale/giftcards`;
  // Make a call just to validate that the user is authenticated on Mindbody
  try {
    await httpClient.get(url, config);
    return true;
  } catch (error) {
    throw new CustomError('Unauthenticated user', 401);
  }
}

async function _getClientEnviromentVariables(siteId: string) {
  const aliasMapSnapshot = await DDBB.collection('business').doc('alias').get();
  const aliasMap = aliasMapSnapshot.data();
  const alias = aliasMap[siteId];

  return functions.config()[alias];
}


// ROUTE HANDLERS
// CONFIG
function getConfig(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;

  _getAppConfig(siteId)
    .then(appConfig => {
      if (!appConfig) {
        res.status(404).json('No app with this id');
      }
      // Keep apiKey private
      const {customization, id, queryLimit, test} = appConfig;
      res.status(200).json({customization, id, queryLimit, test, payments: { needs_iframe: appConfig.payments.needs_iframe }});
    })
    .catch(error => res.status(500).json(error));
}

export async function _getAppConfig(siteId: string): Promise<IAppConfig> {
  console.log('_getAppConfig', siteId);
  if (!siteId) { throw new Error('Please provide an ID'); }

  const businessData = await DDBB.collection('business').doc(siteId).get();

  console.log('businessDataaaaa', businessData.data());

  if (!businessData.exists || !businessData.data() || !businessData.data().config){
    console.log('No App with this ID');
    return null;
  } else {
    return businessData.data().config as IAppConfig;
  }
}

async function updateConfig(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.params.siteId;
  const todayTestMock = moment(req.body).toISOString();
  console.log('updateConfig', siteId, todayTestMock);

  try {
    await DDBB.collection('business').doc(siteId).update({'config.today_test_mock': todayTestMock});
    res.status(200).json(todayTestMock);
  } catch (error) {
    res.status(500).json(error);
  }
}

// AUTH
async function login(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const username = req.body.username;
  const password = req.body.password;
  console.log('_login', siteId, username, password);

  try {
    const tokenResponse = await _login(siteId, username, password);

    res.status(tokenResponse.status).json(tokenResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function _login(siteId: string, username: string, password: string) {
  const appConfig = await _getAppConfig(siteId);
  const url = `${baseUrl}/usertoken/issue`;
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': siteId,
    }
  };
  const tokenRequest = {
    Username: username,
    Password: password,
  };

  const tokenResponse = await httpClient.post(url, tokenRequest, config);
  console.log('tokenResponse', tokenResponse.data);

  return tokenResponse;
}

// CLIENTS

async function getAllClients(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const searchText = req.query.SearchText;
  const limit = req.query.limit;
  const offset = req.query.offset;
  console.log('_getAllClients', siteId, token, limit, offset, searchText, `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`);

  if (!token) { res.status(401).json({message: 'Unauthorized'});}
  if (!siteId ) { res.status(422).json({message: 'SiteId header is missing'});}

  try {
    const appConfig = await _getAppConfig(siteId);
    const clientsResponse = await _getAllClients(appConfig.apiKey, siteId, token, searchText, limit, offset);

    res.status(clientsResponse.status).json(clientsResponse.data);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function _getAllClients(apiKey: string, siteId: string, token: string, searchText?: string, limit?: string, offset?: string) {
  const url = `${baseUrl}/client/clients?${limit || 200}&offset=${offset || 0}${searchText ? `&SearchText=${searchText}` : ''}`;
  const config = {
    headers: {
    'Api-Key': apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };
  const clientsResponse = await httpClient.get(url, config);

  return clientsResponse;
}

async function addClient(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const client: IClient = {
    ...req.body.Client,
    date_created: new Date(),
  };
  console.log('_addClient', client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...)(If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.

  // Turn CardNumber & CVV to string
  if (client.ClientCreditCard && client.ClientCreditCard.CVV) {
    client.ClientCreditCard.CVV = `${client.ClientCreditCard.CVV}`;
    client.ClientCreditCard.CardNumber = `${client.ClientCreditCard.CardNumber}`;
  }

  try {
    const appConfig = await _getAppConfig(siteId);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    let paymentsConfig;

    if (isSavingANewCreditCard) {

      paymentsConfig = await _createPaymentsConfig(appConfig, client);
      console.log('paymentsConfig', paymentsConfig)
    }
    // Save the user to MindBody
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    const newClientResponse = await httpClient.post(`${baseUrl}/client/addclient`, client, config);
    console.log('newClientResponse', newClientResponse.data);
    let clientToSave: IMindBroClient = {
      contracts: {},
      payments_config: null,
    }

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (paymentsConfig) {
      console.log('paymentsConfig', `business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`, paymentsConfig)
      clientToSave = {
        ...clientToSave,
        payments_config: paymentsConfig,
      }
    }

    await DDBB
            .doc(`business/${appConfig.id}/clients/${newClientResponse.data.Client.UniqueId}`)
            .set(clientToSave);

    res
      .status(newClientResponse.status)
      .json(newClientResponse.data.Client || newClientResponse.statusText);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function updateClient(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const clientId = req.params.id;
  const client = req.body.Client;
  const siteId = req.header('siteId');
  const token = req.header('Authorization');

  console.log('updateClient', clientId, client, siteId, token);
  //   1 - _createPaymentsConfig for this client (CVV, token...) (If he is
  //      saving a credit card, we create the credit card token before
  //      the user to avoid saving the user with an invalid credit card).
  //   2 - Save the client to MB and get his id
  //   3 - Save client paymentsConfig (token, CVV...) to firebase under the
  //      user’s MB id.
  // Turn CardNumber & CVV to string
  if (client.ClientCreditCard && client.ClientCreditCard.CVV) {
    client.ClientCreditCard.CVV = `${client.ClientCreditCard.CVV}`;
    client.ClientCreditCard.CardNumber = `${client.ClientCreditCard.CardNumber}`;
  }

  // TODO: handle remove card when the user had a credit card and updates without credit card
  try {
    const appConfig = await _getAppConfig(siteId);
    const isSavingANewCreditCard = client.ClientCreditCard && client.ClientCreditCard.CVV;
    const isDeletingCard = client.ClientCreditCard && !client.ClientCreditCard.CardNumber;
    let paymentsConfig: IMindBroClientPaymentsConfig = null;

    if (isSavingANewCreditCard) {
      paymentsConfig = await _createPaymentsConfig(appConfig, client);
    }

    console.log('updateClient 1: ', paymentsConfig, isSavingANewCreditCard, isDeletingCard, client);

    // Update the user on MindBody
    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };
    const updatedClient = {
      Client: client,
      // TODO: Set CrossRegionalUpdate from the Site configuration
      CrossRegionalUpdate: false,
    };
    const updatedClientResponse = await httpClient.post(`${baseUrl}/client/updateclient?ClientIds=${clientId}`, updatedClient, config);
    console.log('updatedClientResponse', updatedClientResponse)

    // If there was a credit card and it was saved properly,
    // now we have the client's MindBody id, so we can save his
    // paymentsConfig (token, CVV...) on Firebase under the
    // client's MindBody id
    if (isSavingANewCreditCard) {
      await DDBB
              .doc(`business/${appConfig.id}/clients/${updatedClientResponse.data.Client.UniqueId}`)
              .update({ payments_config: paymentsConfig });
    }

    if (isDeletingCard) {
      if (appConfig.payments.gateway.name === 'mercadopago') {
        const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
        const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
        const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;

        await httpClient.delete(`${appConfig.payments.gateway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
      }

      await DDBB
              .doc(`business/${appConfig.id}/clients/${updatedClientResponse.data.Client.UniqueId}`)
              .update({
                'payments_config.CVV': null,
                'payments_config.cardId': null,
                'payments_config.cardToken': null,
              });
    }

    res
      .status(updatedClientResponse.status)
      .json(updatedClientResponse.data.Client || updatedClientResponse.statusText);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function getClientContracts(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const clientId = req.params.id;

  console.log('getClientContracts', siteId, clientId)

  try {
    const clientContractsResponse = await DDBB.doc(`business/${siteId}/clients/${clientId}`).get();
    console.log('clientContractsResponse', clientContractsResponse.data());
    const clientContracts = clientContractsResponse.data() &&
                            Object
                              .values(clientContractsResponse.data().contracts)
                              .map((clientContract: any) => clientContract.Id);
    let clientContractsData: IMindBroClientContract[] = [];
    console.log('clientContracts', clientContracts);

    if (clientContracts) {
      for (const currentContractId of clientContracts) {
        const currentContractDataResponse = await DDBB.doc(`business/${siteId}/contracts/${currentContractId}/clients/${clientId}`).get();
        const currentContractData = currentContractDataResponse.data() as IMindBroClientContract;

        clientContractsData = [...clientContractsData, currentContractData];
      }
      console.log('clientContractsData', clientContractsData);
    }

    res.status(200).json(clientContractsData);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function _getPaymentsConfig(appConfig: IAppConfig, clientId: string): Promise<IMindBroClientPaymentsConfig | null> {
  console.log('_getPaymentsConfig', appConfig, clientId);
  const clientSnapshop = await DDBB.doc(`business/${appConfig.id}/clients/${clientId}`).get();
  const clientPaymentsConfig = clientSnapshop.data() && clientSnapshop.data().payments_config || null as IMindBroClientPaymentsConfig | null;
  console.log('clientPaymentsConfig', clientPaymentsConfig);

  return clientPaymentsConfig;
}

async function _createPaymentsConfig(appConfig: IAppConfig, client: IClient): Promise<IMindBroClientPaymentsConfig> | null {
  console.log('_createPaymentsConfig', appConfig, client, client.Id);

  const clientPaymentsConfig = await _getPaymentsConfig(appConfig, client.Id);

  // If the user comes with a CVV inside the credit card data, then
  // he is creating a new Credit Card (MindBody doesn't save CVV)
  // If the user already has a CrediCard, pass its data to update
  if (appConfig.payments.gateway.name === 'mercadopago') {
    return _createMercadopagoPaymentsConfig(appConfig, client, clientPaymentsConfig);
  }

  return null;
}

async function _createMercadopagoPaymentsConfig(
  appConfig: IAppConfig,
  client: IClient,
  clientPaymentsConfig: IMindBroClientPaymentsConfig,
  ): Promise<IMindBroClientPaymentsConfig> {
    console.log('_createMercadopagoPaymentsConfig', appConfig, client, clientPaymentsConfig)
  try {
    // 1 - Create a MercadoPago Credit Card token
    // 2 - Get the MercadoPago user's id or create
    //     a new MercadoPago user if he is a new one
    // 3 - Create a MercadoPago Credit Card (with
    //     the user's id and the Credit Card token)
    // 4 - If the client already had a saved credit card,
    //     delete it.
    const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
    const apiKey = appConfig.test ? appConfig.payments.gateway.apiKey.test : appConfig.payments.gateway.apiKey.production;
    const creditCardTokenRequest = {
      authenticate: true,
      card_number: client.ClientCreditCard.CardNumber.toString(),
      security_code: client.ClientCreditCard.CVV.toString(),
      expiration_month: client.ClientCreditCard.ExpMonth.toString(),
      expiration_year: client.ClientCreditCard.ExpYear.toString(),
      cardholder: {
        name: appConfig.test && appConfig.payments.gateway.name === 'mercadopago' ?
                appConfig.payments.gateway.test_payment_response :
                `${client.FirstName} ${client.LastName}`,
      }
    };
    console.log('apiKey', apiKey, creditCardTokenRequest)
    const creditCardToken = await httpClient.post(`${appConfig.payments.gateway.url}/card_tokens?public_key=${apiKey}`, creditCardTokenRequest);
    const creditCardTokenId = creditCardToken.data.id;
    console.log('creditCardTokenId', creditCardTokenId, creditCardToken)
    let clientId;

    // If the client already had a saved credit card,
    // then we get the Mercadopago id from his paymentsConfig
    // to save the card associated to him and delete his
    // old credit card
    // Else, we create a new client
    if (clientPaymentsConfig && clientPaymentsConfig.clientId) {
      clientId = clientPaymentsConfig.clientId;
    } else {
      const clientData = {
        email: client.Email,
        first_name: client.FirstName,
        last_name: client.LastName,
      }
      console.log('apiToken', apiToken, clientData)
      const clientResponse = await httpClient.post(`${appConfig.payments.gateway.url}/customers?access_token=${apiToken}`, clientData);
      clientId = clientResponse.data.id;
    }

    // Associate the creditCardTokenId to a user (required by Mercadopago)
    const card = {
      token: creditCardTokenId,
    }

    const newCardResponse = await httpClient.post(`${appConfig.payments.gateway.url}/customers/${clientId}/cards?access_token=${apiToken}`, card);
    const cardId = newCardResponse.data.id;

    // If the user already had a Credit Card, remove it after
    // saving the new one (we only allow one credit card per client)
    if (clientPaymentsConfig && clientPaymentsConfig.cardId) {
      await httpClient.delete(`${appConfig.payments.gateway.url}/customers/${clientPaymentsConfig.clientId}/cards/${clientPaymentsConfig.cardId}?access_token=${apiToken}`);
    }

    // Return paymentConfig to save it on Firebase
    // associated to the client's Mindbody id
    // We save the cardId in order to delete it
    // if a new Credit Card is Saved
    return {
      CVV: client.ClientCreditCard.CVV,
      clientId,
      cardToken: creditCardTokenId,
      cardId,
    };
  } catch (error) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (error.response) {
      const errorResponse = error.response.data;
      const errorMessage = `${errorResponse.error}: ${errorResponse.cause[0] && errorResponse.cause[0].description || errorResponse.message}`;

      console.log('_createMercadopagoPaymentsConfig ERROR1:', errorResponse, errorMessage, errorResponse.status, errorResponse.cause, Object.keys(errorResponse), errorResponse);
      throw new CustomError(errorMessage, errorResponse.status);
    } else {
      throw new CustomError(`${error.name}: ${error.message}`, 500);
    }
  }
}

async function _makePaymentWithMercadopago(contract: IContract, appConfig: IAppConfig, clientPaymentConfig: IMindBroClientPaymentsConfig, amount: number): Promise<IPayment> {
  console.log('_makePaymentWithMercadopago', contract, clientPaymentConfig, amount, appConfig);
  const paymentsApiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
  const paymentsApiKey = appConfig.test ? appConfig.payments.gateway.apiKey.test : appConfig.payments.gateway.apiKey.production;
  console.log('paymentsApiKey', paymentsApiKey, paymentsApiToken, `${appConfig.payments.gateway.url}/card_tokens?public_key=${paymentsApiKey}`, typeof clientPaymentConfig.cardId, clientPaymentConfig.cardId, typeof clientPaymentConfig.CVV, clientPaymentConfig.CVV)
  const cardTokenResponse = await httpClient.post(`${appConfig.payments.gateway.url}/card_tokens?public_key=${paymentsApiKey}`, { card_id: clientPaymentConfig.cardId, security_code: clientPaymentConfig.CVV })
  console.log('cardTokenResponse', cardTokenResponse)
  const cardToken = cardTokenResponse.data.id;
  // TODO: Cover the cases when the order is the first or last
  const mercadopagoOrder = {
    transaction_amount: amount || contract.RecurringPaymentAmountTotal,
    token: cardToken,
    description: contract.Description,
    installments: 1,
    payer: {
      id: clientPaymentConfig.clientId,
    }
  };
  console.log('mercadopagoOrder 1: ', mercadopagoOrder, paymentsApiToken)
  const paymentResponse = await httpClient.post(`${appConfig.payments.gateway.url}/payments?access_token=${paymentsApiToken}`, mercadopagoOrder);
  console.log('mercadopagoPaymentResponse 1', paymentResponse.data);

  return paymentResponse.data as IPayment;
}

// ORDERS
async function getOrders(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const limit = req.query.limit || 1000;
  const offset = req.query.offset || 0;
  const client = req.query.client;
  const contract = req.query.contract;
  const status = req.query.status;
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  console.log('getOrders', siteId, token, limit, offset, client, contract, typeof contract, status, dateFrom, dateTo);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);
    // Check Auth, if not it throws
    await _checkMindbodyAuth(appConfig.apiKey, siteId, token);

    let collectionRef = DDBB.collection(`business/${siteId}/orders`).orderBy('date_created_timestamp');

    if (client) {
      collectionRef = collectionRef.where('client_id', '==', client);
    }

    if (contract) {
      collectionRef = collectionRef.where('contract_id', '==', contract);
    }

    if (status) {
      collectionRef = collectionRef.where('payment_status', '==', status);
    }

    if (dateFrom) {
      const dateFromDate = new Date(dateFrom);

      collectionRef = collectionRef.where('date_created_timestamp', '>=', dateFromDate);
    }

    if (dateTo) {
      // Set end of the day
      const dateToDate = new Date(dateTo).setHours(23, 59, 59, 999);
      const dateToDateEndOfTheDay = new Date(dateToDate);

      collectionRef = collectionRef.where('date_created_timestamp', '<=', dateToDateEndOfTheDay);
    }

    const filteredPaymentsSnapshot = await collectionRef.limit(limit).offset(offset).get();
    const filteredPayments = filteredPaymentsSnapshot.docs.map(snapshot => snapshot.data());

    res.status(200).json(filteredPayments);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function refundPayment(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const orderId = req.params.id;
  console.log('getOrders', siteId, token, orderId);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);
    const apiToken = appConfig.test ? appConfig.payments.gateway.apiToken.test : appConfig.payments.gateway.apiToken.production;
    const orderResponse = await DDBB.doc(`business/${siteId}/orders/${orderId}`).get();
    const orderPaymentAttempts = orderResponse.data().payment_attempts;
    console.log('orderPaymentAttempts', orderPaymentAttempts, orderPaymentAttempts[orderPaymentAttempts.length - 1])
    const paymentId = orderPaymentAttempts[orderPaymentAttempts.length - 1].id;
    const refundPaymentResponse = await httpClient.post(`${appConfig.payments.gateway.url}/payments/${paymentId}/refunds?access_token=${apiToken}`);
    const refundedPayment = refundPaymentResponse.data;
    console.log('refundedPayment', refundedPayment);

    // Update order status on Firebase DDBB
    await DDBB.doc(`business/${siteId}/orders/${orderId}`).update({ payment_status: 'refunded' });

    res.status(200).json(refundedPayment);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function _saveOrderToDDBB(order: IOrder, contractId: string, clientId: string, appId: string) {
  console.log('_saveOrderToDDBB', order, contractId, clientId, appId)
  // Save the order into orders under the Id of the order (UUID)
  try {
    if (order.id) {
      await DDBB
              .doc(`business/${appId}/orders/${order.id}`)
              .update(order);
    } else {
      const orderToSave = {
        ...order,
        id: UUID(),
      }

      await DDBB
              .collection(`business/${appId}/orders`)
              .doc(`${orderToSave.id}`)
              .set(orderToSave);
    }
  } catch (error) {
    console.log('_saveOrderToDDBB catch', error)
    throw new CustomError(`${JSON.stringify(error)} - ${contractId} - ${clientId} - ${appId} - ${JSON.stringify(order)}`, 500);
  }
}

// CONTRACTS
async function addContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contract: IContract = req.body.contract;
  let instantPayment = req.body.instantPayment;
  const startDate = req.body.startDate;
  const seller = req.body.seller || null;

  console.log('addContract', siteId, token, clientId, instantPayment, startDate, seller, contract);

  try {
    const appConfig = await _getAppConfig(siteId);
    const contractCreationDate = new Date().toISOString();
    let clientContract: IMindBroClientContract = {
      status: 'payment_pending',
      date_created: contractCreationDate,
      date_created_timestamp: new Date(),
      id: contract.Id,
      start_date: startDate || null,
      // TODO: Check if the contract already starts minus the first autopay (ie: 1 year = 11 autopays)
      autopays_counter: contract.NumberOfAutopays,
      client_id: clientId,
      last_autopay: null,
    };
    const isTodayTheAutopayDay = _isTodayTheAutopayDay(contract, startDate && moment(startDate), null, appConfig);
    const skipPayment = contract.FirstAutopayFree;

    if (contract.ClientsChargedOn === 'SpecificDate') {
      const specificDate = moment(contract.ClientsChargedOnSpecificDate);
      // TEST FUNTIONALITY
      const today = appConfig.test && appConfig.today_test_mock ?
                      moment(appConfig.today_test_mock).startOf('day') :
                      moment().startOf('day');

      if (specificDate.isBefore(today)) {
        instantPayment = true;
      }
    }

    if (isTodayTheAutopayDay || instantPayment) {
      const skipDeliver = !isTodayTheAutopayDay;
      const throwIfPaymentFails = true;
      // Order the contract
      const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver, throwIfPaymentFails, seller);

      if (contractOrder.payment_status === 'approved') {
        clientContract = {
          ...clientContract,
          autopays_counter: contract.NumberOfAutopays - 1,
          last_autopay: isTodayTheAutopayDay ?
                          appConfig.test && appConfig.today_test_mock?
                            appConfig.today_test_mock :
                            moment().toISOString() :
                          // Because the first payment is made in advance (instantPayment)
                          // we set the last_payment to the first autopay date to calculate
                          // the next autopay dates from it.
                          _getFirstAutopayDate(contract, appConfig).toISOString(),
          status: contractOrder.delivered ? 'active' : 'activation_pending',
        };
      }
    }

    // Save the IClient id into the IContract
    await DDBB
            .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientId}`)
            .set(clientContract);

    const contractData = {
      Id: contract.Id,
      date_created: clientContract.date_created,
      status: 'active',
    }

    // Save the IContract into the IClient
    await DDBB
            .doc(`business/${appConfig.id}/clients/${clientId}`)
            .update({[`contracts.${contract.Id}`]: contractData});

    res.status(200).json(clientContract);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function getContracts(req: express.Request, res: express.Response) {
  // TODO: IMPORTANT: We have to return the contracts without auth because the
  // iframe IContracts select is not secured
  // TODO: Replace this mock with the call to MindBody
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  console.log('getContracts', siteId, token);

  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    // const appConfig = await _getAppConfig(siteId);
    const contracts = await _getContracts(siteId, token);

    res.status(200).json(contracts);
  } catch(error) {
    _handleServerErrors(error, res);
  }
};

async function _getContracts(siteId: string, token?: string): Promise<IContract[]> {
  if (token) {
    // Call directly to Mindbody to get the IContracts
    return Promise.resolve(contractsMock);
  } else {
    // Get the token and then get the contract
    const clientEnviromentVariables = await _getClientEnviromentVariables(siteId);
    console.log('_getContracts clientEnviromentVariables', token, clientEnviromentVariables);
    const tokenResponse = await _login(siteId, clientEnviromentVariables.username, clientEnviromentVariables.password);
    const newToken = tokenResponse.data;
    console.log(' _getContracts token', newToken);

    return Promise.resolve(contractsMock);
  }
}

async function updateContract(req: express.Request, res: express.Response) {
  if (req.method === 'OPTIONS') { res.status(200).json() };

  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const clientId = req.params.id;
  const contractId = req.params.contractId;
  let update = req.body;

  console.log('updateContract', siteId, token);

  if (!token) { res.status(401).json({message: 'Unauthorized'}); }
  if (!siteId) { res.status(422).json({message: 'SiteId header is missing'}); }

  try {
    const appConfig = await _getAppConfig(siteId);

    if (update && update.status) {
      if (update.status === 'active') {
        const contractsCatalogue: IContract[] = await _getContracts(siteId);
        const contract: IContract = contractsCatalogue.find(contractItem => contractItem.Id === contractId);
        const clientContractResponse = await DDBB
                                                      .doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`)
                                                      .get();
        const clientContract = clientContractResponse.data() as IMindBroClientContract;
        console.log('updateContract clientContract', clientContract)

        if (clientContract.status === 'paused') {
          // Default to instantPayment when resuming a contract
          // TEST FUNCTIONALITY
          const today = appConfig.test && appConfig.today_test_mock ?
                          moment(appConfig.today_test_mock) :
                          moment();
          const lastAutopay = moment(clientContract.last_autopay);
          const nextAutopay = _getNextAutopayDate(contract, lastAutopay, appConfig);
          console.log('updateContract nextAutopay', nextAutopay)

          // Process a new IOrder only if the previous (the one that was active when
          // the IContract was paused) has expired.
          // Else (if the previous IOrder is active), mark the IContract.start_date
          // to the next first autopay date skipping today (just in case resume the
          // IContract is done the same day that it should be charged).
          if (today.isSameOrAfter(nextAutopay, 'day')) {
            const skipPayment = false;
            const skipDeliver = !_isTodayTheAutopayDay(contract, null, null, appConfig);
            const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver);
            console.log('updateContract contractOrder', contractOrder)
            await _updateContractAfterProcessOrder(appConfig, contractOrder, clientContract, contract);
            await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
          } else {
            update = {
              ...update,
              start_date: _getFirstAutopayDate(contract, appConfig, true).toISOString(),
            }
            await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
            await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
          }
        } else if (clientContract.status === 'paused_no_payment') {
          // If the IMindBroClientContract.status === 'paused_no_payment'
          // Then we are trying to reactivate the IMindBroClientContract
          // Then we are going to charge all the debt autopays
          // and deliver the contractItems for the current period
          const skipPayment = false;
          const skipDeliver = false;
          const debtAutopays = await _getDebtAutopays(contract, clientContract, appConfig);
          const debtAmount = debtAutopays.reduce(result => result + contract.RecurringPaymentAmountTotal, 0);
          const contractOrder = await _processOneContractOrder(contract, clientId, clientContract, appConfig, token, null, skipPayment, skipDeliver, null, null, debtAmount);
          console.log('updateContract contractOrder', contractOrder)
          await _updateContractAfterProcessOrder(appConfig, contractOrder, clientContract, contract);
          await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
        } else {
          await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
          await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
        }
      } else {
        await DDBB.doc(`business/${siteId}/clients/${clientId}`).update({[`contracts.${contractId}.status`]: update.status});
        await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
      }
    } else {
      await DDBB.doc(`business/${siteId}/contracts/${contractId}/clients/${clientId}`).update(update);
    }

    res.status(200).json(`Contract ${contractId} updated for client ${clientId}`);
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function _getDebtAutopays(contract: IContract, clientContract: IMindBroClientContract, appConfig: IAppConfig) {
  const order = await _findOrderByStatus(appConfig, contract.Id, clientContract.client_id, 'canceled');
  let lastAutopayDate = moment(order.date_created);
  let debtAutopays: moment.Moment[] = [lastAutopayDate];
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');


  while (_getNextAutopayDate(contract, lastAutopayDate, appConfig).isSameOrBefore(today, 'day')) {
    lastAutopayDate = _getNextAutopayDate(contract, lastAutopayDate, appConfig);
    debtAutopays = [...debtAutopays, lastAutopayDate];
  }

  console.log('debtAutopays: ', debtAutopays);

  return debtAutopays;
}

// tslint:disable-next-line
/* async function processAllAppsAutopays(req: express.Request, res: express.Response) {
  // TODO: Fire this function for every app
  const apps = await DDBB.collection(`business`).get();
  const appsArray = apps.docs.map(snapshot => snapshot.data());
  console.log('processAllAppsAutopays appsArray', appsArray);

  for (let i = 0; i < appsArray.length; i++) {
    let appConfig;
    try {
      const siteId = appsArray[i].config.id;
      appConfig = await _getAppConfig(siteId);
      console.log('_processOneAppAutopays', appConfig);

      await _processOneAppAutopays(appConfig);
    } catch (error) {
      console.log('processAllAppsAutopays error', error);
      const appAutoPaysProcessingError = {
        error: error,
        date_created: new Date(),
      };
      // Save the error to the DDBB
      const appAutoPaysProcessingErrorResponse = await DDBB.collection(`business/${appConfig.id}/autopay_errors`).add(appAutoPaysProcessingError);
      console.log('appAutoPaysProcessingErrorResponse', appAutoPaysProcessingErrorResponse)
      // TODO: Email me
    }
  }

  res.status(200).json('Ole');
} */

// BILLING
async function _processOneAppAutopays(appConfig: IAppConfig) {
  // TODO: Replace this test Auth call with the admin client account data (username and password)
  // created for us to manage autopays
  const url = `${baseUrl}/usertoken/issue`;
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': appConfig.id,
    }
  };
  const tokenRequest = {
    Username: 'Siteowner',
    Password: 'apitest1234',
  };

  const tokenResponse = await httpClient.post(url, tokenRequest, config);
  const token = tokenResponse.data.AccessToken;
  // TODO: Replace this with the call to Mindbody
  const appContracts = contractsMock;

  // Process All the app contracts
  for (const contract of appContracts) {
    console.log('contract', contract)

    try {
      await _processAllContractOrders(contract, appConfig, token);
    } catch (error) {
      console.log('_processOneAppAutopays error', error);
      throw new CustomError(`_processOneAppAutopays error: ${JSON.stringify(error)} - ${error}`, 500);
    }
  }

  // Retry all failed orders
  try {
    await _processFailedContractOrders(contractsMock, appConfig, token);
  } catch (error) {
    console.log('_processFailedContractOrders', error);
  }
}

async function _processAllContractOrders(contract: IContract, appConfig: IAppConfig, token: string) {
  // TODO: When IContract.ClientsChargedOn is related to the client ('OnSaleDate' || 'FirstOrFifteenthOfTheMonth' ||
  // 'FirstOrSixteenthOfTheMonth' || 'FifteenthOrEndOfTheMonth') we'll need to check _isTodayTheAutopayDay
  // for every IClient when the IContract is purchased
  // NOW: waiting for Mindbody response about if ClientsChargedOn: the "ClientsChargedOn" states the date of the first charge,
  // then the next charge will follow the AutopaySchedule specifications (FrequencyType, FrequencyValue, and FrequencyTimeUnit)
  // calculated from this date of the first charge. Is this correct?

  // TODO: Cover IContract.AutopayTriggerType === 'PricingOptionRunsOutOrExpires'
  // TODO: Cover IContract.ActionUponCompletionOfAutopays

  // Check _isTodayTheAutopayDay for every IClient when the have specific autopay date
  /* const checkAutopayDayForEveryClient = contract.ClientsChargedOn === 'OnSaleDate' ||
                                        contract.ClientsChargedOn === 'FirstOrFifteenthOfTheMonth' ||
                                        contract.ClientsChargedOn === 'FirstOrSixteenthOfTheMonth' ||
                                        contract.ClientsChargedOn === 'FifteenthOrEndOfTheMonth';

  if (!checkAutopayDayForEveryClient && !_isTodayTheAutopayDay(contract, null, null, appConfig)) {
    return;
  } */

  console.log('_processAllContractOrders', contract, appConfig);
  const contractClientContractsResponse = await DDBB.collection(`business/${appConfig.id}/contracts/${contract.Id}/clients`).get();
  const contractActiveAndPendingClientContracts = contractClientContractsResponse
                                                    .docs
                                                    .map(snapshot => snapshot.data())
                                                    .filter(clientContract => clientContract.status === 'active' ||
                                                                              clientContract.status === 'payment_pending' ||
                                                                              clientContract.status === 'activation_pending') as IMindBroClientContract[];
  console.log('contractActiveClients', contractActiveAndPendingClientContracts);

  for (let i = 0; i < contractActiveAndPendingClientContracts.length; i++) {
    const currentClientContract: IMindBroClientContract = contractActiveAndPendingClientContracts[i];
    const skipPayment = currentClientContract.status === 'activation_pending';

    console.log('CURRENT CLIENT: ', i, currentClientContract);
    // When the IContract.status is 'activation_pending' the payment was done in advance so
    // we don't need to calculate the next autopay from the 'last_autopay', we just need to
    // check if today is === the firstAutopayDate to set the IContract.status to
    // deliver the IContract items and set its status to 'active'
    const currentClientContractDateFrom = currentClientContract.status !== 'activation_pending' && currentClientContract.last_autopay ?
                                            moment(currentClientContract.last_autopay) :
                                            null;
    const startDate = currentClientContract.start_date && moment(new Date(currentClientContract.start_date));
    console.log('startDate', startDate);

    if (!_isTodayTheAutopayDay(contract, startDate, currentClientContractDateFrom, appConfig)) {
      continue;
    }

    // Order the contract
    const contractOrder: IOrder = await _processOneContractOrder(contract, currentClientContract.client_id, currentClientContract, appConfig, token, null, skipPayment);
    console.log('_processAllContractOrders CONTRACT ORDER', i, contractOrder)

    await _updateContractAfterProcessOrder(appConfig, contractOrder, currentClientContract, contract);
  }
}

async function _processOneContractOrder(
  contract: IContract,
  clientId: string,
  clientContract: IMindBroClientContract,
  appConfig: IAppConfig,
  token: string,
  order?:IOrder,
  skipPayment?: boolean,
  skipDeliver?: boolean,
  throwIfPaymentFails?: boolean,
  seller?: IUser,
  orderAmount?: number,
): Promise<IOrder> {
  /** EXPLANATION
   * This function varies its output depending on the method that calls it:
   * - addContract:
   *   If the payment_status === 'approved', it creates a new IOrder and the IContract,
   *   else throws an error
   * - _processAllContracts:
   *   If the payment_status === 'approved' && !skipPayment, creates a new IOrder,
   *   If the payment_status === 'approved' && skipPayment, updates an IOrder
   *   If error && (IOrder.id || clientContract.status === 'activation_pending'), updates an IOrder
   *        with the error on payment_attemps
   *   else creates a new IOrder with the error on payment_attemps,
   * - _processFailedContractOrders:
   *   Allways updates the IOrder (payment_status === 'approved', payment_status !== 'approved' and error).
   *   If the IOrder.payment_attemps.length > maxRetries, IOrder.payment_status = 'canceled'
   */

  console.log('_processOneContractOrder', clientId, token, order, skipPayment, skipDeliver, throwIfPaymentFails, seller, contract, appConfig);
  // TODO: add IContract.FirstAutopayFree and IContract.LastAutopayFree
  const contractItems = contract.ContractItems.map(contractItem => {
    const formattedItem = {
      Item: {
        Type: contractItem.Type,
        Metadata: {
          Id: contractItem.Id,
        }
      },
      // TODO: Add discount management
      DiscountAmount: 0,
      Quantity: contractItem.Quantity,
    }

    return formattedItem;
  });
  const MBHeadersConfig = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': appConfig.id,
    'Authorization': token,
    }
  };
  const newOrder: IOrder = {
    id: null,
    date_created: appConfig.test && appConfig.today_test_mock ?
                    moment(appConfig.today_test_mock).toISOString() :
                    moment().toISOString(),
    date_created_timestamp: new Date(),
    client_id: clientId,
    contract_id: contract.Id,
    delivered: false,
    delivery_attempts: [],
    shopping_cart: null,
    payment_status: skipPayment ? 'approved' : null,
    payment_status_detail: null,
    payment_attempts: [],
    seller: seller || null,
  };
  const maxRetries = appConfig.payments.number_of_retries;
  // Don't retry canceled IOrders
  let orderToSave = order && order.payment_status !== 'canceled' ?
                      order :
                      newOrder;

  try {
    // If the IContract has not been paid beforehand ('activation_pending')
    // make the payment and then purchase the products on Mindbody (deliver them)
    // If the IContract has been paid beforehand ('activation_pending')
    // just purchase the products on Mindbody
    if (!skipPayment) {
      const paidOrder = await _payOrder(contract, clientId, appConfig, orderAmount);
      orderToSave = {
        ...orderToSave,
        payment_status: paidOrder.payment_status,
        payment_status_detail: paidOrder.payment_status_detail,
        payment_attempts: [...orderToSave.payment_attempts, ...paidOrder.payment_attempts ],
      }
      console.log('_processOneContractOrder paidOrder', paidOrder, orderToSave)
    }

    // Only deliver approved IOrders
    if (!skipDeliver && orderToSave.payment_status === 'approved') {
      const mindBodyCartOrder = {
        ClientId: clientId,
        Test: false, // appConfig.test,
        Items: contractItems,
        Payments: [
          {
            Type: 'Cash',
            Metadata: {
              Amount: contract.FirstPaymentAmountTotal,
            }
          }
        ],
      };
      const cartResponse = await httpClient.post(`${baseUrl}/sale/checkoutshoppingcart`, mindBodyCartOrder, MBHeadersConfig);

      orderToSave = {
        ...orderToSave,
        delivered: true,
        delivery_attempts: [cartResponse.data],
        // TODO: Do we need to save the shopping_cart???
        shopping_cart: cartResponse.data.ShoppingCart,
      }
      console.log('_processOneContractOrder cartResponse', orderToSave)
    }

    if (throwIfPaymentFails && orderToSave.payment_status !== 'approved') {
      console.log('_processOneContractOrder throwIfPaymentFails CustomError', throwIfPaymentFails, typeof throwIfPaymentFails, orderToSave)
      throw new CustomError(`Mercadopago ${ orderToSave.payment_status ? `: ${mercadoPagoMessages[orderToSave.payment_status_detail]} ` : ''}`, 400);
    } else {
      console.log('_processOneContractOrder ELSE', clientContract, orderToSave)
      // skipPayment (ie: 'activation_pending') IContracts have being already paid, so the autopays_counter
      // and last_autopay have been already updated but we need to update the related IOrder delivered
      // status and add the shopping_cart
      if (clientContract.status === 'activation_pending') {
        const activationPendingOrder = await _findOrderByStatus(appConfig, contract.Id, clientId, 'approved');

        orderToSave = {
          ...activationPendingOrder,
          delivered: orderToSave.delivered,
          delivery_attempts: [...activationPendingOrder.delivery_attempts, ...orderToSave.delivery_attempts],
          shopping_cart: orderToSave.shopping_cart,
        }

        console.log('_processOneContractOrder activation_pending', orderToSave)
      }

      if (orderToSave.payment_status !== 'approved' && orderToSave.payment_attempts.length >= maxRetries) {
        orderToSave = {
          ...orderToSave,
          payment_status: 'canceled',
        }
      }

      console.log('_processOneContractOrder PRE _saveOrderToDDBB', _saveOrderToDDBB)
      await _saveOrderToDDBB(orderToSave, contract.Id, clientId, appConfig.id);
    }

    console.log('_processOneContractOrder order:', orderToSave);

    return orderToSave;
  } catch (error) {
    console.log('_processOneContractOrder ERROR 0:', throwIfPaymentFails, error);
    if (throwIfPaymentFails) {
      throw new CustomError(error.message || JSON.stringify(error), error.code || 500);
    } else {
      // If we are processing an IOrder that already existed, that has an id (ie: failed order)
      // update it with the error
      // If we are processing an order for a IContract with status 'activation_pending',
      // find the related IOrder and update it with the error
      // If it's the first payment attempt, save a new IOrder with error
      if (orderToSave.id) {
        orderToSave = {
          ...orderToSave,
          ...!skipPayment && { payment_attempts: [ orderToSave.payment_attempts, error ] },
          ...!skipDeliver && { delivery_attempts: [...orderToSave.delivery_attempts, error] },
        }
      } else if (clientContract.status === 'activation_pending') {
        const activationPendingOrder = await _findOrderByStatus(appConfig, contract.Id, clientId, 'approved');

        orderToSave = {
          ...activationPendingOrder,
          ...!skipPayment && { payment_attempts: [ activationPendingOrder.payment_attempts, error ] },
          ...!skipDeliver && { delivery_attempts: [...activationPendingOrder.delivery_attempts, error] },
        }
      } else {
        orderToSave = {
          id: null,
          date_created: appConfig.test && appConfig.today_test_mock ?
                          moment(appConfig.today_test_mock).toISOString() :
                          moment().toISOString(),
          date_created_timestamp: new Date(),
          client_id: clientId,
          contract_id: contract.Id,
          shopping_cart: null,
          delivered: false,
          delivery_attempts: skipDeliver ? null : [{ error: JSON.stringify(error.response || error.message || error) }],
          payment_status: 'error',
          payment_status_detail: JSON.stringify(error.response || error.message || error),
          payment_attempts: skipPayment ? null : [{ error: JSON.stringify(error.response || error.message || error) }],
          seller: null,
        }
      }
      console.log('_processOneContractOrder ERROR', error.message, orderToSave);
      if (orderToSave.payment_status !== 'approved' && orderToSave.payment_attempts.length >= maxRetries) {
        orderToSave = {
          ...orderToSave,
          payment_status: 'canceled',
        }
      }

      await _saveOrderToDDBB(orderToSave, contract.Id, clientId, appConfig.id);

      return orderToSave;
    }
  }
}

async function _processFailedContractOrders(contractsCatalog: IContract[], appConfig: IAppConfig, token: string) {
  console.log('_processFailedContractOrders appConfig', appConfig)
  // TODO: Limit the orders to the last month?
  const appOrders = await DDBB.collection(`business/${appConfig.id}/orders`).get();
  const appOrdersArray = appOrders.docs.map(snapshot => snapshot.data()) as IOrder[];
  console.log('appOrdersArray', appOrdersArray)
  // Canceled orders are the ones that have finished the max number
  // of retries (appConfig.payments.number_of_retries;)
  const failedOrders: IOrder[] = appOrdersArray.filter(order => order.payment_status !== 'approved' && order.payment_status !== 'canceled');
  console.log('failedOrders', failedOrders);

  for (let i = 0; i < failedOrders.length; i++) {
    const failedOrder: IOrder = failedOrders[i];
    const maxRetries = appConfig.payments.number_of_retries;
    const actualRetries = failedOrder.payment_attempts.length;
    console.log('failedOrder', failedOrder, maxRetries, actualRetries);
    const failedContract: IContract = contractsCatalog.find(contract => contract.Id === failedOrder.contract_id);
    const clientContractResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${failedOrder.contract_id}/clients/${failedOrder.client_id}`).get();
    const clientContract = clientContractResponse.data() as IMindBroClientContract;
    console.log('failedContract', failedContract, clientContract);
    const skipPayment = clientContract.status === 'activation_pending';
    const newContractOrder = await _processOneContractOrder(failedContract, failedOrder.client_id, clientContract, appConfig, token, failedOrder, skipPayment);
    console.log('CONTRACT ORDER', i, newContractOrder, failedOrder.id, failedOrder);

    await _updateContractAfterProcessOrder(appConfig, newContractOrder, clientContract, failedContract);
  }
}

async function _updateContractAfterProcessOrder(appConfig: IAppConfig, contractOrder: IOrder, clientContract: IMindBroClientContract, contract: IContract) {
  console.log('_updateContractAfterProcessOrder', contractOrder, clientContract, contract)
  const skipPayment = clientContract.status === 'activation_pending';
  let clientContractUpdate: {[key: string]: any};

  // active, payment_pending, activation_pending, paused, paused_no_payment, canceled, terminated

  if (contractOrder.payment_status === 'approved') {
    // If IContract status is 'payment_pending' or 'activation_pending'
    // we have to set it to 'active' once it is payed and delivered
    if (clientContract.status === 'payment_pending' ||
        clientContract.status === 'paused' ||
        clientContract.status === 'paused_no_payment') {
      clientContractUpdate = {
        ...clientContractUpdate,
        status: contractOrder.delivered ? 'active' : 'activation_pending',
      };
    }

    if (clientContract.status === 'activation_pending' &&
        contractOrder.delivered) {
      clientContractUpdate = {
        ...clientContractUpdate,
        status: 'active',
      };
    }

    if (!skipPayment) {
      let lastAutopay;

      if (clientContract.status === 'activation_pending') {
        // If IOrder.payment_status === 'approved' && IOrder.delivered === false
        // then _isTodayTheAutopayDay was false (ie: it was an instantPayment)
        // and the clientContract.status === 'activation_pending'
        // So we know the last_autopay will have to be _getFirstAutopayDate
        // Because the first payment was made in advance (instantPayment)
        // we set the last_payment to the next autopay date (_getFirstAutopayDate)
        // to calculate the next autopay dates from it. If not we'd charge it double,
        // when the IContract is purchased, and then when arrives the first IContract.clientsChargeOn
        lastAutopay = _getFirstAutopayDate(contract, appConfig).toISOString();
      } else if (clientContract.status === 'paused_no_payment') {
        // If the clientContract.status === 'paused_no_payment', then
        // we are resuming (reactivating) it after the payment of the debt, then
        // we have to set the last_autopay to the last autopay date that would have been
        // charged if the contract would have been active. (last_autopay is the date used
        // to check _isTodayTheAutopayDate...)
        lastAutopay = _getLastAutopayDate(contract, null, appConfig).toISOString();
      } else {
        lastAutopay = appConfig.test && appConfig.today_test_mock?
                        appConfig.today_test_mock :
                        moment().toISOString();
      }

      clientContractUpdate = {
        ...clientContractUpdate,

        last_autopay: lastAutopay,
      };

      if (contract.AutopaySchedule.FrequencyType === 'SetNumberOfAutopays') {
        let autopaysCounter = clientContract.autopays_counter - 1;

        // If the clientContract.status === 'paused_no_payment',
        // the we need to calculate the debt autopays in order to subtract them
        // from the autopays_counter when the contract is resumed
        if (clientContract.status === 'paused_no_payment') {
          const debtAutopays = await _getDebtAutopays(contract, clientContract, appConfig);
          autopaysCounter = clientContract.autopays_counter - debtAutopays.length;
        }

        clientContractUpdate = {
          ...clientContractUpdate,
          autopays_counter:  autopaysCounter,
        }

        if (clientContractUpdate.autopays_counter === 0) {
          if (contract.ActionUponCompletionOfAutopays === 'ContractAutomaticallyRenews') {
            clientContractUpdate.autopays_counter = contract.NumberOfAutopays;
          } else {
            clientContractUpdate.status = 'terminated';
          }
        }
      }
    }
  } else if (contractOrder.payment_status === 'canceled') {
    // Pause the IContract when the payment retries exceed the appConfig.payments.number_of_retries
    clientContractUpdate = { ...clientContractUpdate, status: 'paused_no_payment' };
  }

  if (clientContractUpdate) {
    console.log('clientContractUpdate', clientContractUpdate);
    await DDBB
            .doc(`business/${appConfig.id}/contracts/${contract.Id}/clients/${clientContract.client_id}`)
            .update(clientContractUpdate);
    if (clientContractUpdate.status) {
      // Update the client contract status
      await DDBB
              .doc(`business/${appConfig.id}/clients/${clientContract.client_id}`)
              .update({[`contracts.${contract.Id}.status`]: clientContractUpdate.status});
    }
  }
}

async function _findOrderByStatus(appConfig: IAppConfig, contractId: string, clientId: string, status: string) {
  const clientContractResponse = await DDBB.doc(`business/${appConfig.id}/contracts/${contractId}/clients/${clientId}`).get();
  const clientContract = clientContractResponse.data() as IMindBroClientContract;
  const ordersRef = await DDBB
                            .collection(`business/${appConfig.id}/orders`)
                            .orderBy('date_created_timestamp', 'desc')
                            .where('date_created_timestamp', '>=', clientContract.date_created_timestamp)
                            .where('contract_id', '==', contractId)
                            .where('client_id', '==', clientId)
                            .where('payment_status', '==', status)
                            .where('delivered', '==', false);

  const ordersSnapshot = await ordersRef.get();
  const orderToUpdate = ordersSnapshot.docs.map(snapshot => snapshot.data())[0] as IOrder;
  console.log('orderToUpdate', orderToUpdate, ordersSnapshot.docs.map(snapshot => snapshot.data()));
  return orderToUpdate;
}

async function _payOrder(contract: IContract, clientId: string, appConfig: IAppConfig, amount: number) {
  const clientPaymentConfig = await _getPaymentsConfig(appConfig, clientId);
  console.log('_payOrder', _payOrder, clientPaymentConfig)

  if (clientPaymentConfig && clientPaymentConfig.cardId) {
    if (appConfig.payments.gateway.name === 'mercadopago') {
      const paymentResponse: IPayment = await _makePaymentWithMercadopago(contract, appConfig, clientPaymentConfig, amount);

      const order = {
        payment_status: paymentResponse.status,
        payment_status_detail: paymentResponse.status_detail,
        payment_attempts: [paymentResponse],
      }

      return order;
    } else {
      throw new CustomError('This site does not have a Gateway associated', 400);
    }
  } else {
    throw new CustomError('This client does not have a Credit Card associated', 400);
  }
}

export function _isTodayTheAutopayDay(contract: IContract, startDate?: moment.Moment, dateFrom?: moment.Moment, appConfig?: IAppConfig): boolean {
  // console.log('_isTodayTheAutopayDay', contract, startDate, dateFrom, appConfig, todayMock)
  // TEST FUNCTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock) :
                  moment();

  if (startDate && startDate.isSameOrAfter(today, 'day')) {
    return today.isSame(startDate, 'day');
  }

  const nextAutopay = _getNextAutopayDate(contract, dateFrom, appConfig);
  console.log('nextAutopay', today, nextAutopay)

  return today.isSame(nextAutopay, 'day');
}

// We use the IMindBroClientContract.last_autopay (dateFrom) to calculate the next one
function _getNextAutopayDate(contract: IContract, dateFrom?: moment.Moment, appConfig?: IAppConfig) {
  let frequencyTimeUnit;
  let frequencyValue;

  if (contract.AutopaySchedule.FrequencyType === 'MonthToMonth') {
    frequencyTimeUnit = 'months';
    frequencyValue = 1;
  } else {
    frequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                           'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                             'months' :
                             'years';
    frequencyValue = contract.AutopaySchedule.FrequencyValue;
  }

  const nextAutopayDate = dateFrom ?
                            dateFrom
                              .startOf('day')
                              .clone()
                              .add(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit) :
                            _getFirstAutopayDate(contract, appConfig);

  return nextAutopayDate;
}

function _getLastAutopayDate(contract: IContract, dateFrom?: moment.Moment, appConfig?: IAppConfig) {
  let frequencyTimeUnit;
  let frequencyValue;
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');

  const nextAutopayDate = _getNextAutopayDate(contract, null, appConfig);
  console.log('_getLastAutopayDate nextAutopayDate', nextAutopayDate, today)

  if (contract.AutopaySchedule.FrequencyType === 'MonthToMonth') {
    frequencyTimeUnit = 'months';
    frequencyValue = 1;
  } else {
    frequencyTimeUnit = contract.AutopaySchedule.FrequencyTimeUnit === 'Weekly' ?
                           'weeks' : contract.AutopaySchedule.FrequencyTimeUnit === 'Monthly' ?
                             'months' :
                             'years';
    frequencyValue = contract.AutopaySchedule.FrequencyValue;
  }

  if (dateFrom) {
    return dateFrom
            .startOf('day')
            .clone()
            .subtract(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit);
  }

  if (today.isSame(nextAutopayDate, 'day')) {
    return today;
  }

  const lastAutopayDate = nextAutopayDate.subtract(frequencyValue, <moment.unitOfTime.DurationConstructor>frequencyTimeUnit);

  console.log('lastAutopayDate', lastAutopayDate);
  if (lastAutopayDate.isValid()) {
    return lastAutopayDate;
  } else {
    throw new CustomError('Invalid Date', 500);
  }
}

function _getFirstAutopayDate (contract: IContract, appConfig?: IAppConfig, skipToday?: boolean): moment.Moment {
  let firstAutopayDate;
  // TEST FUNTIONALITY
  const today = appConfig.test && appConfig.today_test_mock ?
                  moment(appConfig.today_test_mock).startOf('day') :
                  moment().startOf('day');

  if (skipToday) { today.add(1, 'days') }

  const first = today.date() === 1 ? today : today.clone().add(1, 'months').startOf('month');
  const last = today.date() === today.clone().endOf('month').date() ? today : today.clone().endOf('month');
  const fifteen = today.date() <= 15 ? today.clone().date(15) : today.clone().add(1, 'months').date(15);
  const sixteen = today.date() <= 16 ? today.clone().date(16) : today.clone().add(1, 'months').date(16);

  console.log('_getFirstAutopayDate', contract.ClientsChargedOn, skipToday, appConfig.today_test_mock, today, first, last, fifteen, sixteen);

  switch (contract.ClientsChargedOn) {
    case 'FirstOfTheMonth':
      firstAutopayDate = first;
      break;

    case 'FifteenthOfTheMonth':
      firstAutopayDate = fifteen;
      break;

    case 'LastDayOfTheMonth':
      firstAutopayDate = last;
      break;

    // TODO: Cover this case
    case 'FirstOrFifteenthOfTheMonth':
      firstAutopayDate = today.diff(first, 'days') < today.diff(fifteen, 'days') ?
                          first :
                          fifteen;
      break;

    case 'FirstOrSixteenthOfTheMonth':
      firstAutopayDate = today.diff(first, 'days') < today.diff(sixteen, 'days') ?
                          first :
                          sixteen;
      break;

    case 'FifteenthOrEndOfTheMonth':
      firstAutopayDate = today.diff(fifteen, 'days') < today.diff(last, 'days') ?
                          fifteen :
                          last;
      break;

    case 'SpecificDate':
      firstAutopayDate = moment(contract.ClientsChargedOnSpecificDate);
      break;

    case 'OnSaleDate':
      firstAutopayDate = today;
      break;

    default:
      firstAutopayDate = today;
  }

  console.log('firstAutopayDate', firstAutopayDate, firstAutopayDate.isValid())
  if (firstAutopayDate.isValid()) {
    return firstAutopayDate;
  } else {
    throw new CustomError('Invalid Date', 500);
  }
}

// IFRAME
async function validateLogin(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const username = req.body.username;
  const password = req.body.password;
  console.log('validateLogin', siteId, token, username, password);

  const message = `<?xml version="1.0" encoding="utf-8"?>
                    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                      <soap:Body>
                        <ValidateLogin xmlns="http://clients.mindbodyonline.com/api/0_5_1">
                          <Request>
                            <Username>${username}</Username>
                            <Password>${password}</Password>
                          </Request>
                        </ValidateLogin>
                      </soap:Body>
                    </soap:Envelope>`;

  const config = {
    headers: {
    'API-key': appConfig.apiKey,
    'SiteId': siteId,
    'Content-Type': 'text/xml;charset=UTF-8',
    'SOAPAction': 'http://clients.mindbodyonline.com/api/0_5_1/ValidateLogin',
    }
  };

  try {
    const validateLoginSoap = await httpClient.post('https://api.mindbodyonline.com/0_5_1/ClientService.asmx', message, config);
    const validateLoginJSON = parser.parse(validateLoginSoap.data);
    const validateLoginResponse = validateLoginJSON &&
                                    validateLoginJSON['soap:Envelope']['soap:Body'].ValidateLoginResponse.ValidateLoginResult;
    console.log('validateLoginResponse', validateLoginResponse, validateLoginJSON['soap:Envelope']['soap:Body'].ValidateLoginResponse);

    let finalResponse = {
      status: validateLoginResponse.Status,
      code: validateLoginResponse.ErrorCode,
      message: validateLoginResponse.Message,
      client: validateLoginResponse.Client,
    }

    if (validateLoginResponse.Client) {
      const clientSearchResults = await _getAllClients(appConfig.apiKey, siteId, token, validateLoginResponse.Client.ID);

      finalResponse = {
        ...finalResponse,
        client: clientSearchResults.data.Clients[0],
      };
    }

    console.log('validateLogin finalResponse', finalResponse)

    res.status(finalResponse.code).json(finalResponse);
  } catch (error) {
    console.log('validateLogin error', error);
    _handleServerErrors(error, res);
  }
}

async function sendResetPasswordEmail(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const UserEmail = req.body.UserEmail;
  let UserFirstName = req.body.UserFirstName;
  let UserLastName = req.body.UserLastName;
  console.log('sendResetPasswordEmail', UserEmail, UserFirstName, UserLastName);

  try {
    if (!UserFirstName || !UserLastName) {
      const clientResponse = await _getAllClients(appConfig.apiKey, siteId, token, UserEmail);
      console.log('sendResetPasswordEmail clientResponse', clientResponse.data)
      const client = clientResponse.data.Clients[0];

      if (!client) {
        res.status(404).json('No user found with this email');
        return;
      }

      UserFirstName = UserFirstName || client.FirstName;
      UserLastName = UserLastName || client.LastName;
    }

    const config = {
      headers: {
      'Api-Key': appConfig.apiKey,
      'SiteId': siteId,
      'Authorization': token,
      }
    };

    const data = {
      UserEmail,
      UserFirstName,
      UserLastName,
    };

    const resetPasswordResponse = await httpClient.post(`${baseUrl}/client/sendpasswordresetemail`, data, config);
    console.log('resetPasswordResponse', Object.keys(resetPasswordResponse), resetPasswordResponse.data);

    res.status(200).json('Reset password email sent');
  } catch (error) {
    console.log('sendResetPasswordEmail error', error)
    _handleServerErrors(error, res);
  }
}

async function requiredClientFields(req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const appConfig = await _getAppConfig(siteId);
  const config = {
    headers: {
    'Api-Key': appConfig.apiKey,
    'SiteId': siteId,
    'Authorization': token,
    }
  };

  try {
    const requiredFields = await httpClient.get(`${baseUrl}/client/requiredclientfields`, config);
    console.log('requiredFields', Object.keys(requiredFields), requiredFields.data.RequiredClientFields)

    res.status(200).json(requiredFields.data.RequiredClientFields);
  } catch (error) {
    _handleServerErrors(error, res);
  }
}

async function gatewayReturnPage(req: express.Request, res: express.Response) {
  console.log('gatewayReturnPage', req.body);
  const payment_reference = req.body.payment_reference;
  /* const transaction_id = req.body.transaction_id;
  const stcpay_reference_number = req.body.stcpay_reference_number;
  const stcpay_expiration_time = req.body.stcpay_expiration_time;
  const stcpay_result = req.body.stcpay_result; */

  // TODO: Finish this
  // On the fron, we have to set a listener

  const page = `
      <!doctype html>
      <head>
        <title>Time</title>
        <script type="text/javascript">
          parent.postMessage("payment_reference ${payment_reference}" , "http://localhost:4200")
        </script>
      </head>
      <body>
        payment_reference: ${payment_reference}
      </body>
    </html>
  `;

  res.status(200).send(page);
}

// TEST FUNCTIONALITY
// Mindbody calculates the first autopay date based on the IContract.ClientsChargedOn
// Once it is all the rest autopays will be calculated based on it (ie: 2 weeks from it)
// according to the IContract.AutopaySchedule


// TEST FUNCTIONALITY
async function changeClientCreditCard(req: express.Request, res: express.Response) {
  // Change the client's credit card to provoque the selected error (FUND, SECU...)
  const siteId = req.header('siteId');
  const token = req.header('Authorization');
  const newCreditCard = req.body.credit_card;
  const client = req.body.client;
  console.log('changeClientCreditCard', siteId, token, newCreditCard, client);

  try {
    await DDBB
            .doc(`business/${siteId}/clients/${client.UniqueId}`)
            .update({payments_config: newCreditCard});

    res.status(200).json('Client Card Changed');
  } catch(error) {
    _handleServerErrors(error, res);
  }
}

async function triggerBillingCycle (req: express.Request, res: express.Response) {
  const siteId = req.header('siteId');
  const appConfig = await _getAppConfig(siteId);

  try {
    await _processOneAppAutopays(appConfig);

    res.status(200).json('Billing Cycle triggered!')
  } catch(error) {
    _handleServerErrors(error, res);
  }
}


// ROUTES
// ERRORS
server
  .route('/errors')
  .post(handleClientErrors);

// AUTH
server
  .route('/auth')
  .post(login);

// CONFIG
server
  .route('/config/:siteId')
  .get(getConfig)
  // TEST FUNCTIONALITY
  .post(updateConfig)

// CLIENTS
server
  .route('/clients')
  .get(getAllClients)
  .post(addClient);

server
  .route('/clients/:id')
  .patch(updateClient);

server
  .route('/clients/:id/contracts')
  .post(addContract)
  .get(getClientContracts);

server
  .route('/clients/:id/contracts/:contractId')
  .patch(updateContract);

// ORDERS
server
  .route('/orders')
  .get(getOrders);

server
  .route('/orders/:id/refund')
  .post(refundPayment);

// CONTRACTS
server
  .route('/contracts')
  .get(getContracts);

// IFRAME
server
  .route('/validateLogin')
  .post(validateLogin);

server
  .route('/sendResetPasswordEmail')
  .post(sendResetPasswordEmail);

server
  .route('/requiredClientFields')
  .get(requiredClientFields);

server
  .route('/returnUrl')
  .post(gatewayReturnPage);

// TEST ROUTES
server
  .route('/clients/change_card')
  .post(changeClientCreditCard);

server
  .route('/orders/trigger')
  .post(triggerBillingCycle);

// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(server);

/* exports.scheduledFunction = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
  console.log('5 MINUTES: This will be run every 5 minutes!');
}); */


